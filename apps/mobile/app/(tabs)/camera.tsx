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
    Modal,
    TextInput,
    FlatList,
    Dimensions,
    NativeSyntheticEvent,
    NativeScrollEvent,
    ViewToken,
    Animated,
    PanResponder,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { usePhotos } from '../../context/PhotoContext';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import { CameraTopControls } from '../../components/md/CameraTopControls';
import { CameraBottomControls } from '../../components/md/CameraBottomControls';

async function uploadPhotoToSupabase(uri: string) {
    const ext = 'jpg';
    const filename = `${Date.now()}.${ext}`;
    const path = `raw/${filename}`;

    // Use new File API
    const file = new FileSystem.File(uri);
    const base64 = await file.base64();

    // Decode base64 to binary
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    const { error } = await supabase.storage
        .from('unit-images')
        .upload(path, bytes.buffer, {
            contentType: 'image/jpeg',
            upsert: false,
        });

    if (error) {
        console.error('Supabase upload error:', error);
        throw error;
    }

    const { data: publicData } = supabase.storage
        .from('unit-images')
        .getPublicUrl(path);

    return {
        storagePath: path,
        publicUrl: publicData.publicUrl,
    };
}

import { LinearGradient } from 'expo-linear-gradient';

export default function CameraScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const [capturing, setCapturing] = useState(false);
    const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);
    const [units, setUnits] = useState<{ id: string; unit_number: string }[]>([]);
    const [selectedProperty, setSelectedProperty] = useState<{ id: string; name: string } | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<{ id: string; unit_number: string } | null>(null);
    const { photos, addPhoto } = usePhotos();

    const [rooms, setRooms] = useState<string[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<string>('');
    const [roomIdMap, setRoomIdMap] = useState<{ [label: string]: string }>({});
    const [showCustomRoomModal, setShowCustomRoomModal] = useState(false);
    const [customRoomText, setCustomRoomText] = useState('');
    const tapTargetRef = useRef<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const slideAnim = useRef(new Animated.Value(-100)).current;
    const panResponderRef = useRef<any>(null);

    const ITEM_WIDTH = 110;

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

    React.useEffect(() => {
        if (selectedUnit) {
            fetchUnitRooms(selectedUnit.id);
        } else {
            setRooms([]);
            setSelectedRoom('');
        }
    }, [selectedUnit]);

    React.useEffect(() => {
        if (selectedRoom) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, [selectedRoom]);

    React.useEffect(() => {
        if (toast) {
            panResponderRef.current = PanResponder.create({
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
                            toValue: -100,
                            duration: 200,
                            useNativeDriver: true,
                        }).start(() => setToast(null));
                    } else {
                        Animated.spring(slideAnim, {
                            toValue: 0,
                            useNativeDriver: true,
                        }).start();
                    }
                },
            });

            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 50,
                friction: 7,
            }).start();

            const timer = setTimeout(() => {
                Animated.timing(slideAnim, {
                    toValue: -100,
                    duration: 200,
                    useNativeDriver: true,
                }).start(() => setToast(null));
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [toast]);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
    };

    async function fetchProperties() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('properties')
                .select('id, name')
                .eq('owner_id', user.id)
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
                setSelectedUnit(null);
            }
        } catch (e) {
            console.error('Error fetching units:', e);
        }
    }

    async function fetchUnitRooms(unitId: string) {
        try {
            const { data, error } = await supabase
                .from('rooms')
                .select('id, name')
                .eq('unit_id', unitId)
                .order('name');

            if (error) throw error;

            if (data && data.length > 0) {
                const roomLabels = data.map(s => s.name);
                const idMap = data.reduce((acc, s) => {
                    acc[s.name] = s.id;
                    return acc;
                }, {} as { [label: string]: string });

                setRooms(roomLabels);
                setRoomIdMap(idMap);
                setSelectedRoom(roomLabels[0]);
            } else {
                setRooms([]);
                setRoomIdMap({});
                setSelectedRoom('');
            }
        } catch (e) {
            console.error('Error fetching unit rooms:', e);
        }
    }

    async function getOrCreateSession(unitId: string, userId: string) {
        try {
            // 1. Check for existing in_progress session (any phase)
            const { data: existingSession, error: fetchError } = await supabase
                .from('sessions')
                .select('id')
                .eq('unit_id', unitId)
                .eq('status', 'in_progress')
                .order('last_activity_at', { ascending: false })
                .limit(1)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                throw fetchError;
            }

            if (existingSession) {
                await supabase
                    .from('sessions')
                    .update({ last_activity_at: new Date().toISOString() })
                    .eq('id', existingSession.id);

                // Fetch full session details to return
                const { data: fullSession } = await supabase
                    .from('sessions')
                    .select('tenancy_id, phase')
                    .eq('id', existingSession.id)
                    .single();

                return {
                    sessionId: existingSession.id,
                    tenancyId: fullSession?.tenancy_id,
                    phase: fullSession?.phase
                };
            }

            // 2. Fetch tenancies to determine context
            const now = new Date().toISOString();
            const { data: tenancies, error: tenanciesError } = await supabase
                .from('tenancies')
                .select('id, lease_start_date, lease_end_date')
                .eq('unit_id', unitId)
                .order('lease_start_date', { ascending: true });

            if (tenanciesError) throw tenanciesError;

            let phase = 'move_in';
            let tenancyId = null;

            const upcomingTenant = tenancies?.find(t => t.lease_start_date > now);
            // Prior tenant is the latest one that has already started (and potentially ended)
            const priorTenants = tenancies?.filter(t => t.lease_start_date <= now) || [];
            const priorTenant = priorTenants[priorTenants.length - 1];

            if (!tenancies || tenancies.length === 0) {
                // Scenario A: No tenants -> Move-in, no tenancy
                phase = 'move_in';
                tenancyId = null;
            } else if (upcomingTenant && !priorTenant) {
                // Scenario B: Upcoming tenant, no prior -> Move-in for upcoming
                phase = 'move_in';
                tenancyId = upcomingTenant.id;
            } else if (priorTenant) {
                // Scenario C: Prior tenant exists

                // Check for completed move_out
                const { data: moveOut } = await supabase
                    .from('sessions')
                    .select('id')
                    .eq('unit_id', unitId)
                    .eq('tenancy_id', priorTenant.id)
                    .eq('phase', 'move_out')
                    .eq('status', 'completed')
                    .single();

                if (!moveOut) {
                    phase = 'move_out';
                    tenancyId = priorTenant.id;
                } else {
                    // Check for completed repair
                    const { data: repair } = await supabase
                        .from('sessions')
                        .select('id')
                        .eq('unit_id', unitId)
                        .eq('tenancy_id', priorTenant.id)
                        .eq('phase', 'repair')
                        .eq('status', 'completed')
                        .single();

                    if (!repair) {
                        phase = 'repair';
                        tenancyId = priorTenant.id;
                    } else {
                        // Both move-outs done
                        if (upcomingTenant) {
                            phase = 'move_in';
                            tenancyId = upcomingTenant.id;
                        } else {
                            phase = 'move_in';
                            tenancyId = null;
                        }
                    }
                }
            }

            // 3. Create new session with determined phase and tenancy
            const { data: newSession, error: createError } = await supabase
                .from('sessions')
                .insert({
                    unit_id: unitId,
                    created_by: userId,
                    status: 'in_progress',
                    phase: phase,
                    tenancy_id: tenancyId,
                    started_at: new Date().toISOString(),
                    last_activity_at: new Date().toISOString(),
                })
                .select('id')
                .single();

            if (createError) throw createError;
            return {
                sessionId: newSession.id,
                tenancyId: tenancyId,
                phase: phase
            };

        } catch (e) {
            console.error('Error managing session:', e);
            throw e;
        }
    }

    const handleAddCustomRoom = async () => {
        if (!customRoomText.trim() || !selectedUnit) return;

        const label = customRoomText.trim().charAt(0).toUpperCase() + customRoomText.trim().slice(1);

        try {
            const { data, error } = await supabase
                .from('rooms')
                .insert({
                    unit_id: selectedUnit.id,
                    name: label,
                })
                .select('id, name')
                .single();

            if (error) throw error;

            setRooms([...rooms, label]);
            setRoomIdMap({ ...roomIdMap, [label]: data.id });
            setSelectedRoom(label);
            setCustomRoomText('');
            setShowCustomRoomModal(false);
        } catch (e) {
            console.error('Error adding custom room:', e);
            Alert.alert('Error', 'Failed to add custom room');
        }
    };

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

        if (!selectedUnit) {
            Alert.alert('Select Unit', 'Please select a unit before taking a photo.');
            return;
        }

        // Haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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

                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // Get or create session
                    const { sessionId, tenancyId, phase } = await getOrCreateSession(selectedUnit.id, user.id);
                    const roomId = roomIdMap[selectedRoom];

                    const { error: dbError } = await supabase
                        .from('images')
                        .insert({
                            path: storagePath,
                            room_id: roomId,
                            tenancy_id: tenancyId,
                            phase: phase,
                            mime_type: 'image/jpeg',
                        });

                    if (dbError) {
                        console.error('Error saving image metadata:', dbError);
                        showToast('Failed to save image metadata', 'error');
                    } else {
                        console.log('Image metadata saved to database');
                        showToast('Photo saved!', 'success');
                    }
                }
            }
        } catch (e) {
            console.error('takePicture error:', e);
            showToast('Failed to save photo.', 'error');
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
            {/* Toast Notification */}
            {toast && (
                <SafeAreaView className="absolute top-0 left-0 right-0 z-50" pointerEvents="box-none">
                    <Animated.View
                        {...(panResponderRef.current?.panHandlers || {})}
                        style={{ transform: [{ translateY: slideAnim }] }}
                        className="mx-4 mt-2"
                    >
                        <View className={`px-4 py-3 rounded-xl shadow-lg border-2 ${toast.type === 'success'
                            ? 'bg-emerald-200 border-emerald-500'
                            : 'bg-red-200 border-red-500'
                            }`}>
                            <Text className={`font-medium text-center ${toast.type === 'success' ? 'text-emerald-600' : 'text-red-600'
                                }`}>
                                {toast.message}
                            </Text>
                        </View>
                    </Animated.View>
                </SafeAreaView>
            )}

            {/* Camera */}
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} />

            {/* Top Controls */}
            <CameraTopControls
                properties={properties}
                units={units}
                selectedProperty={selectedProperty}
                selectedUnit={selectedUnit}
                onSelectProperty={setSelectedProperty}
                onSelectUnit={setSelectedUnit}
                onSignOut={handleSignOut}
            />

            {/* Bottom Controls */}
            <CameraBottomControls
                rooms={rooms}
                selectedRoom={selectedRoom}
                onSelectRoom={setSelectedRoom}
                onCustomRoom={() => setShowCustomRoomModal(true)}
                onCapture={takePicture}
                capturing={capturing}
                itemWidth={ITEM_WIDTH}
                tapTargetRef={tapTargetRef}
            />

            {/* Custom Room Modal */}
            <Modal
                visible={showCustomRoomModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowCustomRoomModal(false)}
            >
                <View className="flex-1 bg-black/80 justify-center items-center px-6">
                    <View className="bg-stone-900 w-full rounded-2xl p-6 border border-white/10">
                        <Text className="text-white text-xl font-bold mb-4">Add Custom Room</Text>
                        <TextInput
                            className="bg-stone-800 text-white p-4 rounded-xl mb-4 text-lg"
                            placeholder="Room Name"
                            placeholderTextColor="#666"
                            value={customRoomText}
                            onChangeText={setCustomRoomText}
                            autoFocus
                        />
                        <View className="flex-row gap-4">
                            <TouchableOpacity
                                onPress={() => setShowCustomRoomModal(false)}
                                className="flex-1 bg-stone-800 p-4 rounded-xl items-center"
                            >
                                <Text className="text-white font-semibold">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleAddCustomRoom}
                                className="flex-1 bg-white p-4 rounded-xl items-center"
                            >
                                <Text className="text-black font-semibold">Add Room</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View >
    );
}
