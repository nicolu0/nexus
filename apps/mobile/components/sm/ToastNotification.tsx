import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, PanResponder, Platform, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Ionicons } from '@expo/vector-icons';

interface ToastNotificationProps {
    message: string;
    type: 'success' | 'error';
    onDismiss: () => void;
    topOverlayHeight?: number;
    excessHeight?: number;
}

export function ToastNotification({ message, type, onDismiss, topOverlayHeight, excessHeight }: ToastNotificationProps) {
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(-200)).current;
    const dismissRef = useRef(onDismiss);
    const [toastHeight, setToastHeight] = useState(0);
    const isIOS = Platform.OS === 'ios';
    const liquidAvailable = isIOS && isLiquidGlassAvailable();

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
                        toValue: -200,
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
            tension: 80,
            friction: 10,
        }).start();

        const duration = type === 'error' ? 4000 : 2000;

        const timer = setTimeout(() => {
            Animated.timing(slideAnim, {
                toValue: -200,
                duration: 200,
                useNativeDriver: true,
            }).start(() => {
                dismissRef.current();
            });
        }, duration);

        return () => clearTimeout(timer);
    }, []);

    const getGlassStyle = () => {
        const baseStyle = {
            borderRadius: 12,
            overflow: 'hidden' as const,
        };

        if (liquidAvailable) {
            return {
                ...baseStyle,
                ...(type === 'success' && {
                    borderWidth: 1,
                    borderColor: 'rgba(16, 185, 129, 0.5)',
                }),
                ...(type === 'error' && {
                    borderWidth: 1,
                    borderColor: 'rgba(239, 68, 68, 0.5)',
                }),
            };
        }

        return {
            ...baseStyle,
            backgroundColor: 'rgba(41, 37, 36, 0.8)',
            borderWidth: 1,
            ...(type === 'success' && {
                borderColor: 'rgba(16, 185, 129, 0.5)',
            }),
            ...(type === 'error' && {
                borderColor: 'rgba(239, 68, 68, 0.5)',
            }),
        };
    };

    const topMargin = ((topOverlayHeight ?? 0) - insets.top) + 8;

    return (
        <SafeAreaView className="absolute top-0 left-0 right-0 z-50" pointerEvents="box-none">
            <Animated.View
                {...panResponder.panHandlers}
                style={{ 
                    transform: [{ translateY: slideAnim }],
                    marginTop: topMargin,
                }}
                className="mx-4"
            >
                <GlassView
                    glassEffectStyle='clear'
                    isInteractive={false}
                    tintColor='rgba(10, 10, 10, 0.9)'
                    style={getGlassStyle()}
                >
                    <View 
                        className="px-4 py-3 rounded-xl flex-row items-center gap-3"
                        onLayout={(e) => setToastHeight(e.nativeEvent.layout.height)}
                    >
                        <Ionicons 
                            name={type === 'success' ? 'checkmark-circle' : 'warning'} 
                            size={18} 
                            color={type === 'success' ? '#10b981' : '#ef4444'} 
                        />
                        <Text className={`font-medium flex-1 ${type === 'success' ? 'text-emerald-500' : 'text-red-500'
                            }`}>
                            {message}
                        </Text>
                    </View>
                </GlassView>
            </Animated.View>
        </SafeAreaView>
    );
}
