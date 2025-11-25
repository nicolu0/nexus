import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SessionsScreen() {
    return (
        <View className="flex-1 bg-stone-50">
            <SafeAreaView className="flex-1 justify-center items-center">
                <Text className="text-2xl font-bold text-black">Sessions</Text>
            </SafeAreaView>
        </View>
    );
}
