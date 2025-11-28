import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import * as Location from 'expo-location';
import { setStatusBarStyle } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';

type Tenancy = {
    id: string;
    tenant_name: string;
    lease_start_date: string; // 'YYYY-MM-DD'
    move_out_date: string | null;
};

type Unit = {
    id: string;
    unit_number: string;
    tenancies: Tenancy[] | null;
};

type Property = {
    id: string;
    name: string;
    address_line1: string | null;
    city: string | null;
    state: string | null;
    latitude: number | null;
    longitude: number | null;
    units: Unit[] | null;
};

type Room = {
    id: string;
    name: string;
};

type ImageRow = {
    id: string;
    phase: 'move_in' | 'move_out' | 'repair';
    path: string;
};

type GroupRow = {
    id: string;
    name: string;
    tenancy_id: string | null;
    description: string | null;
    room: Room | null;
    images: ImageRow[] | null;
};

type TenancyStatus = 'Upcoming' | 'Active' | 'Vacated' | 'No tenancy';

function todayDateString(): string {
    // 'YYYY-MM-DD'
    return new Date().toISOString().slice(0, 10);
}

function pickRelevantTenancy(tenancies: Tenancy[] | null): Tenancy | null {
    if (!tenancies || tenancies.length === 0) return null;

    const today = todayDateString();
    const sorted = [...tenancies].sort((a, b) =>
        a.lease_start_date.localeCompare(b.lease_start_date)
    );

    // 1) Current tenancy: start <= today && (move_out is null or today <= move_out)
    const current = sorted.find((t) => {
        const start = t.lease_start_date;
        const end = t.move_out_date;
        if (today < start) return false;
        if (end && today > end) return false;
        return true;
    });
    if (current) return current;

    // 2) Most recent past tenancy
    const past = sorted
        .filter((t) => t.lease_start_date <= today)
        .sort((a, b) => b.lease_start_date.localeCompare(a.lease_start_date))[0];
    if (past) return past;

    // 3) Otherwise earliest future
    return sorted[0];
}

function computeTenancyStatus(
    tenancy: Tenancy | null,
    hasMoveOutPhotos: boolean
): TenancyStatus {
    if (!tenancy) return 'No tenancy';

    const today = todayDateString();
    const start = tenancy.lease_start_date;
    const end = tenancy.move_out_date;

    if (hasMoveOutPhotos || (end && today > end)) {
        return 'Vacated';
    }

    if (today < start) {
        return 'Upcoming';
    }

    // start <= today && (end is null or today <= end)
    return 'Active';
}

