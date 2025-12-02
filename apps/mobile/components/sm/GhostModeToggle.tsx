import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GhostModeToggleProps {
    ghostMode: 'overlay' | 'thumbnail';
    onToggle: () => void;
}

export function GhostModeToggle({ ghostMode, onToggle }: GhostModeToggleProps) {
    return (
        <TouchableOpacity 
            onPress={onToggle}
            className="absolute left-[100px] bg-black/60 w-10 h-10 rounded-full justify-center items-center border border-white/20"
        >
            <Ionicons 
                name={ghostMode === 'overlay' ? 'image-outline' : 'layers-outline'} 
                size={20} 
                color="white" 
            />
        </TouchableOpacity>
    );
}

