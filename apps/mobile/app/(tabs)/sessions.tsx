import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { setStatusBarStyle } from 'expo-status-bar';
import { SessionSidePanel } from '../../components/lg/SessionSidePanel';
import { SessionList } from '../../components/md/SessionList';
import { SessionRow, SessionPhase } from '../../types';

type Filter = 'all' | 'in_progress' | 'completed';

export default function SessionsScreen() {
    const [sessions, setSessions] = useState<SessionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<Filter>('all');
    const [error, setError] = useState<string | null>(null);

    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [selectedSession, setSelectedSession] = useState<SessionRow | null>(null);
    const [sessionRoomFilter, setSessionRoomFilter] = useState<string | null>(null);
    const [sessionImages, setSessionImages] = useState<{ id: string; path: string; created_at: string; groups: { id: string; name: string; room_id: string } | null }[]>([]);
    const [loadingImages, setLoadingImages] = useState(false);
    const [unitRooms, setUnitRooms] = useState<{ id: string; name: string }[]>([]);

    const phaseLabel = (phase: SessionPhase) => {
        switch (phase) {
            case 'move_in':
                return 'Move-in';
            case 'move_out':
                return 'Move-out';
            case 'repair':
                return 'Repair';
            default:
                // Fallback: capitalize + replace underscores
                return phase
                    .replace(/_/g, ' ')
                    .replace(/^\w/, c => c.toUpperCase());
        }
    };

    const loadSessions = useCallback(async () => {
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setSessions([]);
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('sessions')
                .select(`
                    *,
                    tenancies (
                        id,
                        unit_id,
                        units (
                            unit_number,
                            properties (
                                name,
                                address_line1
                            )
                        )
                    )
                `)
                .eq('created_by', user.id)
                .order('last_activity_at', { ascending: false });

            if (error) throw error;
            setSessions(data || []);
        } catch (e: any) {
            console.error('Error loading sessions:', e);
            setError(e.message ?? 'Failed to load sessions');
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            setStatusBarStyle('dark');
            loadSessions();
        }, [loadSessions])
    );

    const fetchSessionImages = async (sessionId: string) => {
        setLoadingImages(true);
        try {
            // Fetch images directly from images table using session_id
            const { data, error } = await supabase
                .from('images')
                .select(`
                    id, 
                    path,
                    created_at,
                    groups (
                        id,
                        name,
                        room_id
                    )
                `)
                .eq('session_id', sessionId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // @ts-ignore - join types
            setSessionImages(data || []);
        } catch (e) {
            console.error('Error fetching session images:', e);
        } finally {
            setLoadingImages(false);
        }
    };

    const fetchUnitRooms = async (unitId: string) => {
        try {
            const { data, error } = await supabase
                .from('rooms')
                .select('id, name')
                .eq('unit_id', unitId)
                .order('name');
            
            if (error) throw error;
            setUnitRooms(data || []);
        } catch (e) {
            console.error('Error fetching unit rooms:', e);
        }
    };

    const openSession = (session: SessionRow) => {
        setSelectedSession(session);
        setSessionRoomFilter(null);
        fetchSessionImages(session.id);
        if (session.tenancies?.unit_id) {
            fetchUnitRooms(session.tenancies.unit_id);
        } else if (session.unit_id) {
             fetchUnitRooms(session.unit_id);
        }
    };

    const closeSession = () => {
        setSelectedSession(null);
        setSessionImages([]);
        setSessionRoomFilter(null);
        setUnitRooms([]);
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadSessions();
        setRefreshing(false);
    }, [loadSessions]);

    const handleUpdateImage = async (imageId: string, newRoomId: string, newRoomName: string) => {
        try {
            // Update the group associated with the image
            // Since we are doing 1-to-1 group per image logic currently, we can update the group.
            // However, better to just create a new group or check if one exists?
            // Simpler: Update the image's group.
            
            // First find the image to get its group_id
            const image = sessionImages.find(img => img.id === imageId);
            if (!image || !image.groups) return;

            const groupId = image.groups.id;

            // Update the group
            const { error } = await supabase
                .from('groups')
                .update({ 
                    name: newRoomName,
                    room_id: newRoomId 
                })
                .eq('id', groupId);

            if (error) throw error;

            // Update local state
            setSessionImages(prev => prev.map(img => {
                if (img.id === imageId) {
                    return {
                        ...img,
                        groups: {
                            ...img.groups!,
                            name: newRoomName,
                            room_id: newRoomId
                        }
                    };
                }
                return img;
            }));

        } catch (e) {
            console.error('Error updating image:', e);
            alert('Failed to update image tag');
        }
    };

    const handleDeleteImage = async (imageId: string) => {
        try {
            // If move-in session, identifying the group to delete
            let groupIdToDelete: string | undefined;
            if (selectedSession?.phase === 'move_in') {
                const image = sessionImages.find(img => img.id === imageId);
                if (image?.groups?.id) {
                    groupIdToDelete = image.groups.id;
                }
            }

            // Delete the image
            const { error } = await supabase
                .from('images')
                .delete()
                .eq('id', imageId);

            if (error) throw error;

            // If move-in session, also delete the group
            if (groupIdToDelete) {
                const { error: groupError } = await supabase
                    .from('groups')
                    .delete()
                    .eq('id', groupIdToDelete);
                
                if (groupError) {
                    console.error('Error deleting group:', groupError);
                }
            }

            // Update local state
            setSessionImages(prev => prev.filter(img => img.id !== imageId));
        } catch (e) {
            console.error('Error deleting image:', e);
            alert('Failed to delete image');
        }
    };

    const handleEndSession = async () => {
        if (!selectedSession) return;

        try {
            const { error } = await supabase
                .from('sessions')
                .update({ 
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                    last_activity_at: new Date().toISOString() 
                })
                .eq('id', selectedSession.id);

            if (error) throw error;

            // Close the panel and refresh list
            closeSession();
            await loadSessions();
        } catch (e) {
            console.error('Error ending session:', e);
            alert('Failed to end session');
        }
    };

    const handleStartMoveOut = async () => {
        if (!selectedSession) return;

        try {
            // Check if there's already an in-progress session for this unit (regardless of phase for now, or specifically move-out?)
            // User requirement: "If an in-progress session exists for that unit, make sure not to display the button." 
            // But here we are starting a NEW session.
            
            // Create new session
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('sessions')
                .insert({
                    tenancy_id: selectedSession.tenancies?.id, // Assuming tenancy is still valid?
                    phase: 'move_out',
                    status: 'in_progress',
                    created_by: user.id
                })
                .select()
                .single();

            if (error) throw error;

            if (data) {
                // Close current session panel
                closeSession();
                // Navigate to camera with new session ID
                router.push({
                    pathname: '/camera',
                    params: { sessionId: data.id }
                });
            }

        } catch (e) {
            console.error('Error starting move-out session:', e);
            alert('Failed to start move-out session');
        }
    };

    const filteredSessions = sessions.filter((s) => {
        if (filter === 'all') return true;
        if (filter === 'in_progress') return s.status === 'in_progress';
        if (filter === 'completed') return s.status === 'completed';
        return true;
    });

    const renderFilterChip = (value: Filter, label: string) => {
        const active = filter === value;
        return (
            <TouchableOpacity
                onPress={() => setFilter(value)}
                className={
                    active
                        ? 'px-3 py-1.5 rounded-full bg-black'
                        : 'px-3 py-1.5 rounded-full bg-stone-200'
                }
            >
                <Text
                    className={
                        active
                            ? 'text-xs font-semibold text-white'
                            : 'text-xs font-semibold text-stone-700'
                    }
                >
                    {label}
                </Text>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View className="flex-1 bg-stone-50">
                <SafeAreaView className="flex-1 justify-center items-center">
                    <ActivityIndicator size="small" />
                    <Text className="mt-2 text-sm text-stone-500">
                        Loading sessions…
                    </Text>
                </SafeAreaView>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-stone-50">
            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Header */}
                <View className="px-4 pt-3 pb-2">
                    <Text className="text-2xl font-bold text-stone-900">
                        Sessions
                    </Text>
                    <Text className="text-xs text-stone-500 mt-1">
                        Your photo runs across units and tenancies.
                    </Text>

                    {/* Filters */}
                    <View className="flex-row gap-2 mt-3">
                        {renderFilterChip('all', 'All')}
                        {renderFilterChip('in_progress', 'In progress')}
                        {renderFilterChip('completed', 'Completed')}
                    </View>
                </View>

                {/* Error state */}
                {error && (
                    <View className="px-4 pb-2">
                        <Text className="text-xs text-red-500">
                            {error}
                        </Text>
                    </View>
                )}

                {/* List */}
                <SessionList
                    sessions={filteredSessions}
                    onSessionPress={openSession}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 70 }}
                />

                {/* Session Images Side Panel (Replaces Modal) */}
                <SessionSidePanel
                    selectedSession={selectedSession}
                    onClose={closeSession}
                    loadingImages={loadingImages}
                    sessionImages={sessionImages}
                    sessionRoomFilter={sessionRoomFilter}
                    setSessionRoomFilter={setSessionRoomFilter}
                    phaseLabel={phaseLabel}
                    unitRooms={unitRooms}
                    onUpdateImage={handleUpdateImage}
                    onDeleteImage={handleDeleteImage}
                    onRefreshSessions={loadSessions}
                    onEndSession={handleEndSession}
                    onStartMoveOut={handleStartMoveOut}
                />
            </SafeAreaView>
        </View>
    );
}
