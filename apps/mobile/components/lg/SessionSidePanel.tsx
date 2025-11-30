import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, Animated, Dimensions, StyleSheet, Easing, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { RoomFilter } from '../sm/RoomFilter';
import { SessionRow, SessionPhase } from '../../types';
import { ImageDetailModal } from '../md/ImageDetailModal';

type SessionSidePanelProps = {
    selectedSession: SessionRow | null;
    onClose: () => void;
    loadingImages: boolean;
    sessionImages: { id: string; path: string; created_at: string; groups: { id: string; name: string; room_id: string } | null }[];
    sessionRoomFilter: string | null;
    setSessionRoomFilter: (filter: string | null) => void;
    phaseLabel: (phase: SessionPhase) => string;
    unitRooms: { id: string; name: string }[];
    onUpdateImage: (imageId: string, newRoomId: string, newRoomName: string) => Promise<void>;
    onDeleteImage: (imageId: string) => Promise<void>;
    onRefreshSessions?: () => void;
};

export function SessionSidePanel({
    selectedSession,
    onClose,
    loadingImages,
    sessionImages,
    sessionRoomFilter,
    setSessionRoomFilter,
    phaseLabel,
    unitRooms,
    onUpdateImage,
    onDeleteImage,
    onRefreshSessions,
}: SessionSidePanelProps) {
    const insets = useSafeAreaInsets();
    const screenWidth = Dimensions.get('window').width;
    const slideAnim = useRef(new Animated.Value(screenWidth)).current;
    const [selectedImage, setSelectedImage] = useState<{ id: string; path: string; created_at: string; groups: { id: string; name: string; room_id: string } | null } | null>(null);

    useEffect(() => {
        if (selectedSession) {
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
            setSelectedImage(null);
        }
    }, [selectedSession, slideAnim, screenWidth]);

    // Session Room Filter Logic
    const sessionRoomFilters = React.useMemo(() => {
        const rooms = new Set<string>();
        sessionImages.forEach(img => {
            if (img.groups?.name) {
                rooms.add(img.groups.name);
            }
        });
        return Array.from(rooms).sort();
    }, [sessionImages]);

    const filteredSessionImages = React.useMemo(() => {
        if (!sessionRoomFilter) return sessionImages;
        return sessionImages.filter(img => img.groups?.name === sessionRoomFilter);
    }, [sessionImages, sessionRoomFilter]);

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <Animated.View
            style={[
                StyleSheet.absoluteFill,
                {
                    transform: [{ translateX: slideAnim }],
                    backgroundColor: 'white',
                    zIndex: 50, // Ensure it sits on top of other content
                }
            ]}
        >
            <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
                <View className="px-4 pt-2 pb-3 border-b border-stone-200 flex-row items-center justify-between bg-white">
                    <View className="flex-row items-center">
                        <TouchableOpacity onPress={onClose} className="mr-3">
                            <Ionicons name="chevron-back" size={24} color="#111827" />
                        </TouchableOpacity>
                        <View>
                            {selectedSession && (
                                <>
                                    <Text className="text-lg font-semibold text-black">
                                        {phaseLabel(selectedSession.phase)}
                                    </Text>
                                    <Text className="text-xs text-gray-500">
                                        {selectedSession.tenancies?.units?.properties?.name || 'Unknown Property'}
                                        {selectedSession.tenancies?.units?.unit_number
                                            ? ` · Unit ${selectedSession.tenancies.units.unit_number}`
                                            : ''}
                                    </Text>
                                </>
                            )}
                        </View>
                    </View>
                </View>

                {/* Room Filters */}
                {sessionRoomFilters.length > 0 && (
                    <RoomFilter
                        rooms={sessionRoomFilters}
                        selectedRoomId={sessionRoomFilter}
                        onSelectRoom={setSessionRoomFilter}
                    />
                )}

                {loadingImages ? (
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="large" />
                    </View>
                ) : sessionImages.length === 0 ? (
                    <View className="flex-1 justify-center items-center px-8">
                        <Ionicons name="images-outline" size={48} color="#d6d3d1" />
                        <Text className="mt-4 text-stone-500 text-center">
                            No photos in this session yet.
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredSessionImages}
                        keyExtractor={(item) => item.id}
                        numColumns={3}
                        contentContainerStyle={{ padding: 2, paddingBottom: insets.bottom + 70 }}
                        renderItem={({ item }) => {
                            const publicUrl = supabase.storage
                                .from('unit-images')
                                .getPublicUrl(item.path).data.publicUrl;

                            return (
                                <TouchableOpacity 
                                    className="w-1/3 aspect-square p-0.5 relative"
                                    onPress={() => setSelectedImage(item)}
                                >
                                    <Image
                                        source={{ uri: publicUrl }}
                                        className="w-full h-full bg-stone-200"
                                        resizeMode="cover"
                                    />
                                    {item.groups?.name && (
                                        <View className="absolute top-1.5 left-1.5 bg-black/60 px-1.5 py-0.5 rounded">
                                            <Text className="text-[9px] text-white font-medium">
                                                {item.groups.name}
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                    />
                )}
            </View>

            {selectedImage && (
                <ImageDetailModal
                    visible={!!selectedImage}
                    imageUrl={supabase.storage.from('unit-images').getPublicUrl(selectedImage.path).data.publicUrl}
                    roomName={selectedImage.groups?.name || 'Unknown Room'}
                    timestamp={formatTimestamp(selectedImage.created_at)}
                    availableRooms={unitRooms}
                    onClose={() => setSelectedImage(null)}
                    onSave={(newRoomId, newRoomName) => onUpdateImage(selectedImage.id, newRoomId, newRoomName)}
                    onDelete={async () => {
                        await onDeleteImage(selectedImage.id);
                        onRefreshSessions?.();
                    }}
                />
            )}
        </Animated.View>
    );
}


