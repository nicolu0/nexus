import React from 'react';
import { Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GhostModeToggleProps {
    ghostMode: 'overlay' | 'thumbnail';
    onToggle: () => void;
}

export function GhostModeToggle({ ghostMode, onToggle }: GhostModeToggleProps) {
    const isOn = ghostMode === 'overlay';

    return (
        <View className="absolute left-[100px] flex-row items-center gap-3">
            <Switch
                value={isOn}
                onValueChange={onToggle}
                trackColor={{ false: '#000000', true: '#ffffff' }}
                thumbColor={isOn ? '#000000' : '#ffffff'}
            />
            <Ionicons 
                name={isOn ? 'eye-outline' : 'eye-off-outline'} 
                size={20} 
                color="#ffffff" 
            />
        </View>
    );
}

