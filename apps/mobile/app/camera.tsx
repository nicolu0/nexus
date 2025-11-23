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
    const [showPropertyMenu, setShowPropertyMenu] = useState(false);
    const [showUnitMenu, setShowUnitMenu] = useState(false);
    const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);
    const [units, setUnits] = useState<{ id: string; unit_number: string }[]>([]);
    const [selectedProperty, setSelectedProperty] = useState<{ id: string; name: string } | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<{ id: string; unit_number: string } | null>(null);
    const { photos, addPhoto } = usePhotos();

    React.useEffect(() => {
        fetchProperties();
    }, []);

    React.useEffect(() => {
        if (selectedProperty) {
            fetchUnits(selectedProperty.id);
        } else {
            setUnits([]);
            setSelectedUnit(null);
        }
    }, [selectedProperty]);

    async function fetchProperties() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('properties')
                .select('id, name')
                .eq('user_id', user.id)
                .order('name');

            if (error) throw error;

            if (data) {
                setProperties(data);
                if (data.length > 0) {
                    setSelectedProperty(data[0]);
                }
            }
        } catch (e) {
            console.error('Error fetching properties:', e);
        }
    }

    async function fetchUnits(propertyId: string) {
        try {
            const { data, error } = await supabase
                .from('units')
                .select('id, unit_number')
                .eq('property_id', propertyId)
                .order('unit_number');

            if (error) throw error;

            if (data) {
                setUnits(data);
                // Optional: Select first unit automatically? User didn't specify, but it's often good UX.
                // Leaving it null for now to force explicit selection unless requested otherwise.
                setSelectedUnit(null);
            }
        } catch (e) {
            console.error('Error fetching units:', e);
        }
    }

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
                <View className="flex-row justify-between px-4 pt-2" pointerEvents="box-none">
                    {/* Selectors Container (Center) */}
                    <View className="flex-1 flex-row justify-center items-start gap-2 z-30" pointerEvents="box-none">
                        {/* Property Selector */}
                        <View className="relative">
                            <TouchableOpacity
                                onPress={() => {
                                    setShowPropertyMenu(!showPropertyMenu);
                                    setShowUnitMenu(false);
                                    setShowMenu(false);
                                }}
                                className="flex-row items-center bg-black/40 backdrop-blur-md rounded-full px-4 py-2 border border-white/20"
                            >
                                <Text className="text-white font-medium mr-1 max-w-[120px]" numberOfLines={1}>
                                    {selectedProperty?.name || 'Select Property'}
                                </Text>
                                <Ionicons name="chevron-down" size={16} color="white" />
                            </TouchableOpacity>

                            {showPropertyMenu && (
                                <View className="absolute top-full mt-2 left-0 w-full z-40">
                                    <View className="bg-black/80 backdrop-blur-md rounded-xl border border-white/20 py-2 w-full max-h-60">
                                        <ScrollView nestedScrollEnabled>
                                            {properties.map((prop) => (
                                                <TouchableOpacity
                                                    key={prop.id}
                                                    onPress={() => {
                                                        setSelectedProperty(prop);
                                                        setShowPropertyMenu(false);
                                                    }}
                                                    className="px-4 py-3 border-b border-white/10 last:border-0"
                                                >
                                                    <Text
                                                        numberOfLines={1}
                                                        className={`text-base ${selectedProperty?.id === prop.id ? 'font-bold text-white' : 'text-gray-300'}`}
                                                    >
                                                        {prop.name}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                            {properties.length === 0 && (
                                                <View className="px-4 py-3">
                                                    <Text className="text-gray-400 text-center">No properties found</Text>
                                                </View>
                                            )}
                                        </ScrollView>
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Unit Selector */}
                        <View className="relative">
                            <TouchableOpacity
                                onPress={() => {
                                    if (selectedProperty) {
                                        setShowUnitMenu(!showUnitMenu);
                                        setShowPropertyMenu(false);
                                        setShowMenu(false);
                                    }
                                }}
                                disabled={!selectedProperty}
                                className={`flex-row items-center bg-black/40 backdrop-blur-md rounded-full px-4 py-2 border border-white/20 ${!selectedProperty ? 'opacity-50' : ''}`}
                            >
                                <Text className="text-white font-medium mr-1 max-w-[80px]" numberOfLines={1}>
                                    {selectedUnit?.unit_number || 'Unit'}
                                </Text>
                                <Ionicons name="chevron-down" size={16} color="white" />
                            </TouchableOpacity>

                            {showUnitMenu && (
                                <View className="absolute top-full mt-2 left-0 w-full z-40">
                                    <View className="bg-black/80 backdrop-blur-md rounded-xl border border-white/20 py-2 w-full max-h-60">
                                        <ScrollView nestedScrollEnabled>
                                            {units.map((unit) => (
                                                <TouchableOpacity
                                                    key={unit.id}
                                                    onPress={() => {
                                                        setSelectedUnit(unit);
                                                        setShowUnitMenu(false);
                                                    }}
                                                    className="px-4 py-3 border-b border-white/10 last:border-0"
                                                >
                                                    <Text
                                                        numberOfLines={1}
                                                        className={`text-base ${selectedUnit?.id === unit.id ? 'font-bold text-white' : 'text-gray-300'}`}
                                                    >
                                                        {unit.unit_number}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                            {units.length === 0 && (
                                                <View className="px-4 py-3">
                                                    <Text className="text-gray-400 text-center">No units</Text>
                                                </View>
                                            )}
                                        </ScrollView>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Profile Menu (Right) */}
                    <View className="absolute right-4 top-2 z-20">
                        <TouchableOpacity
                            onPress={() => {
                                setShowMenu(!showMenu);
                                setShowPropertyMenu(false);
                                setShowUnitMenu(false);
                            }}
                            className="w-10 h-10 bg-black/40 rounded-full justify-center items-center backdrop-blur-md border border-white/20"
                        >
                            <Ionicons name="person-circle-outline" size={28} color="white" />
                        </TouchableOpacity>

                        {showMenu && (
                            <View className="absolute top-12 right-0 bg-white rounded-xl shadow-lg py-2 w-32">
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
