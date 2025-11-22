import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

const MOCK_UNITS_BY_PROPERTY: Record<
    string,
    { id: string; label: string; bedrooms: number; bathrooms: number }[]
> = {
    'prop-1': [
        { id: '3A', label: 'Unit 3A', bedrooms: 2, bathrooms: 1 },
        { id: '2B', label: 'Unit 2B', bedrooms: 1, bathrooms: 1 },
    ],
    'prop-2': [
        { id: '101', label: 'Unit 101', bedrooms: 1, bathrooms: 1 },
        { id: '102', label: 'Unit 102', bedrooms: 2, bathrooms: 2 },
    ],
};

export default function PropertyScreen() {
    const router = useRouter();
    const { propertyId, propertyName } = useLocalSearchParams<{
        propertyId: string;
        propertyName?: string;
    }>();

    const units = MOCK_UNITS_BY_PROPERTY[propertyId] ?? [];

    return (
        <View className="flex-1 bg-white p-4">
            <Text className="text-xs text-gray-400 mb-1">{propertyId}</Text>
            <Text className="text-xl font-semibold mb-2">
                {propertyName ?? 'Property'}
            </Text>
            <Text className="text-sm text-gray-500 mb-4">
                Select a unit to start move-in or move-out documentation.
            </Text>

            <FlatList
                data={units}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                <TouchableOpacity
                    onPress={() =>
                    router.push({
                        pathname: '/properties/[propertyId]/units/[unitId]',
                        params: {
                        propertyId,
                        propertyName,
                        unitId: item.id,
                        unitLabel: item.label,
                        },
                    })
                    }
                    className="mb-3 p-4 rounded-xl bg-white shadow-sm border border-gray-200"
                >
                    <Text className="font-medium">{item.label}</Text>
                    <Text className="text-xs text-gray-500">
                    {item.bedrooms}bd · {item.bathrooms}ba
                    </Text>
                </TouchableOpacity>
                )}
            />
        </View>
    );
}
