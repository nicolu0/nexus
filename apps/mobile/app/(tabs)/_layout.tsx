import { Tabs, useSegments } from 'expo-router';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
    const segments = useSegments();
    const currentRoute = segments[segments.length - 1];
    const isCamera = currentRoute === 'camera' || currentRoute === undefined;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: isCamera ? '#171717' : 'white', // neutral-900 vs white
                    borderTopWidth: 1,
                    borderTopColor: isCamera ? '#262626' : '#eeeeee', // neutral-800 vs neutral-200
                    height: 95,
                    paddingBottom: 20,
                    paddingTop: 12,
                },
                tabBarActiveTintColor: isCamera ? 'white' : 'black',
                tabBarInactiveTintColor: isCamera ? 'white' : 'black',
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "grid" : "grid-outline"} size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="camera"
                options={{
                    title: 'Camera',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "camera" : "camera-outline"} size={28} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="sessions"
                options={{
                    title: 'Sessions',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "images" : "images-outline"} size={22} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
