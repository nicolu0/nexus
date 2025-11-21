import "../global.css";
import { Stack } from "expo-router";
import { useState, useEffect } from "react";
import { View } from "react-native";
import * as SplashScreenModule from "expo-splash-screen";
import SplashScreen from "../components/SplashScreen";
import { PhotoProvider } from "../context/PhotoContext";

SplashScreenModule.preventAutoHideAsync();

export default function RootLayout() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [isSplashAnimationFinished, setIsSplashAnimationFinished] = useState(false);

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

  if (isSplashAnimationFinished) {
    return (
      <PhotoProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </PhotoProvider>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <PhotoProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </PhotoProvider>
      <SplashScreen
        isAppReady={isAppReady}
        onAnimationFinish={() => setIsSplashAnimationFinished(true)}
      />
    </View>
  );
}
