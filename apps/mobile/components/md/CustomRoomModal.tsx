import React from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity } from 'react-native';

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
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View className="flex-1 bg-black/80 justify-center items-center px-6">
                <View className="bg-stone-900 w-full rounded-2xl p-6 border border-white/10">
                    <Text className="text-white text-xl font-bold mb-4">Add Custom Room</Text>
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
            </View>
        </Modal>
    );
}
