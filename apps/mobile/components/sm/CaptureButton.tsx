import React from 'react';
import { View, TouchableOpacity, Platform, Text, StyleSheet } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

interface CaptureButtonProps {
    onPress: () => void;
    disabled?: boolean;
    activeSessionPhase?: string;
}

export function CaptureButton({ onPress, disabled, activeSessionPhase }: CaptureButtonProps) {
    const isIOS = Platform.OS === 'ios';
    const liquidAvailable = isIOS && isLiquidGlassAvailable();

    return (
        <View className={`absolute bottom-0 left-0 right-0 items-center z-20 ${liquidAvailable ? 'mb-36' : 'mb-14'}`} pointerEvents="box-none">
            <View className="relative flex-row items-center">
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
                    className={isIOS && isLiquidGlassAvailable()
                        ? "w-[80px] h-[80px] rounded-full overflow-hidden"
                        : "w-[80px] h-[80px] rounded-full justify-center items-center"
                    }
                >
                    <GlassView
                        glassEffectStyle='regular'
                        isInteractive
                        tintColor='rgba(255, 255, 255, 0.2)'
                        style={[
                            styles.glassButton,
                            !liquidAvailable && styles.glassFallback,
                        ]}
                    >
                        <View className="w-[67px] h-[67px] rounded-full bg-white shadow-sm" />
                    </GlassView>
                </TouchableOpacity>
            </View>
        </View>
    );
}


const styles = StyleSheet.create({
    glassButton: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    glassFallback: {
      // what it looks like on Android / older iOS
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.15)',
    },
});