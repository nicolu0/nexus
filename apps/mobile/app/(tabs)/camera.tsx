import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Dimensions,
    Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { usePhotos } from '../../context/PhotoContext';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import { CameraTopControls, CameraTopControlsHandle } from '../../components/md/CameraTopControls';
import { CameraBottomControls } from '../../components/md/CameraBottomControls';
import { CustomRoomModal } from '../../components/md/CustomRoomModal';
import { ToastNotification } from '../../components/sm/ToastNotification';
import { GhostImageThumbnail } from '../../components/sm/GhostImageThumbnail';
import * as Location from 'expo-location';
import { setStatusBarStyle } from 'expo-status-bar';

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
    const hasAutoSelectedRef = useRef(false);
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const topControlsRef = useRef<CameraTopControlsHandle>(null);
    const [capturing, setCapturing] = useState(false);
    const [properties, setProperties] = useState<{ id: string; name: string; latitude?: number; longitude?: number }[]>([]);
    const [units, setUnits] = useState<{ id: string; unit_number: string }[]>([]);
    const [selectedProperty, setSelectedProperty] = useState<{ id: string; name: string; latitude?: number; longitude?: number } | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<{ id: string; unit_number: string } | null>(null);
    const { addPhoto } = usePhotos();

    const [rooms, setRooms] = useState<string[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<string>('');
    const [roomIdMap, setRoomIdMap] = useState<{ [label: string]: string }>({});
    const [showCustomRoomModal, setShowCustomRoomModal] = useState(false);
    const [customRoomText, setCustomRoomText] = useState('');
    const tapTargetRef = useRef<string | null>(null);
    const pendingUnitIdRef = useRef<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const params = useLocalSearchParams<{ phase?: string; unitId?: string; sessionId?: string }>();
    const [topControlsHeight, setTopControlsHeight] = useState(0);
    const [ghostGroups, setGhostGroups] = useState<{ id: string; room_id: string; imagePath: string }[]>([]);
    const [ghostMode, setGhostMode] = useState<'overlay' | 'thumbnail'>('overlay');
    
    // We'll derive phase/session info from database state instead of params for robustness
    const [activeSession, setActiveSession] = useState<{ id: string; phase: 'move_in' | 'move_out'; tenancy_id: string } | null>(null);

    useEffect(() => {
        // When unit changes, check for active session
        if (selectedUnit) {
            fetchActiveSession(selectedUnit.id);
        } else {
            setActiveSession(null);
        }
    }, [selectedUnit]);
    
    // Also check if sessionId param is passed directly (optional override)
    useEffect(() => {
        if (params.sessionId) {
            fetchSessionAndSetContext(params.sessionId);
        }
    }, [params.sessionId]);

    async function fetchSessionAndSetContext(sessionId: string) {
        try {
            const { data: session, error } = await supabase
                .from('sessions')
                .select(`
                    id,
                    phase,
                    tenancy_id,
                    tenancies (
                        unit_id,
                        units (
                            id,
                            unit_number,
                            property_id,
                            properties (
                                id,
                                name,
                                latitude,
                                longitude
                            )
                        )
                    )
                `)
                .eq('id', sessionId)
                .single();

            if (error || !session) return;

            // @ts-ignore - complex nested join type
            let unitData = session.tenancies?.units;
            if (Array.isArray(unitData)) unitData = unitData[0];

            // @ts-ignore
            let propertyData = unitData?.properties;
            if (Array.isArray(propertyData)) propertyData = propertyData[0];

            if (unitData && propertyData) {
                // Set pending unit ID to prevent fetchUnits from clearing it
                pendingUnitIdRef.current = unitData.id;

                // Set property first
                setSelectedProperty({
                    id: propertyData.id,
                    name: propertyData.name,
                    latitude: propertyData.latitude,
                    longitude: propertyData.longitude
                });

                // Then unit (need to make sure units are fetched or we set it manually)
                // Since we have the ID and number, we can set it directly
                setSelectedUnit({
                    id: unitData.id,
                    unit_number: unitData.unit_number
                });

                // Active session state will be updated by the useEffect listening to selectedUnit
                // but we can also set it here to be snappy
                setActiveSession({
                    id: session.id,
                    phase: session.phase as 'move_in' | 'move_out',
                    tenancy_id: session.tenancy_id!
                });
            }
        } catch (e) {
            console.error('Error fetching session context:', e);
        }
    }

    const fetchGhostGroups = useCallback(async (tenancyId: string) => {
        try {
            const { data, error } = await supabase
                .from('groups')
                .select(`
                    id,
                    room_id,
                    images (
                        path,
                        session:sessions (
                            phase
                        )
                    )
                `)
                .eq('tenancy_id', tenancyId);

            if (error) throw error;

            // Filter client-side
            // We want groups that have a 'move_in' image but NO 'move_out' image.
            const ghosts = (data || []).filter((g: any) => {
                const images = g.images || [];
                const hasMoveIn = images.some((img: any) => img.session?.phase === 'move_in');
                const hasMoveOut = images.some((img: any) => img.session?.phase === 'move_out');
                return hasMoveIn && !hasMoveOut;
            }).map((g: any) => {
                // Get the move-in image to display
                const moveInImage = g.images.find((img: any) => img.session?.phase === 'move_in');
                return {
                    id: g.id,
                    room_id: g.room_id,
                    imagePath: moveInImage?.path
                };
            });

            setGhostGroups(ghosts);
        } catch (e) {
            console.error('Error fetching ghost groups:', e);
        }
    }, []);

    useEffect(() => {
        if (activeSession?.phase === 'move_out' && activeSession.tenancy_id) {
            fetchGhostGroups(activeSession.tenancy_id);
        } else {
            setGhostGroups([]);
        }
    }, [activeSession, fetchGhostGroups]);

    const fetchActiveSession = useCallback(async (unitId: string) => {
        try {
            // Find active tenancy for unit
            const { data: tenancies } = await supabase
                .from('tenancies')
                .select('id')
                .eq('unit_id', unitId);
            
            if (!tenancies || tenancies.length === 0) {
                setActiveSession(null);
                return;
            }
            
            const tenancyIds = tenancies.map(t => t.id);

            // Find in-progress session
            const { data: session } = await supabase
                .from('sessions')
                .select(`
                    id, 
                    phase, 
                    tenancy_id,
                    tenancies (
                        unit_id,
                        units (
                            id,
                            unit_number,
                            property_id,
                            properties (
                                id,
                                name,
                                latitude,
                                longitude
                            )
                        )
                    )
                `)
                .in('tenancy_id', tenancyIds)
                .eq('status', 'in_progress')
                .maybeSingle();

            if (session) {
                setActiveSession({
                    id: session.id,
                    phase: session.phase as 'move_in' | 'move_out',
                    tenancy_id: session.tenancy_id!
                });

                // If explicitly passed via navigation or simply on load, we might want to sync state
                // But if the user manually navigated to camera and we found a session, we should probably select it
                // However, the `unitId` argument comes from `selectedUnit`, so we're already looking at that unit.
                // The only case to handle is setting property/unit if `fetchActiveSession` was called with an ID 
                // that ISN'T currently selected (e.g. from params).
                
            } else {
                setActiveSession(null);
            }
        } catch (err) {
            console.error('Error fetching active session:', err);
            setActiveSession(null);
        }
    }, []);

    useEffect(() => {
        if (showCustomRoomModal) {
            topControlsRef.current?.closeDropdowns();
        }
    }, [showCustomRoomModal]);

    const ITEM_WIDTH = 110;

    const fetchProperties = useCallback(async () => {
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

                if (params.sessionId) {
                    hasAutoSelectedRef.current = true;
                    return; 
                }

                if (!hasAutoSelectedRef.current) {
                    hasAutoSelectedRef.current = true;
                    
                    let bestProperty = data.length > 0 ? data[0] : null;

                    try {
                        const { status } = await Location.requestForegroundPermissionsAsync();
                        if (status === 'granted') {
                            const location = await Location.getCurrentPositionAsync({});
                            const { latitude, longitude } = location.coords;

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
                                        bestProperty = property;
                                    }
                                }
                            });
                        }
                    } catch (locError) {
                        console.error('Error getting location:', locError);
                    }

                    if (bestProperty) {
                        setSelectedProperty(bestProperty);
                    }
                }
            }
        } catch (e) {
            console.error('Error fetching properties:', e);
        }
    }, [params.sessionId]);

    useFocusEffect(
        useCallback(() => {
            setStatusBarStyle('light');
            fetchProperties();
            // Re-check active session when screen is focused (e.g. after deleting a session)
            if (selectedUnit) {
                fetchActiveSession(selectedUnit.id);
            }
        }, [selectedUnit, fetchProperties, fetchActiveSession]) // Add selectedUnit as dependency to re-run if it changes or on focus
    );

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

    const handleToggleGhostMode = useCallback(() => {
        setGhostMode(prev => prev === 'overlay' ? 'thumbnail' : 'overlay');
    }, []);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
    };

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
                
                const pendingId = pendingUnitIdRef.current;
                const foundUnit = pendingId ? data.find(u => u.id === pendingId) : null;
                
                if (foundUnit) {
                    setSelectedUnit(foundUnit);
                    pendingUnitIdRef.current = null;
                } else {
                    setSelectedUnit(null);
                }
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

    async function getTenancyId(unitId: string) {
        try {
            const now = new Date();
            const { data: tenancies, error } = await supabase
                .from('tenancies')
                .select('id, lease_start_date, move_out_date')
                .eq('unit_id', unitId)
                .order('lease_start_date', { ascending: true });

            if (error) throw error;

            if (!tenancies || tenancies.length === 0) {
                return null;
            }

            // 1. Active tenancy
            const activeTenancy = tenancies.find(t => {
                const start = new Date(t.lease_start_date);
                const end = t.move_out_date ? new Date(t.move_out_date) : new Date('9999-12-31');
                return now >= start && now <= end;
            });
            if (activeTenancy) return activeTenancy.id;

            // 2. Upcoming tenancy
            const upcomingTenancy = tenancies.find(t => new Date(t.lease_start_date) > now);
            if (upcomingTenancy) return upcomingTenancy.id;

            // 3. Recent past tenancy (within 14 days)
            const pastTenancy = tenancies[tenancies.length - 1];
            if (pastTenancy) {
                const end = pastTenancy.move_out_date ? new Date(pastTenancy.move_out_date) : new Date(pastTenancy.lease_start_date);
                const daysSinceEnd = (now.getTime() - end.getTime()) / (1000 * 3600 * 24);
                if (daysSinceEnd <= 14) return pastTenancy.id;
            }

            return null;

        } catch (e) {
            console.error('Error determining context:', e);
            return null;
        }
    }

    const handleAddCustomRoom = async () => {
        if (!customRoomText.trim() || !selectedUnit) return;

        const normalizedNewRoom = customRoomText.trim().toLowerCase();
        if (rooms.some(r => r.toLowerCase() === normalizedNewRoom)) {
            showToast('Room already exists!', 'error');
            setCustomRoomText('');
            setShowCustomRoomModal(false);
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
                <TouchableOpacity onPress={requestPermission} className="bg-blue-500 py-3 rounded-lg">
                    <Text className="text-white text-center font-semibold">Grant permission</Text>
                </TouchableOpacity>
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

        if (!activeSession) {
            showToast('Start a session in dashboard to take photos!', 'error');
            return;
        }

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

                const tenancyId = await getTenancyId(selectedUnit.id);
                const roomId = roomIdMap[selectedRoom];

                // 1. Create Group OR Use Existing (for Move-out ghost matching)
                // Check if we have a targeted ghost group to fill
                const targetGhostGroup = ghostGroups.find(g => g.room_id === roomId);
                
                let groupId = targetGhostGroup?.id;

                if (!groupId) {
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
                    groupId = group.id;
                }

                // 2. Create Image (link session if active)
                const { error: dbError } = await supabase
                    .from('images')
                    .insert({
                        path: storagePath,
                        group_id: groupId,
                        mime_type: 'image/jpeg',
                        session_id: activeSession?.id
                    });

                if (dbError) {
                    console.error('Error saving image metadata:', dbError);
                    showToast('Failed to save image metadata', 'error');
                } else {
                    console.log('Image metadata saved to database');
                    showToast('Photo saved!', 'success');
                    
                    // If we filled a ghost group, refresh the list so the overlay disappears
                    if (targetGhostGroup && activeSession?.tenancy_id) {
                        fetchGhostGroups(activeSession.tenancy_id);
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

    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;

    // iphone 16 pro max is 956
    // iphone 14 plus is 926
    // iphone 16 pro is 874
    // iphone 16 is 852
    // console.log('screenHeight', screenHeight);
    
    const isIOS = Platform.OS === 'ios';
    const liquidAvailable = isIOS && isLiquidGlassAvailable();
    
    const bottomMargin = liquidAvailable ? 134 : 131;
    const captureButtonHeight = 75;
    const bottomControlsTotalHeight = bottomMargin + captureButtonHeight;

    const camHeight = screenWidth * (4 / 3);
    
    const effectiveTopHeight = topControlsHeight || 100;
    
    const excessHeight = screenHeight - camHeight - effectiveTopHeight - bottomControlsTotalHeight;
    
    const topOverlayHeight = effectiveTopHeight + (excessHeight / 2);

    const currentGhostGroup = selectedRoom ? ghostGroups.find(g => g.room_id === roomIdMap[selectedRoom]) : null;
    const ghostImageUrl = currentGhostGroup?.imagePath 
        ? supabase.storage.from('unit-images').getPublicUrl(currentGhostGroup.imagePath).data.publicUrl 
        : null;

    return (
        <View className="flex-1 bg-black">
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} />
            
            {ghostImageUrl && (
                ghostMode === 'overlay' ? (
                    <Image
                        source={{ uri: ghostImageUrl }}
                        style={{
                            position: 'absolute',
                            top: topOverlayHeight,
                            width: screenWidth,
                            height: camHeight,
                            opacity: 0.3,
                            zIndex: 5
                        }}
                        contentFit="cover"
                    />
                ) : (
                    <GhostImageThumbnail
                        imageUrl={ghostImageUrl}
                        onPress={handleToggleGhostMode}
                        top={topOverlayHeight + 16}
                        left={16}
                        width={screenWidth * 0.3}
                        height={(screenWidth * 0.3) * (4/3)}
                    />
                )
            )}

            {/* Overlays to create 4:3 visual mask - HIGH Z-INDEX to cover ghost image */}
            <View className="flex-1 w-full z-10" pointerEvents="none">
                <View 
                    style={{ 
                        height: topOverlayHeight, 
                        backgroundColor: 'rgba(0, 0, 0, 0.75)' 
                    }} 
                />
                <View 
                    style={{ 
                        width: screenWidth, 
                        height: camHeight,
                        backgroundColor: 'transparent' 
                    }} 
                />
                <View 
                    style={{ 
                        flex: 1,
                        backgroundColor: 'rgba(0, 0, 0, 0.75)'
                    }} 
                />
            </View>

            {/* Controls Layer */}
            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                <CameraTopControls
                    ref={topControlsRef}
                    onLayout={(e) => setTopControlsHeight(e.nativeEvent.layout.height)}
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
                    activeSessionPhase={activeSession?.phase}
                    ghostMode={ghostImageUrl ? ghostMode : undefined}
                    onToggleGhostMode={ghostImageUrl ? handleToggleGhostMode : undefined}
                />
            </View>

            <CustomRoomModal
                visible={showCustomRoomModal}
                roomText={customRoomText}
                onChangeText={setCustomRoomText}
                onCancel={() => setShowCustomRoomModal(false)}
                onSubmit={handleAddCustomRoom}
            />

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
