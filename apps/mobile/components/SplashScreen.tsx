import React, { useEffect } from 'react';
import { View, Dimensions } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    withDelay,
    runOnJS,
    Easing,
    cancelAnimation,
} from 'react-native-reanimated';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

interface SplashScreenProps {
    isAppReady: boolean;
    onAnimationFinish: () => void;
}

export default function SplashScreen({ isAppReady, onAnimationFinish }: SplashScreenProps) {
    const opacity = useSharedValue(1);
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: scale.value }],
    }));



    useEffect(() => {
        if (isAppReady) {
            // Stop the pulse and start the exit animation
            // cancelAnimation(scale); // No longer needed as pulse is removed

            // Shrink and Fade out
            scale.value = withTiming(0, { duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
            opacity.value = withTiming(0, { duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }, (finished) => {
                if (finished) {
                    runOnJS(onAnimationFinish)();
                }
            });
        }
    }, [isAppReady]);

    return (
        <View className="absolute inset-0 bg-[#fafafa] justify-center items-center z-[9999]">
            <Animated.View className="justify-center items-center" style={animatedStyle}>
                <Svg width="100" height="102" viewBox="0 0 179 182" fill="none">
                    {/* Background Rect - keeping it but maybe we want transparent? 
              The SVG has a white background rect. I'll include it as per file. */}
                    <Rect width="179" height="182" fill="#fafafa" />
                    <Path d="M140 59.5863L90 150.966V83.7242L140 59.5863Z" fill="#2B2B2B" />
                    <Path d="M40 59.5863L90 150.966V83.7242L40 59.5863Z" fill="#424242" />
                    <Path d="M90 83.7241L140 59.5862L90 32V83.7241Z" fill="#353535" />
                    <Path d="M90 83.7241L40 59.5862L90 32V83.7241Z" fill="#4F4F4F" />
                </Svg>
            </Animated.View>
        </View>
    );
}
