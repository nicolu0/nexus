import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

type ImageDetailModalProps = {
    visible: boolean;
    imageUrl: string;
    roomName: string;
    timestamp: string;
    availableRooms: { id: string; name: string }[];
    onClose: () => void;
    onSave: (newRoomId: string, newRoomName: string) => Promise<void>;
    onDelete: () => Promise<void>;
};

export function ImageDetailModal({
    visible,
    imageUrl,
    roomName,
    timestamp,
    availableRooms,
    onClose,
    onSave,
    onDelete
}: ImageDetailModalProps) {
    const [currentRoom, setCurrentRoom] = useState(roomName);
    const [showDropdown, setShowDropdown] = useState(false);
    const [saving, setSaving] = useState(false);
    // Helper to format the date
    const formatDateTime = (iso: string) => {
        if (!iso) return '';
        
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) return iso;

        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${month}/${day}/${year} ${hours}:${minutes}`;
    };

    const displayTimestamp = React.useMemo(() => {
        const d = new Date(timestamp);
        if (!Number.isNaN(d.getTime()) && timestamp.includes('T')) {
             return formatDateTime(timestamp);
        }

        return timestamp;
    }, [timestamp]);

    const [deleting, setDeleting] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const insets = useSafeAreaInsets();

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
        }).start();
    }, []);

    const handleClose = () => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
        }).start(() => onClose());
    };

    const handleSave = async () => {
        if (currentRoom === roomName) {
            handleClose(); // No changes
            return;
        }

        const selectedRoomObj = availableRooms.find(r => r.name === currentRoom);
        if (selectedRoomObj) {
            setSaving(true);
            try {
                await onSave(selectedRoomObj.id, selectedRoomObj.name);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                handleClose();
            } catch (e) {
                console.error(e);
            } finally {
                setSaving(false);
            }
        } else {
            Alert.alert("Invalid Room", "Please select a valid room from the list.");
        }
    };

    const performDelete = async () => {
        setDeleting(true);
        try {
            await onDelete();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            handleClose();
        } catch (error) {
            console.error("Delete failed:", error);
        } finally {
            setDeleting(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete Image",
            "Are you sure you want to delete this image? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive", 
                    onPress: performDelete
                }
            ]
        );
    };

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                <View className="flex-1 relative">
                    {/* Background Blur and click to close */}
                    <TouchableOpacity 
                        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} 
                        onPress={handleClose}
                        activeOpacity={1}
                    >
                        <BlurView intensity={20} className="flex-1 bg-black/70" />
                    </TouchableOpacity>

                    {/* Main Content */}
                    <SafeAreaView className="flex-1 justify-center items-center" pointerEvents="box-none">
                        {/* Close Button */}
                        <TouchableOpacity 
                            onPress={handleClose}
                            style={{ top: insets.top + 10, right: 16 }}
                            className="absolute z-50 bg-black/40 p-2 rounded-full"
                        >
                            <Ionicons name="close" size={24} color="white" />
                        </TouchableOpacity>

                         <TouchableOpacity activeOpacity={1} onPress={() => {}} className="w-[80%] max-h-[70%] bg-transparent">
                            
                            {/* Image Container */}
                            <View className="relative bg-black rounded-xl overflow-hidden w-full aspect-[3/4] border border-stone-700">
                                <View className="flex-1 w-full h-full items-center justify-center overflow-hidden">
                                    <Image 
                                        source={{ uri: imageUrl }} 
                                        className="w-full h-full" 
                                        resizeMode="cover"
                                    />
                                </View>

                                {/* Top Left Tag (Room) - Editable */}
                                <View className="absolute top-4 left-4 z-20">
                                    <TouchableOpacity 
                                        onPress={() => setShowDropdown(!showDropdown)}
                                        className="bg-black/60 px-3 py-1.5 rounded-full flex-row items-center border border-white/20 backdrop-blur-md"
                                    >
                                        <Text className="text-white font-semibold mr-1 text-sm">{currentRoom || 'Select Room'}</Text>
                                        <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={12} color="white" />
                                    </TouchableOpacity>
                                    
                                    {showDropdown && (
                                        <View className="absolute top-full left-0 mt-2 w-48 bg-black/80 rounded-lg shadow-xl overflow-hidden max-h-60 z-30 backdrop-blur-md border border-white/10">
                                            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true}>
                                                {availableRooms.map(room => (
                                                    <TouchableOpacity 
                                                        key={room.id}
                                                        onPress={() => {
                                                            setCurrentRoom(room.name);
                                                            setShowDropdown(false);
                                                        }}
                                                        className={`px-4 py-3 border-b border-white/10 active:bg-white/10 flex-row justify-between items-center ${currentRoom === room.name ? 'bg-white/20' : ''}`}
                                                    >
                                                        <Text className={`text-sm ${currentRoom === room.name ? 'font-bold text-white' : 'text-white/80'}`}>
                                                            {room.name}
                                                        </Text>
                                                        {currentRoom === room.name && <Ionicons name="checkmark" size={16} color="white" />}
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )}
                                </View>

                                {/* Bottom Right Timestamp */}
                                <View className="absolute bottom-4 right-4 bg-black/60 px-2 py-1 rounded border border-white/10 backdrop-blur-md">
                                    <Text className="text-white/90 text-sm font-mono">
                                        {displayTimestamp}
                                    </Text>
                                </View>
                            </View>

                            {/* Actions */}
                            <View className="flex-row justify-center gap-6 mt-4">
                                <TouchableOpacity 
                                    onPress={handleDelete}
                                    disabled={saving || deleting}
                                    className={`bg-red-500 px-8 py-3 rounded-full shadow-lg flex-row items-center justify-center min-w-[120px] ${deleting ? 'opacity-80' : ''}`}
                                >
                                    {deleting ? <ActivityIndicator color="white" size="small" /> : <Text className="font-semibold text-white text-base">Delete</Text>}
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    onPress={handleSave}
                                    disabled={saving || deleting || currentRoom === roomName}
                                    className={`bg-white px-8 py-3 rounded-full shadow-lg flex-row items-center justify-center min-w-[120px] ${saving || currentRoom === roomName ? 'opacity-40' : ''}`}
                                >
                                    {saving ? <ActivityIndicator color="black" size="small" /> : <Text className="font-semibold text-black text-base">Save</Text>}
                                </TouchableOpacity>
                            </View>

                         </TouchableOpacity>
                    </SafeAreaView>
                </View>
            </Animated.View>
        </Modal>
    );
}

