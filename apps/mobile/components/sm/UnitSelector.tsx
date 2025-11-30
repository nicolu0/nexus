import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

interface Unit {
    id: string;
    unit_number: string;
}

interface UnitSelectorProps {
    units: Unit[];
    selectedUnit: Unit | null;
    onSelectUnit: (unit: Unit) => void;
    disabled?: boolean;
    isOpen: boolean;
    onToggle: () => void;
}

export function UnitSelector({
    units,
    selectedUnit,
    onSelectUnit,
    disabled,
    isOpen,
    onToggle,
}: UnitSelectorProps) {
    const handleToggle = () => {
        if (!disabled) {
            onToggle();
        }
    };

    const isIOS = Platform.OS === 'ios';
    const liquidAvailable = isIOS && isLiquidGlassAvailable();

    return (
        <View className="relative">
            <TouchableOpacity
                onPress={handleToggle}
                disabled={disabled}
                activeOpacity={0.8}
                className={`rounded-full ${disabled ? 'opacity-50' : ''}`}
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
                    <View className="flex-row items-center px-4 py-2">
                        <Text className="text-white font-medium mr-1 max-w-[80px]" numberOfLines={1}>
                            {selectedUnit?.unit_number || 'Unit'}
                        </Text>
                        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color="white" />
                    </View>
                </GlassView>
            </TouchableOpacity>

            {isOpen && (
                <View className="absolute top-full mt-2 left-0 w-full z-40">
                    {liquidAvailable ? (
                        <GlassView
                            glassEffectStyle="regular"
                            tintColor="rgba(20, 20, 20, 0.6)"
                            style={{
                                borderRadius: 12,
                                overflow: 'hidden',
                                borderWidth: 1,
                                borderColor: 'rgba(255, 255, 255, 0.1)',
                                width: '100%',
                                maxHeight: 240,
                            }}
                        >
                            <ScrollView nestedScrollEnabled>
                                {units.map((unit, index) => (
                                    <TouchableOpacity
                                        key={unit.id}
                                        onPress={() => {
                                            onSelectUnit(unit);
                                            onToggle();
                                        }}
                                        className={`px-4 py-3 border-white/10 ${index === units.length - 1 ? '' : 'border-b'}`}
                                    >
                                        <Text
                                            numberOfLines={1}
                                            className={`text-base ${selectedUnit?.id === unit.id ? 'font-bold text-white' : 'text-gray-300'}`}
                                        >
                                            {unit.unit_number}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                {units.length === 0 && (
                                    <View className="px-4 py-3">
                                        <Text className="text-gray-400 text-center">No units</Text>
                                    </View>
                                )}
                            </ScrollView>
                        </GlassView>
                    ) : (
                        <View className="bg-stone-900/80 backdrop-blur-md rounded-xl border border-white/20 py-2 w-full max-h-60">
                            <ScrollView nestedScrollEnabled>
                                {units.map((unit, index) => (
                                    <TouchableOpacity
                                        key={unit.id}
                                        onPress={() => {
                                            onSelectUnit(unit);
                                            onToggle();
                                        }}
                                        className={`px-4 py-3 border-white/10 ${index === units.length - 1 ? '' : 'border-b'}`}
                                    >
                                        <Text
                                            numberOfLines={1}
                                            className={`text-base ${selectedUnit?.id === unit.id ? 'font-bold text-white' : 'text-gray-300'}`}
                                        >
                                            {unit.unit_number}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                {units.length === 0 && (
                                    <View className="px-4 py-3">
                                        <Text className="text-gray-400 text-center">No units</Text>
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    glassButton: {
        borderRadius: 9999,
    },
    glassFallback: {
        backgroundColor: 'rgba(28, 25, 23, 0.8)', // stone-900/80 equivalent
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
});
