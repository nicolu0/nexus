import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';

const MOCK_PROPERTIES = [
    { id: 'prop-1', name: '1234 Mission St', city: 'San Francisco', units: 3 },
    { id: 'prop-2', name: '5678 Sunset Blvd', city: 'Los Angeles', units: 5 },
];

export default function Dashboard() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-white p-4">
            <Text className="text-2xl font-bold mb-2">Dashboard</Text>
            <Text className="text-sm text-gray-500 mb-4">
                Select a property to view its units and start move-in documentation.
            </Text>

            <FlatList
                data={MOCK_PROPERTIES}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                <TouchableOpacity
                    onPress={() =>
                    router.push({
                        pathname: '/properties/[propertyId]',
                        params: { propertyId: item.id, propertyName: item.name },
                    })
                    }
                    className="mb-3 p-4 rounded-xl bg-white shadow-sm border border-gray-200"
                >
                    <Text className="font-semibold">{item.name}</Text>
                    <Text className="text-xs text-gray-500">
                    {item.city} · {item.units} units
                    </Text>
                </TouchableOpacity>
                )}
            />
        </View>
    );
}
