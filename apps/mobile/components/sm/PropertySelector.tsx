import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

interface Property {
    id: string;
    name: string;
}

interface PropertySelectorProps {
    properties: Property[];
    selectedProperty: Property | null;
    onSelectProperty: (property: Property) => void;
    isOpen: boolean;
    onToggle: () => void;
}

export function PropertySelector({
    properties,
    selectedProperty,
    onSelectProperty,
    isOpen,
    onToggle,
}: PropertySelectorProps) {
    const isIOS = Platform.OS === 'ios';
    const liquidAvailable = isIOS && isLiquidGlassAvailable();

    return (
        <View className="relative">
            <TouchableOpacity
                onPress={onToggle}
                activeOpacity={0.8}
                className="rounded-full"
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
                        <Text className="text-white font-medium mr-1 max-w-[120px]" numberOfLines={1}>
                            {selectedProperty?.name || 'Select Property'}
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
                                {properties.map((prop, index) => (
                                    <TouchableOpacity
                                        key={prop.id}
                                        onPress={() => {
                                            onSelectProperty(prop);
                                            onToggle();
                                        }}
                                        className={`px-4 py-3 border-white/10 ${index === properties.length - 1 ? '' : 'border-b'}`}
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
                        </GlassView>
                    ) : (
                        <View className="bg-stone-900/80 backdrop-blur-md rounded-xl border border-white/20 py-2 w-full max-h-60">
                            <ScrollView nestedScrollEnabled>
                                {properties.map((prop, index) => (
                                    <TouchableOpacity
                                        key={prop.id}
                                        onPress={() => {
                                            onSelectProperty(prop);
                                            onToggle();
                                        }}
                                        className={`px-4 py-3 border-white/10 ${index === properties.length - 1 ? '' : 'border-b'}`}
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
