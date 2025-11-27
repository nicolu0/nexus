import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ToastNotificationProps {
    message: string;
    type: 'success' | 'error';
    onDismiss: () => void;
}

export function ToastNotification({ message, type, onDismiss }: ToastNotificationProps) {
    const slideAnim = useRef(new Animated.Value(-100)).current;
    const dismissRef = useRef(onDismiss);

    useEffect(() => {
        dismissRef.current = onDismiss;
    }, [onDismiss]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dy) > 5;
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy < 0) {
                    slideAnim.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy < -50) {
                    Animated.timing(slideAnim, {
                        toValue: -100,
                        duration: 200,
                        useNativeDriver: true,
                    }).start(() => {
                        dismissRef.current();
                    });
                } else {
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
        }).start();

        const timer = setTimeout(() => {
            Animated.timing(slideAnim, {
                toValue: -100,
                duration: 200,
                useNativeDriver: true,
            }).start(() => {
                dismissRef.current();
            });
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <SafeAreaView className="absolute top-0 left-0 right-0 z-50" pointerEvents="box-none">
            <Animated.View
                {...panResponder.panHandlers}
                style={{ transform: [{ translateY: slideAnim }] }}
                className="mx-4 mt-2"
            >
                <View className={`px-4 py-3 rounded-xl shadow-lg border-2 ${type === 'success'
                    ? 'bg-emerald-200 border-emerald-500'
                    : 'bg-red-200 border-red-500'
                    }`}>
                    <Text className={`font-medium text-center ${type === 'success' ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                        {message}
                    </Text>
                </View>
            </Animated.View>
        </SafeAreaView>
    );
}
