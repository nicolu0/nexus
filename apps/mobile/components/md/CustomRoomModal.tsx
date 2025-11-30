import React from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

interface CustomRoomModalProps {
    visible: boolean;
    roomText: string;
    onChangeText: (text: string) => void;
    onCancel: () => void;
    onSubmit: () => void;
}

export function CustomRoomModal({
    visible,
    roomText,
    onChangeText,
    onCancel,
    onSubmit,
}: CustomRoomModalProps) {
    const isIOS = Platform.OS === 'ios';
    const liquidAvailable = isIOS && isLiquidGlassAvailable();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View className="flex-1 bg-black/80 justify-center items-center px-6 pb-10 z-10">
                {liquidAvailable ? (
                    <GlassView
                        glassEffectStyle="regular"
                        tintColor="rgba(20, 20, 20, 0.5)"
                        style={{
                            width: '100%',
                            borderRadius: 16,
                            overflow: 'hidden',
                            borderWidth: 1,
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                        }}
                    >
                        <View className="p-6">
                            <Text className="text-white text-xl mb-4 font-semibold">Add Custom Room</Text>
                            <TextInput
                                className="bg-white/10 text-white p-4 rounded-xl mb-4 text-lg border border-white/10"
                                placeholder="Room Name"
                                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                                value={roomText}
                                onChangeText={onChangeText}
                                autoFocus
                            />
                            <View className="flex-row gap-4">
                                <TouchableOpacity
                                    onPress={onCancel}
                                    className="flex-1 bg-white/10 p-4 rounded-xl items-center border border-white/10"
                                >
                                    <Text className="text-white font-semibold">Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={onSubmit}
                                    className="flex-1 bg-white p-4 rounded-xl items-center"
                                >
                                    <Text className="text-black font-semibold">Add Room</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </GlassView>
                ) : (
                    <View className="bg-stone-900 w-full rounded-2xl p-6 border border-white/10">
                        <Text className="text-white text-xl mb-4 font-semibold">Add Custom Room</Text>
                        <TextInput
                            className="bg-stone-800 text-white p-4 rounded-xl mb-4 text-lg"
                            placeholder="Room Name"
                            placeholderTextColor="#666"
                            value={roomText}
                            onChangeText={onChangeText}
                            autoFocus
                        />
                        <View className="flex-row gap-4">
                            <TouchableOpacity
                                onPress={onCancel}
                                className="flex-1 bg-stone-800 p-4 rounded-xl items-center"
                            >
                                <Text className="text-white font-semibold">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={onSubmit}
                                className="flex-1 bg-white p-4 rounded-xl items-center"
                            >
                                <Text className="text-black font-semibold">Add Room</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        </Modal>
    );
}
