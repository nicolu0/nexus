import React from 'react';
import { View, Platform, Dimensions } from 'react-native';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { CaptureButton } from '../sm/CaptureButton';
import { RoomSelector } from '../sm/RoomSelector';
import { GhostModeToggle } from '../sm/GhostModeToggle';

interface CameraBottomControlsProps {
    rooms: string[];
    selectedRoom: string;
    onSelectRoom: (room: string) => void;
    onCustomRoom: () => void;
    onCapture: () => void;
    capturing: boolean;
    itemWidth: number;
    tapTargetRef: React.MutableRefObject<string | null>;
    activeSessionPhase?: string;
    ghostMode?: 'overlay' | 'thumbnail';
    onToggleGhostMode?: () => void;
    isSelectedRoomCompleted?: boolean;
}

export function CameraBottomControls({
    rooms,
    selectedRoom,
    onSelectRoom,
    onCustomRoom,
    onCapture,
    capturing,
    itemWidth,
    tapTargetRef,
    activeSessionPhase,
    ghostMode,
    onToggleGhostMode,
    isSelectedRoomCompleted,
}: CameraBottomControlsProps) {
    const isIOS = Platform.OS === 'ios';
    const liquidAvailable = isIOS && isLiquidGlassAvailable();
    const screenHeight = Dimensions.get('window').height;
    const bottomMargin = (liquidAvailable ? 134 : 46) + (screenHeight > 900 ? 4 : 0);

    return (
        <>
            <View className="absolute bottom-0 left-0 right-0 items-center z-20" style={{ marginBottom: bottomMargin }} pointerEvents="box-none">
                <View className="relative flex-row items-center">
                    <CaptureButton 
                        onPress={onCapture} 
                        disabled={capturing} 
                        activeSessionPhase={activeSessionPhase}
                    />
                    {ghostMode && onToggleGhostMode && (
                        <GhostModeToggle 
                            ghostMode={ghostMode}
                            onToggle={onToggleGhostMode}
                        />
                    )}
                </View>
            </View>
            <RoomSelector
                rooms={rooms}
                selectedRoom={selectedRoom}
                onSelectRoom={onSelectRoom}
                onCustomRoom={onCustomRoom}
                itemWidth={itemWidth}
                tapTargetRef={tapTargetRef}
                isSelectedRoomCompleted={isSelectedRoomCompleted}
            />
        </>
    );
}
