import React, { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { PropertySelector } from '../sm/PropertySelector';
import { UnitSelector } from '../sm/UnitSelector';
import { ProfileMenu } from '../sm/ProfileMenu';

interface Property {
    id: string;
    name: string;
}

interface Unit {
    id: string;
    unit_number: string;
}

interface CameraTopControlsProps {
    properties: Property[];
    units: Unit[];
    selectedProperty: Property | null;
    selectedUnit: Unit | null;
    onSelectProperty: (property: Property) => void;
    onSelectUnit: (unit: Unit) => void;
    onSignOut: () => void;
}

export interface CameraTopControlsHandle {
    closeDropdowns: () => void;
}

type OpenMenu = 'property' | 'unit' | 'profile' | null;

export const CameraTopControls = forwardRef<CameraTopControlsHandle, CameraTopControlsProps>(({
    properties,
    units,
    selectedProperty,
    selectedUnit,
    onSelectProperty,
    onSelectUnit,
    onSignOut,
}, ref) => {
    const [openMenu, setOpenMenu] = useState<OpenMenu>(null);

    // Expose closeDropdowns method to parent
    useImperativeHandle(ref, () => ({
        closeDropdowns: () => setOpenMenu(null),
    }));

    // Close any open dropdown when the tab loses focus
    useFocusEffect(
        useCallback(() => {
            return () => {
                setOpenMenu(null);
            };
        }, [])
    );

    return (
        <SafeAreaView className="absolute top-0 left-0 right-0 z-10" pointerEvents="box-none">
            <View className="flex-row justify-between px-4 pt-2" pointerEvents="box-none">
                {/* Selectors Container (Center) */}
                <View className="flex-1 flex-row justify-center items-start gap-2 z-30" pointerEvents="box-none">
                    <PropertySelector
                        properties={properties}
                        selectedProperty={selectedProperty}
                        onSelectProperty={onSelectProperty}
                        isOpen={openMenu === 'property'}
                        onToggle={() => setOpenMenu(openMenu === 'property' ? null : 'property')}
                    />
                    <UnitSelector
                        units={units}
                        selectedUnit={selectedUnit}
                        onSelectUnit={onSelectUnit}
                        disabled={!selectedProperty}
                        isOpen={openMenu === 'unit'}
                        onToggle={() => setOpenMenu(openMenu === 'unit' ? null : 'unit')}
                    />
                </View>

                {/* Profile Menu (Right) */}
                <ProfileMenu
                    onSignOut={onSignOut}
                    isOpen={openMenu === 'profile'}
                    onToggle={() => setOpenMenu(openMenu === 'profile' ? null : 'profile')}
                />
            </View>
        </SafeAreaView>
    );
});
