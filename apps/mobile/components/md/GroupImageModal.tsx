import React, { useState, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Animated, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { ImageRow } from '../../types';

type GroupImageModalProps = {
    visible: boolean;
    images: ImageRow[];
    groupName: string;
    roomName: string;
    onClose: () => void;
};

export function GroupImageModal({
    visible,
    images,
    groupName,
    roomName,
    onClose,
}: GroupImageModalProps) {
    const insets = useSafeAreaInsets();
    const screenHeight = Dimensions.get('window').height;
    const screenWidth = Dimensions.get('window').width;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef<ScrollView>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Sort images: move_in first, then move_out
    const sortedImages = React.useMemo(() => {
        const moveIn = images.find(img => img.session?.phase === 'move_in');
        const moveOut = images.find(img => img.session?.phase === 'move_out');
        const result: ImageRow[] = [];
        if (moveIn) result.push(moveIn);
        if (moveOut) result.push(moveOut);
        // Add any other images that don't match the above
        images.forEach(img => {
            if (img !== moveIn && img !== moveOut) {
                result.push(img);
            }
        });
        return result;
    }, [images]);

    // Format timestamp helper
    const formatDateTime = (iso: string) => {
        if (!iso) return '';
        
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) return iso;

        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${month}/${day}/${year} ${hours}:${minutes}`;
    };

    React.useEffect(() => {
        if (visible) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }).start();
            setCurrentIndex(0);
            // Reset scroll position to center the first image
            scrollViewRef.current?.scrollTo({ x: 0, animated: false });
        }
    }, [visible]);

    const handleClose = () => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
        }).start(() => onClose());
    };

    // Calculate available modal height
    const availableHeight = screenHeight * 0.45;
    const modalHeight = availableHeight;
    
    const itemHeight = modalHeight;
    const itemWidth = (itemHeight * 3) / 4;
    
    const peekWidth = 25;
    const itemSpacing = peekWidth;
    const snapInterval = itemWidth + itemSpacing;
    
    // Calculate padding to center the first image horizontally
    const centerPadding = (screenWidth - itemWidth) / 2;

    const handleScroll = (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        // Account for the center padding
        const adjustedOffset = offsetX - centerPadding;
        const index = Math.round(adjustedOffset / snapInterval);
        setCurrentIndex(Math.min(Math.max(0, index), sortedImages.length - 1));
    };

    if (!visible || sortedImages.length === 0) return null;


    return (
        <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                <View className="flex-1 relative">
                    {/* Background Blur */}
                    <TouchableOpacity 
                        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} 
                        onPress={handleClose}
                        activeOpacity={1}
                    >
                        <BlurView intensity={20} className="flex-1 bg-black/70" />
                    </TouchableOpacity>

                    {/* Main Content */}
                    <SafeAreaView className="flex-1 justify-center items-center" pointerEvents="box-none">
                        {/* Close Button */}
                        <TouchableOpacity 
                            onPress={handleClose}
                            style={{ top: insets.top + 10, right: 16, zIndex: 50 }}
                            className="absolute bg-black/40 p-2 rounded-full"
                        >
                            <Ionicons name="close" size={24} color="white" />
                        </TouchableOpacity>

                        <View className="w-full bg-transparent" style={{ height: modalHeight }} pointerEvents="box-none">
                            {/* Scrollable Images */}
                            <ScrollView
                                ref={scrollViewRef}
                                horizontal
                                pagingEnabled={false}
                                showsHorizontalScrollIndicator={false}
                                showsVerticalScrollIndicator={false}
                                scrollEnabled={true}
                                directionalLockEnabled={true}
                                onScroll={handleScroll}
                                scrollEventThrottle={16}
                                snapToInterval={snapInterval}
                                decelerationRate="fast"
                                contentContainerStyle={{
                                    paddingLeft: centerPadding,
                                    paddingRight: centerPadding,
                                }}
                                style={{ flex: 1 }}
                            >
                                {sortedImages.map((image, index) => {
                                    const url = supabase.storage
                                        .from('unit-images')
                                        .getPublicUrl(image.path).data.publicUrl;
                                    const phase = image.session?.phase === 'move_in' ? 'Move-in' : 
                                                 image.session?.phase === 'move_out' ? 'Move-out' : 
                                                 'Photo';
                                    const imageTimestamp = image.created_at 
                                        ? formatDateTime(image.created_at) 
                                        : '';

                                    return (
                                        <View
                                            key={image.id}
                                            style={{
                                                height: itemHeight,
                                                width: itemWidth,
                                                marginRight: index < sortedImages.length - 1 ? itemSpacing : 0,
                                            }}
                                            className="justify-center items-center"
                                        >
                                            {/* Image Container */}
                                            <View className="relative bg-black rounded-xl overflow-hidden border border-stone-700" style={{ width: itemWidth, height: itemHeight }}>
                                                <View className="flex-1 w-full h-full items-center justify-center overflow-hidden">
                                                    <Image 
                                                        source={{ uri: url }} 
                                                        style={{ width: '100%', height: '100%' }}
                                                        contentFit="cover"
                                                    />
                                                </View>

                                                {/* Top Left Tag (Phase) */}
                                                <View className="absolute top-4 left-4 z-20">
                                                    <View className="bg-black/60 px-3 py-1.5 rounded-full flex-row items-center border border-white/20 backdrop-blur-md">
                                                        <Text className="text-white font-semibold text-sm">{phase}</Text>
                                                    </View>
                                                </View>

                                                {/* Bottom Right Timestamp */}
                                                <View className="absolute bottom-4 right-4 bg-black/60 px-2 py-1 rounded border border-white/10 backdrop-blur-md">
                                                    <Text className="text-white/90 text-sm font-mono">
                                                        {imageTimestamp || 'N/A'}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </SafeAreaView>
                </View>
            </Animated.View>
        </Modal>
    );
}

