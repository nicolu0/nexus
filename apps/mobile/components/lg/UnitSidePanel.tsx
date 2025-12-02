import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Animated, Dimensions, StyleSheet, Easing } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { RoomFilter } from '../sm/RoomFilter';
import { GroupImageModal } from '../md/GroupImageModal';
import { Unit, Property, Tenancy, GroupRow, Room, ImageRow } from '../../types';

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
    completedMoveInMap: Record<string, boolean>;
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
    completedMoveInMap,
}: UnitSidePanelProps) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const screenWidth = Dimensions.get('window').width;
    const slideAnim = useRef(new Animated.Value(screenWidth)).current;
    const [selectedGroup, setSelectedGroup] = useState<GroupRow | null>(null);
    const [groupModalVisible, setGroupModalVisible] = useState(false);

    // Logic to determine if "Start Move-out" button should be shown in header
    const showStartMoveOut = selectedUnitMeta?.tenancy?.id 
        && !activeSessionsMap[selectedUnitMeta.tenancy.id] 
        && completedMoveInMap[selectedUnitMeta.tenancy.id];

    const handleStartMoveOut = async () => {
        if (!selectedUnitMeta?.tenancy) return;
        onClose();
        try {
            const { data: sessionData, error: sessionError } = await supabase
                .from('sessions')
                .insert({
                    tenancy_id: selectedUnitMeta.tenancy.id,
                    phase: 'move_out',
                    status: 'in_progress',
                    created_by: (await supabase.auth.getUser()).data.user?.id
                })
                .select('id')
                .single();

            if (sessionError) throw sessionError;

            router.push({
                pathname: '/(tabs)/camera',
                params: {
                    phase: 'move_out',
                    unitId: selectedUnitMeta.unit.id,
                    sessionId: sessionData.id
                }
            });
        } catch (e) {
            console.error('Error creating move-out session:', e);
            // Fallback
            router.push({
                pathname: '/(tabs)/camera',
                params: { phase: 'move_out', unitId: selectedUnitMeta.unit.id }
            });
        }
    };

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
                    <View className="flex-row items-center flex-1">
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

                    {/* Right side: Start Move-out Button */}
                    {showStartMoveOut && (
                        <TouchableOpacity
                            onPress={handleStartMoveOut}
                            className="bg-black px-3.5 py-2.5 rounded-full"
                        >
                            <Text className="text-white text-sm font-semibold">Start Move-out</Text>
                        </TouchableOpacity>
                    )}
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

                                    // Determine if ANY image in this group belongs to an in-progress session
                                    const isInProgress = item.images?.some(img => img.session?.status === 'in_progress');
                                    
                                    // Check if group has multiple images (move-in and move-out)
                                    const hasMoveIn = item.images?.some(img => img.session?.phase === 'move_in') ?? false;
                                    const hasMoveOut = item.images?.some(img => img.session?.phase === 'move_out') ?? false;
                                    const hasMultipleImages = hasMoveIn && hasMoveOut && (item.images?.length ?? 0) > 1;

                                    const handleGroupPress = () => {
                                        if (hasMultipleImages) {
                                            setSelectedGroup(item);
                                            setGroupModalVisible(true);
                                        }
                                    };

                                    return (
                                        <View className="w-1/2 p-1">
                                            <TouchableOpacity 
                                                onPress={handleGroupPress}
                                                disabled={!hasMultipleImages}
                                                className={`bg-white rounded-xl overflow-visible ${isInProgress 
                                                    ? 'border border-dashed border-stone-300' 
                                                    : 'border border-gray-200'
                                                } ${hasMultipleImages ? 'active:opacity-80' : ''}`}
                                            >
                                                <View className="relative w-full" style={{ height: 112 }}>
                                                    {/* Peeking box for multiple images */}
                                                    {hasMultipleImages && (
                                                        <View 
                                                            className="absolute bg-stone-300 rounded-lg"
                                                            style={{
                                                                top: -4,
                                                                left: 6,
                                                                right: 6,
                                                                height: 96,
                                                                zIndex: 0,
                                                            }}
                                                        />
                                                    )}
                                                    
                                                    {/* Main image */}
                                                    <View 
                                                        className="absolute inset-0 rounded-t-xl overflow-hidden"
                                                        style={{ zIndex: 1 }}
                                                    >
                                                        {publicUrl ? (
                                                            <Image
                                                                source={{ uri: publicUrl }}
                                                                style={{ width: '100%', height: '100%', backgroundColor: '#e7e5e4' }}
                                                                contentFit="cover"
                                                                transition={200}
                                                            />
                                                        ) : (
                                                            <View className="w-full h-full bg-gray-200 justify-center items-center">
                                                                <Ionicons
                                                                    name="image-outline"
                                                                    size={24}
                                                                    color="#9ca3af"
                                                                />
                                                            </View>
                                                        )}
                                                    </View>
                                                </View>
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

            {/* Group Image Modal */}
            {selectedGroup && (
                <GroupImageModal
                    visible={groupModalVisible}
                    images={selectedGroup.images ?? []}
                    groupName={selectedGroup.name}
                    roomName={selectedGroup.room?.name ?? ''}
                    onClose={() => {
                        setGroupModalVisible(false);
                        setSelectedGroup(null);
                    }}
                />
            )}
        </Animated.View>
    );
}

