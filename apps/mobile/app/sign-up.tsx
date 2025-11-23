import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function SignUpScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

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
                    'We sent you a confirmation link. After confirming, you can sign in.',
                    [{ text: 'OK', onPress: () => router.back() }]
                );
            }
        } catch (e: any) {
            Alert.alert('Sign up error', e.message ?? 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    return (
        <View className="flex-1 bg-stone-50 px-6">
            <View className="flex-1 justify-center">
                <Text className="text-black text-3xl font-semibold mb-8 text-center">Create Account</Text>
                <Text className="text-gray-600 mb-6 text-center">
                    Sign up to start capturing AB 2801-compliant photos.
                </Text>

                <View className="mb-4">
                    <Text className="text-gray-500 text-xs mb-1">Email</Text>
                    <TextInput
                        autoCapitalize="none"
                        keyboardType="email-address"
                        className="border border-gray-300 rounded-xl px-3 py-2 text-black"
                        placeholder="you@example.com"
                        placeholderTextColor="#9ca3af"
                        value={email}
                        onChangeText={setEmail}
                    />
                </View>

                <View className="mb-6">
                    <Text className="text-gray-500 text-xs mb-1">Password</Text>
                    <TextInput
                        secureTextEntry
                        className="border border-gray-300 rounded-xl px-3 py-2 text-black"
                        placeholder="••••••••"
                        placeholderTextColor="#9ca3af"
                        value={password}
                        onChangeText={setPassword}
                    />
                </View>

                <TouchableOpacity
                    disabled={loading}
                    onPress={handleSignUp}
                    className="bg-stone-700 rounded-xl py-3 items-center mb-3"
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-semibold">Sign Up</Text>
                    )}
                </TouchableOpacity>
            </View>

            <View className="flex-row justify-center mb-10">
                <Text className="text-gray-500">Already have an account? </Text>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text className="text-stone-700 font-semibold">Sign in</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
