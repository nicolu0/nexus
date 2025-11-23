import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Button,
    ScrollView,
    Image,
    StyleSheet,
    Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { usePhotos } from '../context/PhotoContext';

async function uploadPhotoToSupabase(uri: string) {
    const response = await fetch(uri);
    const blob = await response.blob();

    const ext = 'jpg';
    const filename = `${Date.now()}.${ext}`;
    const path = `raw/${filename}`;

    const { error } = await supabase.storage
        .from('Images')
        .upload(path, blob, {
            contentType: 'image/jpeg',
            upsert: false,
        });

    if (error) {
        console.error('Supabase upload error:', error);
        throw error;
    }

    const { data: publicData } = supabase.storage
        .from('Images')
        .getPublicUrl(path);

    return {
        storagePath: path,
        publicUrl: publicData.publicUrl,
    };
}

export default function CameraScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const [capturing, setCapturing] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const { photos, addPhoto } = usePhotos();

    if (!permission) {
        return <View className="flex-1 bg-black" />;
    }

    if (!permission.granted) {
        return (
            <View className="flex-1 justify-center px-4 bg-black">
                <Text className="text-center pb-2.5 text-white">
                    We need your permission to show the camera
                </Text>
                <Button onPress={requestPermission} title="Grant permission" />
            </View>
        );
    }

    async function takePicture() {
        if (!cameraRef.current || capturing) return;

        setCapturing(true);
        try {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.5,
                skipProcessing: true,
                base64: false,
                exif: false,
            });

            if (photo?.uri) {
                addPhoto(photo.uri);

                const { storagePath, publicUrl } = await uploadPhotoToSupabase(
                    photo.uri
                );
                console.log('Uploaded to Supabase:', storagePath, publicUrl);
            }
        } catch (e) {
            console.error('takePicture error:', e);
        } finally {
            setCapturing(false);
        }
    }

    async function handleSignOut() {
        const { error } = await supabase.auth.signOut();
        if (error) {
            Alert.alert('Error signing out', error.message);
        }
    }

    return (
        <View className="flex-1 bg-black">
            {/* Camera */}
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} />

            {/* Top Controls */}
            <SafeAreaView className="absolute top-0 left-0 right-0 z-10" pointerEvents="box-none">
                <View className="flex-row justify-end px-4 pt-2" pointerEvents="box-none">
                    <View className="relative">
                        <TouchableOpacity
                            onPress={() => setShowMenu(!showMenu)}
                            className="w-10 h-10 bg-black/40 rounded-full justify-center items-center backdrop-blur-md"
                        >
                            <Ionicons name="person-circle-outline" size={28} color="white" />
                        </TouchableOpacity>

                        {showMenu && (
                            <View className="absolute top-12 right-0 bg-white rounded-xl shadow-lg py-2 w-32 z-20">
                                <TouchableOpacity
                                    onPress={handleSignOut}
                                    className="px-4 py-2 flex-row items-center"
                                >
                                    <Ionicons name="log-out-outline" size={20} color="black" />
                                    <Text className="ml-2 text-black font-medium">Sign Out</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </SafeAreaView>

            {/* Bottom Controls Overlay */}
            <SafeAreaView className="flex-1 justify-end pb-10" pointerEvents="box-none">
                <View className="flex-row items-center justify-center">
                    <TouchableOpacity
                        disabled={capturing}
                        onPress={takePicture}
                        className={
                            capturing
                                ? 'opacity-50 w-[80px] h-[80px] rounded-full bg-white/30 justify-center items-center'
                                : 'w-[80px] h-[80px] rounded-full bg-white/30 justify-center items-center'
                        }
                    >
                        <View className="w-[68px] h-[68px] rounded-full bg-white" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* Simple thumbnail strip at bottom (optional) */}
            {photos.length > 0 && (
                <View className="absolute bottom-3 left-0 right-0" pointerEvents="box-none">
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="px-3"
                    >
                        {photos.slice(-10).map((uri, idx) => (
                            <Image
                                key={`${uri}-${idx}`}
                                source={{ uri }}
                                className="w-14 h-14 rounded-md mr-2 border border-white/40"
                            />
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
    );
}
