import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
} from 'react-native';

type RoomFilterProps = {
    rooms: { id?: string; name: string }[] | string[];
    selectedRoomId: string | null;
    onSelectRoom: (id: string | null) => void;
};

export function RoomFilter({
    rooms,
    selectedRoomId,
    onSelectRoom,
}: RoomFilterProps) {
    if (rooms.length === 0) return null;

    return (
        <View>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="px-4 py-2 border-b border-gray-100 grow-0"
            >
                <TouchableOpacity
                    onPress={() => onSelectRoom(null)}
                    className={`px-3 py-1 rounded-full mr-2 border ${selectedRoomId === null
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-white border-gray-200'
                        }`}
                >
                    <Text
                        className={`text-xs ${selectedRoomId === null
                            ? 'text-white'
                            : 'text-gray-700'
                            }`}
                    >
                        All rooms
                    </Text>
                </TouchableOpacity>

                {rooms.map((room) => {
                    const isString = typeof room === 'string';
                    const id = isString ? room : room.id;
                    const name = isString ? room : room.name;
                    
                    // Safety check for undefined ID in object case
                    if (!isString && !id) return null;
                    
                    const isActive = selectedRoomId === id;

                    return (
                        <TouchableOpacity
                            key={id}
                            onPress={() => onSelectRoom(isActive ? null : (id as string))}
                            className={`px-3 py-1 rounded-full mr-2 border ${isActive
                                ? 'bg-blue-600 border-blue-600'
                                : 'bg-white border-gray-200'
                                }`}
                        >
                            <Text
                                className={`text-xs ${isActive
                                    ? 'text-white'
                                    : 'text-gray-700'
                                    }`}
                            >
                                {name}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

