import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Property {
    id: string;
    name: string;
}

interface PropertySelectorProps {
    properties: Property[];
    selectedProperty: Property | null;
    onSelectProperty: (property: Property) => void;
    onOpen?: () => void;
}

export function PropertySelector({
    properties,
    selectedProperty,
    onSelectProperty,
    onOpen,
}: PropertySelectorProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleOpen = () => {
        setIsOpen(!isOpen);
        if (!isOpen && onOpen) {
            onOpen();
        }
    };

    return (
        <View className="relative">
            <TouchableOpacity
                onPress={handleOpen}
                className="flex-row items-center bg-stone-900/80 backdrop-blur-md rounded-full px-4 py-2 border border-white/20"
            >
                <Text className="text-white font-medium mr-1 max-w-[120px]" numberOfLines={1}>
                    {selectedProperty?.name || 'Select Property'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="white" />
            </TouchableOpacity>

            {isOpen && (
                <View className="absolute top-full mt-2 left-0 w-full z-40">
                    <View className="bg-stone-900/80 backdrop-blur-md rounded-xl border border-white/20 py-2 w-full max-h-60">
                        <ScrollView nestedScrollEnabled>
                            {properties.map((prop) => (
                                <TouchableOpacity
                                    key={prop.id}
                                    onPress={() => {
                                        onSelectProperty(prop);
                                        setIsOpen(false);
                                    }}
                                    className="px-4 py-3 border-b border-white/10 last:border-0"
                                >
                                    <Text
                                        numberOfLines={1}
                                        className={`text-base ${selectedProperty?.id === prop.id ? 'font-bold text-white' : 'text-gray-300'}`}
                                    >
                                        {prop.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                            {properties.length === 0 && (
                                <View className="px-4 py-3">
                                    <Text className="text-gray-400 text-center">No properties found</Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            )}
        </View>
    );
}
