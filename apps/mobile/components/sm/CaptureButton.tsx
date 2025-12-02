import React from 'react';
import { View, TouchableOpacity, Platform, Text, StyleSheet } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

interface CaptureButtonProps {
    onPress: () => void;
    disabled?: boolean;
    activeSessionPhase?: string;
}

export function CaptureButton({ 
    onPress, 
    disabled, 
    activeSessionPhase
}: CaptureButtonProps) {
    const isIOS = Platform.OS === 'ios';
    const liquidAvailable = isIOS && isLiquidGlassAvailable();

    return (
        <>
            {activeSessionPhase && (
                <View className="absolute right-[100px] bg-black/60 px-3 py-1.5 mr-4 rounded-full border border-white/20">
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
                    ? "w-[75px] h-[75px] rounded-full"
                    : "w-[75px] h-[75px] rounded-full justify-center items-center"
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
                    <View className="w-[63px] h-[63px] rounded-full bg-white shadow-sm" />
                </GlassView>
            </TouchableOpacity>
        </>
    );
}


const styles = StyleSheet.create({
    glassButton: {
      width: 75,
      height: 75,
      borderRadius: 37.5,
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