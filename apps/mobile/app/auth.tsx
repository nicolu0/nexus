import React, { useState } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ActivityIndicator,
	Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function AuthScreen() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const router = useRouter();

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

	return (
		<View className="flex-1 bg-stone-50 px-6">
				<View className="flex-1 justify-center">
									<View className="items-center mb-8">
								<Image
									source={require('../assets/images/nexus.svg')}
									style={{ width: 60, height: 60 }}
									contentFit="contain"
								/>
							<Text className="text-black text-3xl font-semibold mb-4">Nexus</Text>
					</View>

					<Text className="text-gray-600 mb-8 text-center">
					Sign in to start capturing AB 2801-compliant photos.
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
					onPress={handleSignIn}
					className="bg-stone-700 rounded-xl py-3 items-center mb-6"
				>
					{loading ? (
						<ActivityIndicator color="white" />
					) : (
						<Text className="text-white font-semibold">Sign in</Text>
					)}
				</TouchableOpacity>
			</View>

			<View className="flex-row justify-center mb-12">
				<Text className="text-gray-500">Don't have an account? </Text>
				<TouchableOpacity onPress={() => router.push('/sign-up')}>
					<Text className="text-stone-700 font-semibold">Sign up</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}
