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
import { StatusBar } from 'expo-status-bar';

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

    async function getPhotoContext(unitId: string) {
        try {
            const now = new Date();
            const { data: tenancies, error } = await supabase
                .from('tenancies')
                .select('id, lease_start_date, move_out_date')
                .eq('unit_id', unitId)
                .order('lease_start_date', { ascending: true });

            if (error) throw error;

            if (!tenancies || tenancies.length === 0) {
                return { tenancyId: null, phase: 'move_in' };
            }

            // Find relevant tenancy
            // 1. Check for active tenancy (start <= now <= end/move_out)
            // 2. Check for upcoming tenancy (start > now)
            // 3. Check for recently ended tenancy (move_out < now)

            const activeTenancy = tenancies.find(t => {
                const start = new Date(t.lease_start_date);
                const end = t.move_out_date ? new Date(t.move_out_date) : new Date('9999-12-31');
                return now >= start && now <= end;
            });

            if (activeTenancy) {
                // Determine phase based on dates
                const start = new Date(activeTenancy.lease_start_date);
                const end = activeTenancy.move_out_date ? new Date(activeTenancy.move_out_date) : null;

                // If within 14 days of start -> Move In
                const daysSinceStart = (now.getTime() - start.getTime()) / (1000 * 3600 * 24);
                if (daysSinceStart <= 14) return { tenancyId: activeTenancy.id, phase: 'move_in' };

                // If within 14 days of end -> Move Out
                if (end) {
                    const daysUntilEnd = (end.getTime() - now.getTime()) / (1000 * 3600 * 24);
                    if (daysUntilEnd <= 14) return { tenancyId: activeTenancy.id, phase: 'move_out' };
                }

                // Default to repair/inspection during tenancy
                return { tenancyId: activeTenancy.id, phase: 'repair' };
            }

            // If no active tenancy, check upcoming
            const upcomingTenancy = tenancies.find(t => new Date(t.lease_start_date) > now);
            if (upcomingTenancy) {
                return { tenancyId: upcomingTenancy.id, phase: 'move_in' };
            }

            // If no upcoming, check most recent past
            const pastTenancy = tenancies[tenancies.length - 1];
            if (pastTenancy) {
                // If recently ended (within 14 days) -> Move Out
                const end = pastTenancy.move_out_date ? new Date(pastTenancy.move_out_date) : new Date(pastTenancy.lease_start_date); // Fallback
                const daysSinceEnd = (now.getTime() - end.getTime()) / (1000 * 3600 * 24);
                if (daysSinceEnd <= 14) return { tenancyId: pastTenancy.id, phase: 'move_out' };
            }

            // Fallback
            return { tenancyId: null, phase: 'move_in' };

        } catch (e) {
            console.error('Error determining context:', e);
            return { tenancyId: null, phase: 'move_in' };
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

        if (!selectedRoom) {
            Alert.alert('Select Room', 'Please select a room before taking a photo.');
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

                const { tenancyId, phase } = await getPhotoContext(selectedUnit.id);
                const roomId = roomIdMap[selectedRoom];

                // 1. Create Group
                const { data: group, error: groupError } = await supabase
                    .from('groups')
                    .insert({
                        name: selectedRoom,
                        room_id: roomId,
                        tenancy_id: tenancyId,
                    })
                    .select('id')
                    .single();

                if (groupError) throw groupError;

                // 2. Create Image
                const { error: dbError } = await supabase
                    .from('images')
                    .insert({
                        path: storagePath,
                        group_id: group.id,
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
            <StatusBar style="light" />
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
