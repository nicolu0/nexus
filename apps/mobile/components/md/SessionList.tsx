import React from 'react';
import { View, Text, FlatList, RefreshControl, StyleProp, ViewStyle } from 'react-native';
import { SessionRow } from '../../types';
import { SessionItem } from '../sm/SessionItem';

interface SessionListProps {
    sessions: SessionRow[];
    onSessionPress: (session: SessionRow) => void;
    refreshing: boolean;
    onRefresh: () => void;
    contentContainerStyle?: StyleProp<ViewStyle>;
}

export function SessionList({
    sessions,
    onSessionPress,
    refreshing,
    onRefresh,
    contentContainerStyle
}: SessionListProps) {
    if (sessions.length === 0) {
        return (
            <View className="flex-1 justify-center items-center px-8">
                <Text className="text-sm font-medium text-stone-700 mb-1">
                    No sessions yet
                </Text>
                <Text className="text-xs text-stone-500 text-center">
                    Start taking photos from the camera screen to create your
                    first session. We&apos;ll track each run here.
                </Text>
            </View>
        );
    }

    return (
        <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
                <SessionItem item={item} onPress={onSessionPress} />
            )}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={contentContainerStyle}
        />
    );
}

