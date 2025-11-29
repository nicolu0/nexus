import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import * as Location from 'expo-location';
import { setStatusBarStyle } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';
import { PropertyDropdown } from '../../components/sm/PropertyDropdown';
import { UnitSidePanel } from '../../components/lg/UnitSidePanel';
import { UnitList } from '../../components/md/UnitList';

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
    path: string;
    session?: { phase: string } | null;
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

// Outside component
let hasAutoSelected = false;

export default function DashboardScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [properties, setProperties] = useState<Property[]>([]);
    const [groups, setGroups] = useState<GroupRow[]>([]);
    const [activeSessionsMap, setActiveSessionsMap] = useState<Record<string, string>>({});
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

            if (!hasAutoSelected && !selectedPropertyId && castProps.length > 0) {
                hasAutoSelected = true;
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
                setActiveSessionsMap({});
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
                    path,
                    session:sessions (
                        phase
                    )
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
                // Check if any image in this group belongs to a move_out session
                const hasMoveOut =
                    g.images?.some((img: any) => img.session?.phase === 'move_out') ?? false;
                if (hasMoveOut) moveOutMap[g.tenancy_id] = true;
            });
            setTenancyMoveOutMap(moveOutMap);


            // 5) Fetch active sessions for these tenancies
            const { data: sessionsData } = await supabase
                .from('sessions')
                .select('id, tenancy_id')
                .in('tenancy_id', tenancyIds)
                .eq('status', 'in_progress');

            const sessionsMap: Record<string, string> = {};
            (sessionsData || []).forEach((s) => {
                if (s.tenancy_id) {
                    sessionsMap[s.tenancy_id] = s.id;
                }
            });
            setActiveSessionsMap(sessionsMap);

        } catch (err) {
            console.error('Error loading dashboard:', err);
        } finally {
            setLoading(false);
        }
    }

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await loadDashboard();
        setRefreshing(false);
    }, []);

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
            <SafeAreaView className="flex-1" edges={['top']}>
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
                    <PropertyDropdown
                        selectedProperty={selectedProperty}
                        properties={properties}
                        visible={showPropertyMenu}
                        onToggle={() => setShowPropertyMenu((prev) => !prev)}
                        onSelect={(propertyId: string) => {
                            setSelectedPropertyId(propertyId);
                            setShowPropertyMenu(false);
                            setSelectedUnitId(null);
                            setUnitModalVisible(false);
                        }}
                    />
                </View>

                {/* UNITS LIST FOR SELECTED PROPERTY */}
                <UnitList
                    selectedProperty={selectedProperty}
                    unitsForSelectedProperty={unitsForSelectedProperty}
                    onSelectUnit={(unitId) => {
                        setSelectedUnitId(unitId);
                        setRoomFilterId(null);
                        setUnitModalVisible(true);
                        setShowPropertyMenu(false);
                    }}
                    insets={insets}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                />

                {/* UNIT SIDE PANEL (Replaces Modal) */}
                <UnitSidePanel
                    visible={unitModalVisible}
                    onClose={() => setUnitModalVisible(false)}
                    selectedUnitMeta={selectedUnitMeta}
                    selectedUnitGroups={selectedUnitGroups}
                    roomFilters={roomFilters}
                    roomFilterId={roomFilterId}
                    setRoomFilterId={setRoomFilterId}
                    activeSessionsMap={activeSessionsMap}
                />
            </SafeAreaView>
        </View>
    );
}
