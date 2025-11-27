import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface RoomSelectorProps {
    rooms: string[];
    selectedRoom: string;
    onSelectRoom: (room: string) => void;
    onCustomRoom: () => void;
    itemWidth: number;
    tapTargetRef: React.MutableRefObject<string | null>;
}

export function RoomSelector({
    rooms,
    selectedRoom,
    onSelectRoom,
    onCustomRoom,
    itemWidth,
    tapTargetRef,
}: RoomSelectorProps) {
    const flatListRef = useRef<FlatList>(null);

    return (
        <View className="absolute bottom-0 left-0 right-0 h-12 z-20 mb-28">
            <LinearGradient
                colors={['rgba(0,0,0,0.8)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="absolute left-0 top-0 bottom-0 w-16 z-10"
                pointerEvents="none"
            />
            <FlatList
                ref={flatListRef}
                data={[...rooms, '+ Custom']}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToAlignment="start"
                snapToInterval={itemWidth}
                decelerationRate="fast"
                disableIntervalMomentum={true}
                contentContainerStyle={{ paddingHorizontal: (Dimensions.get('window').width - itemWidth) / 2 }}
                keyExtractor={(item: string) => item}
                viewabilityConfig={{
                    itemVisiblePercentThreshold: 50
                }}
                onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
                    if (tapTargetRef.current) return;

                    const index = Math.round(event.nativeEvent.contentOffset.x / itemWidth);
                    const item = [...rooms, '+ Custom'][index];
                    if (item && item !== '+ Custom' && item !== selectedRoom) {
                        onSelectRoom(item);
                    }
                }}
                scrollEventThrottle={16}
                onMomentumScrollEnd={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
                    if (tapTargetRef.current) {
                        const target = tapTargetRef.current;
                        tapTargetRef.current = null;
                        if (target !== '+ Custom') {
                            onSelectRoom(target);
                        }
                    } else {
                        const index = Math.round(event.nativeEvent.contentOffset.x / itemWidth);
                        const item = [...rooms, '+ Custom'][index];
                        if (item && item !== '+ Custom') {
                            onSelectRoom(item);
                        }
                    }
                }}
                renderItem={({ item, index }: { item: string, index: number }) => (
                    <TouchableOpacity
                        onPress={() => {
                            if (item === '+ Custom') {
                                onCustomRoom();
                            } else {
                                tapTargetRef.current = item;
                                flatListRef.current?.scrollToOffset({ offset: index * itemWidth, animated: true });
                            }
                        }}
                        style={{ width: itemWidth, zIndex: selectedRoom === item ? 50 : 1 }}
                        className="justify-center items-center h-full"
                    >
                        <View
                            style={{
                                position: 'absolute',
                                minWidth: itemWidth,
                                height: 34,
                            }}
                            className={`px-4 rounded-full items-center justify-center overflow-hidden ${selectedRoom === item && item !== '+ Custom'
                                ? 'bg-stone-900/80 border border-white/30'
                                : ''
                                }`}
                        >
                            <Text
                                numberOfLines={1}
                                className={`text-base font-medium ${selectedRoom === item
                                    ? 'text-white'
                                    : 'text-white/60'
                                    }`}
                            >
                                {item}
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}
            />
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="absolute right-0 top-0 bottom-0 w-16 z-10"
                pointerEvents="none"
            />
        </View>
    );
}
