import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

interface CameraTopBarProps {
    properties: Property[];
    units: Unit[];
    selectedProperty: Property | null;
    selectedUnit: Unit | null;
    onSelectProperty: (property: Property) => void;
    onSelectUnit: (unit: Unit) => void;
    onSignOut: () => void;
}

export function CameraTopBar({
    properties,
    units,
    selectedProperty,
    selectedUnit,
    onSelectProperty,
    onSelectUnit,
    onSignOut,
}: CameraTopBarProps) {
    return (
        <SafeAreaView className="absolute top-0 left-0 right-0 z-10" pointerEvents="box-none">
            <View className="flex-row justify-between px-4 pt-2" pointerEvents="box-none">
                {/* Selectors Container (Center) */}
                <View className="flex-1 flex-row justify-center items-start gap-2 z-30" pointerEvents="box-none">
                    <PropertySelector
                        properties={properties}
                        selectedProperty={selectedProperty}
                        onSelectProperty={onSelectProperty}
                    />
                    <UnitSelector
                        units={units}
                        selectedUnit={selectedUnit}
                        onSelectUnit={onSelectUnit}
                        disabled={!selectedProperty}
                    />
                </View>

                {/* Profile Menu (Right) */}
                <ProfileMenu onSignOut={onSignOut} />
            </View>
        </SafeAreaView>
    );
}
