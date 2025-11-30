import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';
import { TenancyStatus, Unit, Property, Tenancy } from '../../types';

type UnitListProps = {
    selectedProperty: Property | null;
    unitsForSelectedProperty: {
        unit: Unit;
        property: Property;
        tenancy: Tenancy | null;
        status: TenancyStatus;
    }[];
    onSelectUnit: (unitId: string) => void;
    insets: EdgeInsets;
    refreshing: boolean;
    onRefresh: () => void;
};

export function UnitList({
    selectedProperty,
    unitsForSelectedProperty,
    onSelectUnit,
    insets,
    refreshing,
    onRefresh,
}: UnitListProps) {

    function statusChipColor(status: TenancyStatus) {
        switch (status) {
            case 'Upcoming':
                return 'bg-amber-100 text-amber-800';
            case 'Active':
                return 'bg-emerald-100 text-emerald-800';
            case 'Vacated':
                return 'bg-slate-200 text-slate-800';
            default:
                return 'bg-gray-100 text-gray-500';
        }
    }

    return (
        <ScrollView
            className="flex-1 px-4"
            contentContainerStyle={{ paddingBottom: insets.bottom + 70 }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            {!selectedProperty && (
                <View className="mt-10 items-center">
                    <Text className="text-sm text-gray-500 text-center">
                        No property selected. Add a property on web or mobile, then
                        refresh.
                    </Text>
                </View>
            )}

            {selectedProperty && unitsForSelectedProperty.length === 0 && (
                <View className="mt-8 items-center">
                    <Text className="text-sm text-gray-500 text-center">
                        This property has no units yet.
                    </Text>
                </View>
            )}

            {selectedProperty &&
                unitsForSelectedProperty.map(({ unit, tenancy, status }) => (
                    <TouchableOpacity
                        key={unit.id}
                        onPress={() => onSelectUnit(unit.id)}
                        className="mb-3 p-3 rounded-xl bg-white border border-gray-200"
                    >
                        <View className="flex-row justify-between items-center">
                            <View className="flex-1 pr-2">
                                <Text className="text-base font-semibold text-black">
                                    Unit {unit.unit_number}
                                </Text>
                                {tenancy ? (
                                    <Text
                                        numberOfLines={1}
                                        className="text-xs text-gray-500 mt-0.5"
                                    >
                                        {tenancy.tenant_name}
                                    </Text>
                                ) : (
                                    <Text className="text-xs text-gray-400 mt-0.5">
                                        No tenancy
                                    </Text>
                                )}
                            </View>
                            <View
                                className={`px-2 py-1 rounded-full ${statusChipColor(
                                    status
                                )}`}
                            >
                                <Text className="text-[10px] font-semibold">
                                    {status}
                                </Text>
                            </View>
                        </View>

                        {tenancy && (
                            <Text className="mt-1 text-[11px] text-gray-400">
                                Start: {tenancy.lease_start_date}
                                {tenancy.move_out_date
                                    ? ` · Move-out: ${tenancy.move_out_date}`
                                    : ''}
                            </Text>
                        )}
                    </TouchableOpacity>
                ))}
        </ScrollView>
    );
}

