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
    const flatListRef = useRef<FlatList>(null);
    const [capturing, setCapturing] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showPropertyMenu, setShowPropertyMenu] = useState(false);
    const [showUnitMenu, setShowUnitMenu] = useState(false);
    const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);
    const [units, setUnits] = useState<{ id: string; unit_number: string }[]>([]);
    const [selectedProperty, setSelectedProperty] = useState<{ id: string; name: string } | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<{ id: string; unit_number: string } | null>(null);
    const { photos, addPhoto } = usePhotos();

    const [sections, setSections] = useState<string[]>([]);
    const [selectedSection, setSelectedSection] = useState<string>('');
    const [sectionIdMap, setSectionIdMap] = useState<{ [label: string]: string }>({});
    const [showCustomSectionModal, setShowCustomSectionModal] = useState(false);
    const [customSectionText, setCustomSectionText] = useState('');
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
            fetchUnitSections(selectedUnit.id);
        } else {
            setSections([]);
            setSelectedSection('');
        }
    }, [selectedUnit]);

    React.useEffect(() => {
        if (selectedSection) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, [selectedSection]);

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
                setSelectedUnit(null);
            }
        } catch (e) {
            console.error('Error fetching units:', e);
        }
    }

    async function fetchUnitSections(unitId: string) {
        try {
            const { data, error } = await supabase
                .from('unit_sections')
                .select('id, label')
                .eq('unit_id', unitId)
                .order('label');

            if (error) throw error;

            if (data && data.length > 0) {
                const sectionLabels = data.map(s => s.label);
                const idMap = data.reduce((acc, s) => {
                    acc[s.label] = s.id;
                    return acc;
                }, {} as { [label: string]: string });

                setSections(sectionLabels);
                setSectionIdMap(idMap);
                setSelectedSection(sectionLabels[0]);
            } else {
                setSections([]);
                setSectionIdMap({});
                setSelectedSection('');
            }
        } catch (e) {
            console.error('Error fetching unit sections:', e);
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
                return existingSession.id;
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
            return newSession.id;

        } catch (e) {
            console.error('Error managing session:', e);
            throw e;
        }
    }

    const handleAddCustomSection = async () => {
        if (!customSectionText.trim() || !selectedUnit) return;

        const label = customSectionText.trim().charAt(0).toUpperCase() + customSectionText.trim().slice(1);

        try {
            const { data, error } = await supabase
                .from('unit_sections')
                .insert({
                    unit_id: selectedUnit.id,
                    label: label,
                    kind: 'custom'
                })
                .select('id, label')
                .single();

            if (error) throw error;

            setSections([...sections, label]);
            setSectionIdMap({ ...sectionIdMap, [label]: data.id });
            setSelectedSection(label);
            setCustomSectionText('');
            setShowCustomSectionModal(false);
        } catch (e) {
            console.error('Error adding custom section:', e);
            Alert.alert('Error', 'Failed to add custom section');
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
                    const sessionId = await getOrCreateSession(selectedUnit.id, user.id);
                    const sectionId = sectionIdMap[selectedSection];

                    const { error: dbError } = await supabase
                        .from('images')
                        .insert({
                            created_by: user.id,
                            path: storagePath,
                            bucket: 'unit-images',
                            section_id: sectionId,
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
                                className="flex-row items-center bg-stone-900/80 backdrop-blur-md rounded-full px-4 py-2 border border-white/20"
                            >
                                <Text className="text-white font-medium mr-1 max-w-[120px]" numberOfLines={1}>
                                    {selectedProperty?.name || 'Select Property'}
                                </Text>
                                <Ionicons name="chevron-down" size={16} color="white" />
                            </TouchableOpacity>

                            {showPropertyMenu && (
                                <View className="absolute top-full mt-2 left-0 w-full z-40">
                                    <View className="bg-stone-900/80 backdrop-blur-md rounded-xl border border-white/20 py-2 w-full max-h-60">
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
                                className={`flex-row items-center bg-stone-900/80 backdrop-blur-md rounded-full px-4 py-2 border border-white/20 ${!selectedProperty ? 'opacity-50' : ''}`}
                            >
                                <Text className="text-white font-medium mr-1 max-w-[80px]" numberOfLines={1}>
                                    {selectedUnit?.unit_number || 'Unit'}
                                </Text>
                                <Ionicons name="chevron-down" size={16} color="white" />
                            </TouchableOpacity>

                            {showUnitMenu && (
                                <View className="absolute top-full mt-2 left-0 w-full z-40">
                                    <View className="bg-stone-900/80 backdrop-blur-md rounded-xl border border-white/20 py-2 w-full max-h-60">
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
                            className="w-10 h-10 bg-black/60 rounded-full justify-center items-center backdrop-blur-md border border-white/20"
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

            {/* Capture Button Overlay */}
            <View className="absolute bottom-0 left-0 right-0 mb-20 items-center z-20" pointerEvents="box-none">
                <TouchableOpacity
                    disabled={capturing}
                    onPress={takePicture}
                    className="w-[80px] h-[80px] rounded-full bg-white/30 justify-center items-center border-2 border-white/10"
                >
                    <View className="w-[67px] h-[67px] rounded-full bg-white" />
                </TouchableOpacity>
            </View>

            {/* Section Selector */}
            <View className="absolute bottom-0 left-0 right-0 h-12 z-20 mb-3">
                <LinearGradient
                    colors={['rgba(0,0,0,0.8)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="absolute left-0 top-0 bottom-0 w-16 z-10"
                    pointerEvents="none"
                />
                <FlatList
                    ref={flatListRef}
                    data={[...sections, '+ Custom']}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    snapToAlignment="start"
                    snapToInterval={ITEM_WIDTH}
                    decelerationRate="fast"
                    disableIntervalMomentum={true}
                    contentContainerStyle={{ paddingHorizontal: (Dimensions.get('window').width - ITEM_WIDTH) / 2 }}
                    keyExtractor={(item: string) => item}
                    viewabilityConfig={{
                        itemVisiblePercentThreshold: 50
                    }}
                    onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
                        if (tapTargetRef.current) return;

                        const index = Math.round(event.nativeEvent.contentOffset.x / ITEM_WIDTH);
                        const item = [...sections, '+ Custom'][index];
                        if (item && item !== '+ Custom' && item !== selectedSection) {
                            setSelectedSection(item);
                        }
                    }}
                    scrollEventThrottle={16}
                    onMomentumScrollEnd={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
                        if (tapTargetRef.current) {
                            const target = tapTargetRef.current;
                            tapTargetRef.current = null;
                            if (target !== '+ Custom') {
                                setSelectedSection(target);
                            }
                        } else {
                            const index = Math.round(event.nativeEvent.contentOffset.x / ITEM_WIDTH);
                            const item = [...sections, '+ Custom'][index];
                            if (item && item !== '+ Custom') {
                                setSelectedSection(item);
                            }
                        }
                    }}
                    renderItem={({ item, index }: { item: string, index: number }) => (
                        <TouchableOpacity
                            onPress={() => {
                                if (item === '+ Custom') {
                                    setShowCustomSectionModal(true);
                                } else {
                                    tapTargetRef.current = item;
                                    flatListRef.current?.scrollToOffset({ offset: index * ITEM_WIDTH, animated: true });
                                }
                            }}
                            style={{ width: ITEM_WIDTH, zIndex: selectedSection === item ? 50 : 1 }}
                            className="justify-center items-center h-full"
                        >
                            <View
                                style={{
                                    position: 'absolute',
                                    minWidth: ITEM_WIDTH,
                                    height: 34,
                                }}
                                className={`px-4 rounded-full items-center justify-center overflow-hidden ${selectedSection === item && item !== '+ Custom'
                                    ? 'bg-stone-900/80 border border-white/30'
                                    : ''
                                    }`}
                            >
                                <Text
                                    numberOfLines={1}
                                    className={`text-base font-medium ${selectedSection === item
                                        ? 'text-white'
                                        : 'text-white/60'
                                        }`}
                                >
                                    {item}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}
                />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="absolute right-0 top-0 bottom-0 w-16 z-10"
                    pointerEvents="none"
                />
            </View>

            {/* Custom Section Modal */}
            <Modal
                visible={showCustomSectionModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowCustomSectionModal(false)}
            >
                <View className="flex-1 bg-black/80 justify-center items-center px-6">
                    <View className="bg-stone-900 w-full rounded-2xl p-6 border border-white/10">
                        <Text className="text-white text-xl font-bold mb-4">Add Custom Section</Text>
                        <TextInput
                            className="bg-stone-800 text-white p-4 rounded-xl mb-4 text-lg"
                            placeholder="Section Name"
                            placeholderTextColor="#666"
                            value={customSectionText}
                            onChangeText={setCustomSectionText}
                            autoFocus
                        />
                        <View className="flex-row gap-4">
                            <TouchableOpacity
                                onPress={() => setShowCustomSectionModal(false)}
                                className="flex-1 bg-stone-800 p-4 rounded-xl items-center"
                            >
                                <Text className="text-white font-semibold">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleAddCustomSection}
                                className="flex-1 bg-white p-4 rounded-xl items-center"
                            >
                                <Text className="text-black font-semibold">Add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View >
    );
}
