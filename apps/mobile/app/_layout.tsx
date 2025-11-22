// apps/mobile/app/_layout.tsx
import '../global.css';
import { Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import { View } from 'react-native';
import * as SplashScreenModule from 'expo-splash-screen';
import SplashScreen from '../components/SplashScreen';
import { PhotoProvider } from '../context/PhotoContext';

SplashScreenModule.preventAutoHideAsync();

export default function RootLayout() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [isSplashAnimationFinished, setIsSplashAnimationFinished] =
    useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await SplashScreenModule.hideAsync();
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn(e);
      } finally {
        setIsAppReady(true);
      }
    }

    prepare();
  }, []);

  const stack = (
    <PhotoProvider>
      <Stack>
        {/* Dashboard */}
        <Stack.Screen
          name="index"
          options={{ title: 'Dashboard' }}
        />
        {/* Property detail + units */}
        <Stack.Screen
          name="properties/[propertyId]/index"
          options={{ title: 'Property' }}
        />
        {/* Unit page */}
        <Stack.Screen
          name="properties/[propertyId]/units/[unitId]/index"
          options={{ title: 'Unit' }}
        />
        {/* Move-in camera flow (full-screen, no header) */}
        <Stack.Screen
          name="properties/[propertyId]/units/[unitId]/move-in"
          options={{ title: 'Move-in Photos', headerShown: false }}
        />
      </Stack>
    </PhotoProvider>
  );

  if (isSplashAnimationFinished) {
    return stack;
  }

  return (
    <View className="flex-1">
      {stack}
      <SplashScreen
        isAppReady={isAppReady}
        onAnimationFinish={() => setIsSplashAnimationFinished(true)}
      />
    </View>
  );
}