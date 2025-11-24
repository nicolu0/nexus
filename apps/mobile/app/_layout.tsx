import '../global.css';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, Href } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { PhotoProvider } from '../context/PhotoContext';

export default function RootLayout() {
    const [session, setSession] = useState<Session | null | undefined>(undefined);
    const router = useRouter();

    // Watch Supabase auth state
    useEffect(() => {
        let mounted = true;

        // Initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!mounted) return;
            setSession(session ?? null);
        });

        // Subscribe to changes
        const { data: subscription } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                if (!mounted) return;
                setSession(session ?? null);
            }
        );

        return () => {
            mounted = false;
            subscription.subscription?.unsubscribe();
        };
    }, []);

    // Redirect when auth state is known
    useEffect(() => {
        if (session === undefined) return; // still loading

        if (session) {
            router.replace('/(tabs)/camera' as Href);
        } else {
            router.replace('/auth' as Href);
        }
    }, [session, router]);

    // Simple loading screen while we check auth
    if (session === undefined) {
        return (
            <View className="flex-1 justify-center items-center bg-black">
                <ActivityIndicator />
            </View>
        );
    }

    return (
        <PhotoProvider>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="auth" />
            </Stack>
        </PhotoProvider>
    );
}
