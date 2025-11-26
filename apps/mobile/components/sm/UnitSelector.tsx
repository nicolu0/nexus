import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

    return (
        <View className="relative">
            <TouchableOpacity
                onPress={handleToggle}
                disabled={disabled}
                className={`flex-row items-center bg-stone-900/80 backdrop-blur-md rounded-full px-4 py-2 border border-white/20 ${disabled ? 'opacity-50' : ''}`}
            >
                <Text className="text-white font-medium mr-1 max-w-[80px]" numberOfLines={1}>
                    {selectedUnit?.unit_number || 'Unit'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="white" />
            </TouchableOpacity>

            {isOpen && (
                <View className="absolute top-full mt-2 left-0 w-full z-40">
                    <View className="bg-stone-900/80 backdrop-blur-md rounded-xl border border-white/20 py-2 w-full max-h-60">
                        <ScrollView nestedScrollEnabled>
                            {units.map((unit) => (
                                <TouchableOpacity
                                    key={unit.id}
                                    onPress={() => {
                                        onSelectUnit(unit);
                                        onToggle();
                                    }}
                                    className="px-4 py-3 border-b border-white/10 last:border-0"
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
                </View>
            )}
        </View>
    );
}
