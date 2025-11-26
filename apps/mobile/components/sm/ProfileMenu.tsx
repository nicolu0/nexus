import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProfileMenuProps {
    onSignOut: () => void;
    isOpen: boolean;
    onToggle: () => void;
}

export function ProfileMenu({ onSignOut, isOpen, onToggle }: ProfileMenuProps) {
    return (
        <View className="absolute right-4 top-2 z-20">
            <TouchableOpacity
                onPress={onToggle}
                className="w-10 h-10 bg-black/60 rounded-full justify-center items-center backdrop-blur-md border border-white/20"
            >
                <Ionicons name="person-circle-outline" size={28} color="white" />
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
