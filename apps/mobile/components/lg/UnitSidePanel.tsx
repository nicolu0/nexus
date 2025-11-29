import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    FlatList,
    Image,
    Animated,
    Dimensions,
    StyleSheet,
    Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { RoomFilter } from '../sm/RoomFilter';

// Types duplicated from dashboard.tsx for self-containment
// Ideally these should be in a shared types file
type Tenancy = {
    id: string;
    tenant_name: string;
    lease_start_date: string;
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

type UnitSidePanelProps = {
    visible: boolean;
    onClose: () => void;
    selectedUnitMeta: {
        unit: Unit;
        property: Property;
        tenancy: Tenancy | null;
    } | null;
    selectedUnitGroups: GroupRow[];
    roomFilters: Room[];
    roomFilterId: string | null;
    setRoomFilterId: (id: string | null) => void;
    activeSessionsMap: Record<string, string>;
};

export function UnitSidePanel({
    visible,
    onClose,
    selectedUnitMeta,
    selectedUnitGroups,
    roomFilters,
    roomFilterId,
    setRoomFilterId,
    activeSessionsMap,
}: UnitSidePanelProps) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const screenWidth = Dimensions.get('window').width;
    const slideAnim = useRef(new Animated.Value(screenWidth)).current;

    useEffect(() => {
        if (visible) {
            // Slide in
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease),
            }).start();
        } else {
            // Slide out
            Animated.timing(slideAnim, {
                toValue: screenWidth,
                duration: 150,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease),
            }).start();
        }
    }, [visible, slideAnim, screenWidth]);

    function stageBadges(images: ImageRow[] | null | undefined) {
        const phases = new Set(images?.map((i) => i.session?.phase));
        // Filter out inactive badges
        const badges: { label: string; active: boolean }[] = [
            { label: 'Move-in', active: phases.has('move_in') },
            { label: 'Move-out', active: phases.has('move_out') },
            { label: 'Repair', active: phases.has('repair') },
        ].filter((b) => b.active);

        return badges;
    }

    return (
        <Animated.View
            style={[
                StyleSheet.absoluteFill,
                {
                    transform: [{ translateX: slideAnim }],
                    backgroundColor: 'white',
                    zIndex: 50, // Ensure it sits on top of other dashboard content
                }
            ]}
        >
            <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
                {/* Modal header */}
                <View className="px-4 pt-2 pb-3 border-b border-gray-200 flex-row items-center justify-between">
                    <View className="flex-row items-center">
                        <TouchableOpacity
                            onPress={() => {
                                onClose();
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
                            <RoomFilter
                                rooms={roomFilters}
                                selectedRoomId={roomFilterId}
                                onSelectRoom={setRoomFilterId}
                            />
                        )}

                        {/* Groups grid */}
                        {selectedUnitGroups.length === 0 ? (
                            <View className="flex-1 justify-center items-center px-4">
                                {selectedUnitMeta?.tenancy?.id && activeSessionsMap[selectedUnitMeta.tenancy.id] ? (
                                    <View className="items-center">
                                        <Text className="text-sm text-gray-500 text-center mb-1">
                                            You already started a Session for this unit.
                                        </Text>
                                        <TouchableOpacity onPress={() => {
                                            onClose();
                                            router.push('/(tabs)/sessions');
                                        }}>
                                            <Text className="text-sm font-semibold text-blue-600 text-center">
                                                View Session
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <>
                                        <Text className="text-sm text-gray-500 text-center mb-4">
                                            No groups yet for this tenancy.
                                        </Text>
                                        {selectedUnitMeta?.tenancy?.lease_start_date && (
                                            <TouchableOpacity
                                                onPress={async () => {
                                                    if (!selectedUnitMeta.tenancy) return;

                                                    const phase = selectedUnitMeta.tenancy.lease_start_date < '2025-07-01'
                                                        ? 'move_out'
                                                        : 'move_in';

                                                    onClose();

                                                    try {
                                                        const { data: sessionData, error: sessionError } = await supabase
                                                            .from('sessions')
                                                            .insert({
                                                                tenancy_id: selectedUnitMeta.tenancy.id,
                                                                phase: phase,
                                                                status: 'in_progress',
                                                                created_by: (await supabase.auth.getUser()).data.user?.id
                                                            })
                                                            .select('id')
                                                            .single();

                                                        if (sessionError) throw sessionError;

                                                        router.push({
                                                            pathname: '/(tabs)/camera',
                                                            params: {
                                                                phase,
                                                                unitId: selectedUnitMeta.unit.id,
                                                                sessionId: sessionData.id
                                                            }
                                                        });
                                                    } catch (e) {
                                                        console.error('Error creating session:', e);
                                                        // Fallback navigation without session ID if creation fails
                                                        router.push({
                                                            pathname: '/(tabs)/camera',
                                                            params: { phase, unitId: selectedUnitMeta.unit.id }
                                                        });
                                                    }
                                                }}
                                                className="bg-black px-5 py-3 rounded-full"
                                            >
                                                <Text className="text-white font-semibold">
                                                    {selectedUnitMeta.tenancy.lease_start_date < '2025-07-01'
                                                        ? 'Start move out photos'
                                                        : 'Start move in photos'}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </>
                                )}
                            </View>
                        ) : (
                            <FlatList
                                className="flex-1"
                                contentContainerStyle={{
                                    paddingHorizontal: 8,
                                    paddingTop: 8,
                                    paddingBottom: insets.bottom + 70,
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
        </Animated.View>
    );
}

