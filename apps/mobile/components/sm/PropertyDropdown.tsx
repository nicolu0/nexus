import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Property = {
    id: string;
    name: string;
    address_line1: string | null;
    city: string | null;
    state: string | null;
    latitude: number | null;
    longitude: number | null;
};

type PropertyDropdownProps = {
    selectedProperty: Property | null;
    properties: Property[];
    visible: boolean;
    onToggle: () => void;
    onSelect: (propertyId: string) => void;
};

export function PropertyDropdown({
    selectedProperty,
    properties,
    visible,
    onToggle,
    onSelect,
}: PropertyDropdownProps) {
    return (
        <View className="relative">
            <TouchableOpacity
                onPress={onToggle}
                className="flex-row items-center bg-white rounded-full px-3 py-1.5 border border-gray-200"
            >
                <Text
                    numberOfLines={1}
                    className="text-sm text-gray-800 max-w-[160px] mr-1"
                >
                    {selectedProperty?.name || 'Select property'}
                </Text>
                <Ionicons
                    name={visible ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#4b5563"
                />
            </TouchableOpacity>

            {visible && (
                <View className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl border border-gray-200 z-50">
                    <ScrollView
                        className="max-h-72"
                        showsVerticalScrollIndicator={false}
                    >
                        {properties.map((prop) => (
                            <TouchableOpacity
                                key={prop.id}
                                onPress={() => onSelect(prop.id)}
                                className="px-4 py-3 border-b border-gray-100 last:border-b-0"
                            >
                                <Text
                                    numberOfLines={1}
                                    className={`text-sm ${selectedProperty?.id === prop.id
                                        ? 'font-semibold text-blue-600'
                                        : 'text-gray-800'
                                        }`}
                                >
                                    {prop.name}
                                </Text>
                                {prop.address_line1 && (
                                    <Text
                                        numberOfLines={1}
                                        className="text-[11px] text-gray-500 mt-0.5"
                                    >
                                        {prop.address_line1}
                                        {prop.city ? ` · ${prop.city}` : ''}
                                        {prop.state ? `, ${prop.state}` : ''}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        ))}
                        {properties.length === 0 && (
                            <View className="px-4 py-3">
                                <Text className="text-sm text-gray-500">
                                    No properties yet.
                                </Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            )}
        </View>
    );
}

