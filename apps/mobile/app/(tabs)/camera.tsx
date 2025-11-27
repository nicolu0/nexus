import React, { useRef, useState, useEffect } from 'react';
import {
    View,
    Text,
    Button,
    StyleSheet,
    Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../../lib/supabase';
import { usePhotos } from '../../context/PhotoContext';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import { CameraTopControls, CameraTopControlsHandle } from '../../components/md/CameraTopControls';
import { CameraBottomControls } from '../../components/md/CameraBottomControls';
import { CustomRoomModal } from '../../components/md/CustomRoomModal';
import { ToastNotification } from '../../components/sm/ToastNotification';
import * as Location from 'expo-location';

async function uploadPhotoToSupabase(uri: string) {
    const ext = 'jpg';
    const filename = `${Date.now()}.${ext}`;
    const path = `raw/${filename}`;

    const file = new FileSystem.File(uri);
    const base64 = await file.base64();

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

export default function CameraScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const topControlsRef = useRef<CameraTopControlsHandle>(null);
    const [capturing, setCapturing] = useState(false);
    const [properties, setProperties] = useState<{ id: string; name: string; latitude?: number; longitude?: number }[]>([]);
    const [units, setUnits] = useState<{ id: string; unit_number: string }[]>([]);
    const [selectedProperty, setSelectedProperty] = useState<{ id: string; name: string; latitude?: number; longitude?: number } | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<{ id: string; unit_number: string } | null>(null);
    const { photos, addPhoto } = usePhotos();

    const [rooms, setRooms] = useState<string[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<string>('');
    const [roomIdMap, setRoomIdMap] = useState<{ [label: string]: string }>({});
    const [showCustomRoomModal, setShowCustomRoomModal] = useState(false);
    const [customRoomText, setCustomRoomText] = useState('');
    const tapTargetRef = useRef<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        if (showCustomRoomModal) {
            topControlsRef.current?.closeDropdowns();
        }
    }, [showCustomRoomModal]);

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

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
    };

    async function fetchProperties() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('properties')
                .select('id, name, latitude, longitude')
                .eq('owner_id', user.id)
                .order('name');

            if (error) throw error;

            if (data) {
                setProperties(data);

                // Try to find closest property
                try {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status === 'granted') {
                        const location = await Location.getCurrentPositionAsync({});
                        const { latitude, longitude } = location.coords;

                        let closestProperty = null;
                        let minDistance = Infinity;

                        data.forEach(property => {
                            if (property.latitude && property.longitude) {
                                const distance = getDistanceFromLatLonInKm(
                                    latitude,
                                    longitude,
                                    property.latitude,
                                    property.longitude
                                );
                                if (distance < minDistance) {
                                    minDistance = distance;
                                    closestProperty = property;
                                }
                            }
                        });

                        if (closestProperty) {
                            setSelectedProperty(closestProperty);
                        } else {
                            setSelectedProperty(null);
                        }
                    } else {
                        // Fallback if permission denied
                        setSelectedProperty(null);
                    }
                } catch (locError) {
                    console.error('Error getting location:', locError);
                    setSelectedProperty(null);
                }
            }
        } catch (e) {
            console.error('Error fetching properties:', e);
        }
    }

    function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
        var R = 6371; // Radius of the earth in km
        var dLat = deg2rad(lat2 - lat1);
        var dLon = deg2rad(lon2 - lon1);
        var a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
            ;
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c; // Distance in km
        return d;
    }

    function deg2rad(deg: number) {
        return deg * (Math.PI / 180);
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

        const normalizedNewRoom = customRoomText.trim().toLowerCase();
        if (rooms.some(r => r.toLowerCase() === normalizedNewRoom)) {
            showToast('Room already exists!', 'error');
            return;
        }

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
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} />

            <CameraTopControls
                ref={topControlsRef}
                properties={properties}
                units={units}
                selectedProperty={selectedProperty}
                selectedUnit={selectedUnit}
                onSelectProperty={setSelectedProperty}
                onSelectUnit={setSelectedUnit}
                onSignOut={handleSignOut}
            />

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

            <CustomRoomModal
                visible={showCustomRoomModal}
                roomText={customRoomText}
                onChangeText={setCustomRoomText}
                onCancel={() => setShowCustomRoomModal(false)}
                onSubmit={handleAddCustomRoom}
            />

            {/* Toast Notification */}
            {toast && (
                <ToastNotification
                    message={toast.message}
                    type={toast.type}
                    onDismiss={() => setToast(null)}
                />
            )}
        </View >
    );
}
