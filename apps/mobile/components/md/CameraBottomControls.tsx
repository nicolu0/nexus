import React from 'react';
import { CaptureButton } from '../sm/CaptureButton';
import { RoomSelector } from '../sm/RoomSelector';

interface CameraBottomControlsProps {
    rooms: string[];
    selectedRoom: string;
    onSelectRoom: (room: string) => void;
    onCustomRoom: () => void;
    onCapture: () => void;
    capturing: boolean;
    itemWidth: number;
    tapTargetRef: React.MutableRefObject<string | null>;
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
}: CameraBottomControlsProps) {
    return (
        <>
            <CaptureButton onPress={onCapture} disabled={capturing} />
            <RoomSelector
                rooms={rooms}
                selectedRoom={selectedRoom}
                onSelectRoom={onSelectRoom}
                onCustomRoom={onCustomRoom}
                itemWidth={itemWidth}
                tapTargetRef={tapTargetRef}
            />
        </>
    );
}
