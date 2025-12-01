import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

interface ProfileMenuProps {
    onSignOut: () => void;
    isOpen: boolean;
    onToggle: () => void;
}

export function ProfileMenu({ onSignOut, isOpen, onToggle }: ProfileMenuProps) {
    const isIOS = Platform.OS === 'ios';
    const liquidAvailable = isIOS && isLiquidGlassAvailable();

    return (
        <View className="z-20 relative">
            <TouchableOpacity
                onPress={onToggle}
                activeOpacity={0.8}
                className="w-8 h-8 justify-center items-center"
            >
                <GlassView
                    glassEffectStyle="regular"
                    isInteractive
                    tintColor="rgba(20, 20, 20, 0.6)"
                    style={[
                        styles.glassButton,
                        !liquidAvailable && styles.glassFallback,
                    ]}
                >
                    <View className="flex-1 justify-center items-center">
                        <Ionicons name="person" size={16} color="white" />
                    </View>
                </GlassView>
            </TouchableOpacity>

            {isOpen && (
                <View className="absolute top-12 right-0 bg-white rounded-xl shadow-lg py-2 w-32">
                    <TouchableOpacity
                        onPress={() => {
                            onSignOut();
                            onToggle();
                        }}
                        className="px-4 py-2 flex-row items-center"
                    >
                        <Ionicons name="log-out-outline" size={20} color="black" />
                        <Text className="ml-2 text-black font-medium">Sign Out</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    glassButton: {
        width: 32,
        height: 32,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    glassFallback: {
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
});
