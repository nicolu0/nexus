import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function AuthScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSignIn() {
        if (!email || !password) {
            Alert.alert('Missing info', 'Please enter email and password.');
            return;
        }

        try {
            setLoading(true);
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) {
                Alert.alert('Sign in error', error.message);
            }
        } catch (e: any) {
            Alert.alert('Sign in error', e.message ?? 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    async function handleSignUp() {
        if (!email || !password) {
            Alert.alert('Missing info', 'Please enter email and password.');
            return;
        }

        try {
            setLoading(true);
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });
            if (error) {
                Alert.alert('Sign up error', error.message);
            } else {
                Alert.alert(
                    'Check your email',
                    'We sent you a confirmation link. After confirming, you can sign in.'
                );
            }
        } catch (e: any) {
            Alert.alert('Sign up error', e.message ?? 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    return (
        <View className="flex-1 bg-black justify-center px-6">
            <Text className="text-white text-3xl font-semibold mb-8">Nexus</Text>
            <Text className="text-gray-300 mb-6">
                Sign in to start capturing AB 2801-compliant photos.
            </Text>

            <View className="mb-4">
                <Text className="text-gray-400 text-xs mb-1">Email</Text>
                <TextInput
                    autoCapitalize="none"
                    keyboardType="email-address"
                    className="border border-gray-700 rounded-xl px-3 py-2 text-white"
                    placeholder="you@example.com"
                    placeholderTextColor="#6b7280"
                    value={email}
                    onChangeText={setEmail}
                />
            </View>

            <View className="mb-6">
                <Text className="text-gray-400 text-xs mb-1">Password</Text>
                <TextInput
                    secureTextEntry
                    className="border border-gray-700 rounded-xl px-3 py-2 text-white"
                    placeholder="••••••••"
                    placeholderTextColor="#6b7280"
                    value={password}
                    onChangeText={setPassword}
                />
            </View>

            <TouchableOpacity
                disabled={loading}
                onPress={handleSignIn}
                className="bg-white rounded-xl py-3 items-center mb-3"
            >
                {loading ? (
                    <ActivityIndicator />
                ) : (
                    <Text className="text-black font-semibold">Sign In</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                disabled={loading}
                onPress={handleSignUp}
                className="border border-gray-600 rounded-xl py-3 items-center"
            >
                <Text className="text-white font-semibold">Sign Up</Text>
            </TouchableOpacity>
        </View>
    );
}
