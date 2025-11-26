import { NativeTabs, Icon, Label, VectorIcon } from 'expo-router/unstable-native-tabs';
import { Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function TabLayout() {
    return (
        <NativeTabs>
            <NativeTabs.Trigger name="dashboard">
                <Label>Dashboard</Label>
                {Platform.select({
                    ios: <Icon sf="square.grid.2x2.fill" />,
                    android: <Icon src={<VectorIcon family={Ionicons} name="grid" />} />,
                })}
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="camera">
                <Label>Camera</Label>
                {Platform.select({
                    ios: <Icon sf="camera.fill" />,
                    android: <Icon src={<VectorIcon family={Ionicons} name="camera" />} />,
                })}
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="sessions">
                <Label>Sessions</Label>
                {Platform.select({
                    ios: <Icon sf="photo.stack.fill" />,
                    android: <Icon src={<VectorIcon family={Ionicons} name="images" />} />,
                })}
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
