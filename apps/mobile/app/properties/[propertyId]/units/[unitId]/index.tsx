import { View, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function UnitScreen() {
    const router = useRouter();
    const { propertyId, propertyName, unitId, unitLabel } = useLocalSearchParams<{
        propertyId: string;
        propertyName?: string;
        unitId: string;
        unitLabel?: string;
    }>();

    const displayUnit = unitLabel ?? `Unit ${unitId}`;

    return (
        <View className="flex-1 bg-white p-4">
            <Text className="text-xs text-gray-400 mb-1">
                {propertyName ?? propertyId}
            </Text>
            <Text className="text-xl font-semibold mb-2">{displayUnit}</Text>
            <Text className="text-sm text-gray-500 mb-6">
                Choose an action for this unit.
            </Text>

            {/* For now, just a simple "start move-in" action.
                Later this can be a dropdown or menu. */}
            <TouchableOpacity
                className="mb-3 p-4 rounded-xl bg-blue-600"
                onPress={() =>
                router.push({
                    pathname:
                    '/properties/[propertyId]/units/[unitId]/move-in',
                    params: {
                    propertyId,
                    propertyName,
                    unitId,
                    unitLabel: displayUnit,
                    },
                })
                }
            >
                <Text className="text-white font-semibold text-center">
                Start move-in photos
                </Text>
            </TouchableOpacity>

            {/* Placeholder for future actions */}
            <View className="mt-4">
                <Text className="text-xs text-gray-400">
                Future actions:
                </Text>
                <Text className="text-xs text-gray-500">
                • Start move-out photos
                </Text>
                <Text className="text-xs text-gray-500">
                • View photo history
                </Text>
            </View>
        </View>
    );
}