export default function DashboardScreen() {
    const [loading, setLoading] = useState(true);
    const [properties, setProperties] = useState<Property[]>([]);
    const [groups, setGroups] = useState<GroupRow[]>([]);
    const [tenancyMoveOutMap, setTenancyMoveOutMap] = useState<
        Record<string, boolean>
    >({});

    const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
        null
    );
    const [showPropertyMenu, setShowPropertyMenu] = useState(false);

    const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
    const [roomFilterId, setRoomFilterId] = useState<string | null>(null);
    const [unitModalVisible, setUnitModalVisible] = useState(false);

    const insets = useSafeAreaInsets();

    useFocusEffect(
        React.useCallback(() => {
            setStatusBarStyle('dark');
            loadDashboard();

            return () => {
                setShowPropertyMenu(false);
            };
        }, [])
    );

    const loadDashboard = async () => {
        try {
            // Don't set loading to true here if we want background refresh
            // or manage a separate refreshing state if using pull-to-refresh
            
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();
            if (userError) throw userError;
            if (!user) {
                setProperties([]);
                setGroups([]);
                setLoading(false);
                return;
            }

            // 1) Properties → units → tenancies
            const { data: propsData, error: propsError } = await supabase
                .from('properties')
                .select(`
        id,
        name,
        address_line1,
        city,
        state,
        latitude,
        longitude,
        units:units (
          id,
          unit_number,
          tenancies:tenancies (
            id,
            tenant_name,
            lease_start_date,
            move_out_date
          )
        )
      `)
                .eq('owner_id', user.id)
                .order('name', { ascending: true });

            if (propsError) throw propsError;

            const castProps = (propsData ?? []) as any as Property[];
            setProperties(castProps);

            if (!selectedPropertyId && castProps.length > 0) {
                // Default to first, but try to find closest
                let bestId = castProps[0].id;

                try {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status === 'granted') {
                        const loc = await Location.getCurrentPositionAsync({});
                        const { latitude, longitude } = loc.coords;

                        let minDist = Infinity;

                        castProps.forEach(p => {
                            if (p.latitude && p.longitude) {
                                const dist = getDistanceFromLatLonInKm(latitude, longitude, p.latitude, p.longitude);
                                if (dist < minDist) {
                                    minDist = dist;
                                    bestId = p.id;
                                }
                            }
                        });
                    }
                } catch (e) {
                    console.log('Location error in dashboard, using default property', e);
                }

                setSelectedPropertyId(bestId);
            }

            // 2) Collect tenancy IDs
            const tenancyIds: string[] = [];
            castProps.forEach((p) =>
                (p.units ?? []).forEach((u) =>
                    (u.tenancies ?? []).forEach((t) => tenancyIds.push(t.id))
                )
            );

            if (tenancyIds.length === 0) {
                setGroups([]);
                setTenancyMoveOutMap({});
                setLoading(false);
                return;
            }

            // 3) Fetch groups + images + room
            const { data: groupData, error: groupsError } = await supabase
                .from('groups')
                .select(`
        id,
        name,
        tenancy_id,
        description,
        room:rooms (
          id,
          name
        ),
        images (
          id,
          phase,
          path
        )
      `)
                .in('tenancy_id', tenancyIds);

            if (groupsError) throw groupsError;

            const castGroups = (groupData ?? []) as any as GroupRow[];
            setGroups(castGroups);

            // 4) Build tenancy -> hasMoveOutPhoto map
            const moveOutMap: Record<string, boolean> = {};
            castGroups.forEach((g) => {
                if (!g.tenancy_id) return;
                const hasMoveOut =
                    g.images?.some((img) => img.phase === 'move_out') ?? false;
                if (hasMoveOut) moveOutMap[g.tenancy_id] = true;
            });
            setTenancyMoveOutMap(moveOutMap);
        } catch (err) {
            console.error('Error loading dashboard:', err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadDashboard();
    }, []);

    // Flatten units with property + tenancy + status
    const allUnits = useMemo(
        () => {
            const result: {
                unit: Unit;
                property: Property;
                tenancy: Tenancy | null;
                status: TenancyStatus;
            }[] = [];

            properties.forEach((prop) => {
                (prop.units ?? []).forEach((unit) => {
                    const tenancy = pickRelevantTenancy(unit.tenancies ?? []);
                    const hasMoveOut = tenancy
                        ? tenancyMoveOutMap[tenancy.id] === true
                        : false;
                    const status = computeTenancyStatus(tenancy, hasMoveOut);

                    result.push({ unit, property: prop, tenancy, status });
                });
            });

            return result;
        },
        [properties, tenancyMoveOutMap]
    );

    const selectedProperty = useMemo(
        () =>
            selectedPropertyId
                ? properties.find((p) => p.id === selectedPropertyId) ?? null
                : null,
        [selectedPropertyId, properties]
    );

    const unitsForSelectedProperty = useMemo(
        () =>
            selectedProperty
                ? allUnits.filter((u) => u.property.id === selectedProperty.id)
                : [],
        [selectedProperty, allUnits]
    );

    const selectedUnitMeta = useMemo(
        () =>
            selectedUnitId
                ? allUnits.find((u) => u.unit.id === selectedUnitId) ?? null
                : null,
        [selectedUnitId, allUnits]
    );

    // Groups for the selected unit's tenancy
    const selectedUnitGroups = useMemo(() => {
        if (!selectedUnitMeta || !selectedUnitMeta.tenancy) return [];
        const tenancyId = selectedUnitMeta.tenancy.id;
        let tenantGroups = groups.filter((g) => g.tenancy_id === tenancyId);

        if (roomFilterId) {
            tenantGroups = tenantGroups.filter(
                (g) => g.room && g.room.id === roomFilterId
            );
        }

        return tenantGroups;
    }, [selectedUnitMeta, groups, roomFilterId]);

    // Room filter options
    const roomFilters = useMemo(() => {
        if (!selectedUnitMeta || !selectedUnitMeta.tenancy) return [];
        const tenancyId = selectedUnitMeta.tenancy.id;
        const tenantGroups = groups.filter((g) => g.tenancy_id === tenancyId);
        const map = new Map<string, Room>();

        tenantGroups.forEach((g) => {
            if (g.room) map.set(g.room.id, g.room);
        });

        return Array.from(map.values());
    }, [selectedUnitMeta, groups]);

    function statusChipColor(status: TenancyStatus) {
        switch (status) {
            case 'Upcoming':
                return 'bg-amber-100 text-amber-800';
            case 'Active':
                return 'bg-emerald-100 text-emerald-800';
            case 'Vacated':
                return 'bg-slate-200 text-slate-800';
            default:
                return 'bg-gray-100 text-gray-500';
        }
    }

    function stageBadges(images: ImageRow[] | null | undefined) {
        const phases = new Set(images?.map((i) => i.phase));
        // Filter out inactive badges
        const badges: { label: string; active: boolean }[] = [
            { label: 'Move-in', active: phases.has('move_in') },
            { label: 'Move-out', active: phases.has('move_out') },
            { label: 'Repair', active: phases.has('repair') },
        ].filter((b) => b.active);
        
        return badges;
    }

    function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
        var R = 6371; // Radius of the earth in km
        var dLat = deg2rad(lat2 - lat1);
        var dLon = deg2rad(lon2 - lon1);
        var a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
            ;
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c; // Distance in km
        return d;
    }

    function deg2rad(deg: number) {
        return deg * (Math.PI / 180);
    }

    if (loading) {
        return (
            <View className="flex-1 bg-stone-50 justify-center items-center">
                <ActivityIndicator size="large" />
                <Text className="mt-3 text-gray-600">Loading dashboard…</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-stone-50">
            <SafeAreaView className="flex-1">
                {/* HEADER */}
                <View className="px-4 pt-2 pb-3 flex-row items-center justify-between">
                    <View>
                        <Text className="text-xs text-gray-500 uppercase tracking-wide">
                            Dashboard
                        </Text>
                        <Text className="text-2xl font-semibold text-black">
                            Properties & Units
                        </Text>
                    </View>

                    {/* Property dropdown (top-right) */}
                    <View className="relative">
                        <TouchableOpacity
                            onPress={() => setShowPropertyMenu((prev) => !prev)}
                            className="flex-row items-center bg-white rounded-full px-3 py-1.5 border border-gray-200"
                        >
                            <Text
                                numberOfLines={1}
                                className="text-sm text-gray-800 max-w-[160px] mr-1"
                            >
                                {selectedProperty?.name || 'Select property'}
                            </Text>
                            <Ionicons
                                name={showPropertyMenu ? 'chevron-up' : 'chevron-down'}
                                size={16}
                                color="#4b5563"
                            />
                        </TouchableOpacity>

                        {showPropertyMenu && (
                            <View className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl border border-gray-200 z-50">
                                <ScrollView
                                    className="max-h-72"
                                    showsVerticalScrollIndicator={false}
                                >
                                    {properties.map((prop) => (
                                        <TouchableOpacity
                                            key={prop.id}
                                            onPress={() => {
                                                setSelectedPropertyId(prop.id);
                                                setShowPropertyMenu(false);
                                                setSelectedUnitId(null);
                                                setUnitModalVisible(false);
                                            }}
                                            className="px-4 py-3 border-b border-gray-100 last:border-b-0"
                                        >
                                            <Text
                                                numberOfLines={1}
                                                className={`text-sm ${selectedPropertyId === prop.id
                                                    ? 'font-semibold text-blue-600'
                                                    : 'text-gray-800'
                                                    }`}
                                            >
                                                {prop.name}
                                            </Text>
                                            {prop.address_line1 && (
                                                <Text
                                                    numberOfLines={1}
                                                    className="text-[11px] text-gray-500 mt-0.5"
                                                >
                                                    {prop.address_line1}
                                                    {prop.city ? ` · ${prop.city}` : ''}
                                                    {prop.state ? `, ${prop.state}` : ''}
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                    {properties.length === 0 && (
                                        <View className="px-4 py-3">
                                            <Text className="text-sm text-gray-500">
                                                No properties yet.
                                            </Text>
                                        </View>
                                    )}
                                </ScrollView>
                            </View>
                        )}
                    </View>
                </View>

                {/* UNITS LIST FOR SELECTED PROPERTY */}
                <ScrollView
                    className="flex-1 px-4"
                    contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
                >
                    {!selectedProperty && (
                        <View className="mt-10 items-center">
                            <Text className="text-sm text-gray-500 text-center">
                                No property selected. Add a property on web or mobile, then
                                refresh.
                            </Text>
                        </View>
                    )}

                    {selectedProperty && unitsForSelectedProperty.length === 0 && (
                        <View className="mt-8 items-center">
                            <Text className="text-sm text-gray-500 text-center">
                                This property has no units yet.
                            </Text>
                        </View>
                    )}

                    {selectedProperty &&
                        unitsForSelectedProperty.map(({ unit, tenancy, status }) => (
                            <TouchableOpacity
                                key={unit.id}
                                onPress={() => {
                                    setSelectedUnitId(unit.id);
                                    setRoomFilterId(null);
                                    setUnitModalVisible(true);
                                    setShowPropertyMenu(false);
                                }}
                                className="mb-3 p-3 rounded-xl bg-white border border-gray-200"
                            >
                                <View className="flex-row justify-between items-center">
                                    <View className="flex-1 pr-2">
                                        <Text className="text-base font-semibold text-black">
                                            Unit {unit.unit_number}
                                        </Text>
                                        {tenancy ? (
                                            <Text
                                                numberOfLines={1}
                                                className="text-xs text-gray-500 mt-0.5"
                                            >
                                                {tenancy.tenant_name}
                                            </Text>
                                        ) : (
                                            <Text className="text-xs text-gray-400 mt-0.5">
                                                No tenancy
                                            </Text>
                                        )}
                                    </View>
                                    <View
                                        className={`px-2 py-1 rounded-full ${statusChipColor(
                                            status
                                        )}`}
                                    >
                                        <Text className="text-[10px] font-semibold">
                                            {status}
                                        </Text>
                                    </View>
                                </View>

                                {tenancy && (
                                    <Text className="mt-1 text-[11px] text-gray-400">
                                        Start: {tenancy.lease_start_date}
                                        {tenancy.move_out_date
                                            ? ` · Move-out: ${tenancy.move_out_date}`
                                            : ''}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        ))}
                </ScrollView>

                {/* UNIT SIDE MODAL */}
                <Modal
                    visible={unitModalVisible}
                    animationType="slide"
                    presentationStyle="fullScreen"
                >
                    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
                        {/* Modal header */}
                        <View className="px-4 pt-2 pb-3 border-b border-gray-200 flex-row items-center justify-between">
                            <View className="flex-row items-center">
                                <TouchableOpacity
                                    onPress={() => {
                                        setUnitModalVisible(false);
                                        setRoomFilterId(null);
                                    }}
                                    className="mr-3"
                                >
                                    <Ionicons name="chevron-back" size={24} color="#111827" />
                                </TouchableOpacity>
                                <View>
                                    {selectedUnitMeta && (
                                        <>
                                            <Text className="text-xs text-gray-500">
                                                {selectedUnitMeta.property.name}
                                            </Text>
                                            <Text className="text-lg font-semibold text-black">
                                                Unit {selectedUnitMeta.unit.unit_number}
                                            </Text>
                                            {selectedUnitMeta.tenancy && (
                                                <Text className="text-xs text-gray-500">
                                                    {selectedUnitMeta.tenancy.tenant_name}
                                                </Text>
                                            )}
                                        </>
                                    )}
                                </View>
                            </View>
                        </View>

                        {/* Room filter + groups */}
                        {selectedUnitMeta ? (
                            <>
                                {/* Room filters */}
                                {roomFilters.length > 0 && (
                                    <View>
                                        <ScrollView
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            className="px-4 py-2 border-b border-gray-100 grow-0"
                                        >
                                            <TouchableOpacity
                                                onPress={() => setRoomFilterId(null)}
                                                className={`px-3 py-1 rounded-full mr-2 border ${roomFilterId === null
                                                    ? 'bg-blue-600 border-blue-600'
                                                    : 'bg-white border-gray-200'
                                                    }`}
                                            >
                                                <Text
                                                    className={`text-xs ${roomFilterId === null
                                                        ? 'text-white'
                                                        : 'text-gray-700'
                                                        }`}
                                                >
                                                    All rooms
                                                </Text>
                                            </TouchableOpacity>

                                            {roomFilters.map((room) => (
                                                <TouchableOpacity
                                                    key={room.id}
                                                    onPress={() =>
                                                        setRoomFilterId((prev) =>
                                                            prev === room.id ? null : room.id
                                                        )
                                                    }
                                                    className={`px-3 py-1 rounded-full mr-2 border ${roomFilterId === room.id
                                                        ? 'bg-blue-600 border-blue-600'
                                                        : 'bg-white border-gray-200'
                                                        }`}
                                                >
                                                    <Text
                                                        className={`text-xs ${roomFilterId === room.id
                                                            ? 'text-white'
                                                            : 'text-gray-700'
                                                            }`}
                                                    >
                                                        {room.name}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}

                                {/* Groups grid */}
                                {selectedUnitGroups.length === 0 ? (
                                    <View className="flex-1 justify-center items-center px-4">
                                        <Text className="text-sm text-gray-500 text-center">
                                            No groups yet for this tenancy. Start capturing photos
                                            in the Camera tab.
                                        </Text>
                                    </View>
                                ) : (
                                    <FlatList
                                        className="flex-1"
                                        contentContainerStyle={{
                                            paddingHorizontal: 8,
                                            paddingTop: 8,
                                            paddingBottom: 24,
                                        }}
                                        data={selectedUnitGroups}
                                        keyExtractor={(g) => g.id}
                                        numColumns={2}
                                        renderItem={({ item }) => {
                                            const cover = item.images?.[0] ?? null;
                                            const publicUrl =
                                                cover
                                                    ? supabase.storage
                                                        .from('unit-images')
                                                        .getPublicUrl(cover.path).data.publicUrl
                                                    : null;
                                            const badges = stageBadges(item.images);

                                            return (
                                                <View className="w-1/2 p-1">
                                                    <TouchableOpacity className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                                        {publicUrl ? (
                                                            <Image
                                                                source={{ uri: publicUrl }}
                                                                className="w-full h-28"
                                                                resizeMode="cover"
                                                            />
                                                        ) : (
                                                            <View className="w-full h-28 bg-gray-200 justify-center items-center">
                                                                <Ionicons
                                                                    name="image-outline"
                                                                    size={24}
                                                                    color="#9ca3af"
                                                                />
                                                            </View>
                                                        )}
                                                        <View className="p-2">
                                                            <Text
                                                                numberOfLines={1}
                                                                className="text-xs font-semibold text-black"
                                                            >
                                                                {item.name}
                                                            </Text>
                                                            {item.room && (
                                                                <Text
                                                                    numberOfLines={1}
                                                                    className="text-[10px] text-gray-500 mt-0.5"
                                                                >
                                                                    {item.room.name}
                                                                </Text>
                                                            )}
                                                            <View className="flex-row flex-wrap mt-1">
                                                                {badges.map((b) => (
                                                                    <View
                                                                        key={b.label}
                                                                        className="px-1.5 py-0.5 mr-1 mb-1 rounded-full border bg-gray-50 border-gray-200"
                                                                    >
                                                                        <Text className="text-[9px] text-gray-500">
                                                                            {b.label}
                                                                        </Text>
                                                                    </View>
                                                                ))}
                                                            </View>
                                                        </View>
                                                    </TouchableOpacity>
                                                </View>
                                            );
                                        }}
                                    />
                                )}
                            </>
                        ) : (
                            <View className="flex-1 justify-center items-center px-4">
                                <Text className="text-sm text-gray-500 text-center">
                                    No unit selected.
                                </Text>
                            </View>
                        )}
                    </View>
                </Modal>
            </SafeAreaView>
        </View>
    );
}
