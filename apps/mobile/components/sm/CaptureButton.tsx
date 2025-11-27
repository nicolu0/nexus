import React from 'react';
import { View, TouchableOpacity } from 'react-native';

interface CaptureButtonProps {
    onPress: () => void;
    disabled?: boolean;
}

export function CaptureButton({ onPress, disabled }: CaptureButtonProps) {
    return (
        <View className="absolute bottom-0 left-0 right-0 mb-44 items-center z-20" pointerEvents="box-none">
            <TouchableOpacity
                disabled={disabled}
                onPress={onPress}
                className="w-[80px] h-[80px] rounded-full bg-white/30 justify-center items-center border-2 border-white/10"
            >
                <View className="w-[67px] h-[67px] rounded-full bg-white" />
            </TouchableOpacity>
        </View>
    );
}
