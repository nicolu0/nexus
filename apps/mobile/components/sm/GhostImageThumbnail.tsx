import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

interface GhostImageThumbnailProps {
    imageUrl: string;
    onPress: () => void;
    top: number;
    left: number;
    width: number;
    height: number;
}

export function GhostImageThumbnail({
    imageUrl,
    onPress,
    top,
    left,
    width,
    height,
}: GhostImageThumbnailProps) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            style={[
                styles.container,
                {
                    top,
                    left,
                    width,
                    height,
                },
            ]}
        >
            <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                contentFit="cover"
            />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        zIndex: 9,
        borderRadius: 8,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 2,
    },
    image: {
        width: '100%',
        height: '100%',
    },
});

