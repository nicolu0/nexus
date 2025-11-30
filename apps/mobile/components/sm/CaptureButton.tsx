import React from 'react';
import { View, TouchableOpacity, Platform, Text } from 'react-native';
import { GlassView } from 'expo-glass-effect';

interface CaptureButtonProps {
    onPress: () => void;
    disabled?: boolean;
    activeSessionPhase?: string;
}

export function CaptureButton({ onPress, disabled, activeSessionPhase }: CaptureButtonProps) {
    const isIOS = Platform.OS === 'ios';

    return (
        <View className="absolute bottom-0 left-0 right-0 mb-36 items-center z-20" pointerEvents="box-none">
            <View className="relative flex-row items-center">
                {/* Phase Tag - Positioned to the left of the button */}
                {activeSessionPhase && (
                    <View className="absolute right-[100px] bg-black/60 px-3 py-1.5 rounded-full border border-white/20">
                        <Text className="text-white text-xs font-medium capitalize whitespace-nowrap">
                            {activeSessionPhase.replace('_', ' ')}
                        </Text>
                    </View>
                )}

                <TouchableOpacity
                    disabled={disabled}
                    onPress={onPress}
                    activeOpacity={0.7}
                    className={isIOS
                        ? "w-[80px] h-[80px] rounded-full overflow-hidden"
                        : "w-[80px] h-[80px] rounded-full justify-center items-center"
                    }
                >
                    {isIOS ? (
                        <GlassView style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>
                            <View className="w-[67px] h-[67px] rounded-full bg-white/90 shadow-sm" />
                        </GlassView>
                    ) : (
                        <View className="w-[80px] h-[80px] rounded-full bg-white/30 justify-center items-center border-2 border-white/10">
                            <View className="w-[67px] h-[67px] rounded-full bg-white" />
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}
