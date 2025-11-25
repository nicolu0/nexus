import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

type SessionStatus = 'in_progress' | 'completed' | 'abandoned' | string;
type SessionPhase = string;

type SessionRow = {
    id: string;
    unit_id: string;
    tenancy_id: string | null;
    phase: SessionPhase;
    status: SessionStatus;
    notes: string | null;
    started_at: string;
    completed_at: string | null;
    last_activity_at: string;
};

type Filter = 'all' | 'in_progress' | 'completed';

export default function SessionsScreen() {
    const [sessions, setSessions] = useState<SessionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<Filter>('all');
    const [error, setError] = useState<string | null>(null);

    const phaseLabel = (phase: SessionPhase) => {
        switch (phase) {
            case 'move_in':
                return 'Move-in';
            case 'move_out_before':
                return 'Move-out (Pre-repairs)';
            case 'move_out_after':
                return 'Move-out (Post-repairs)';
            default:
                // Fallback: capitalize + replace underscores
                return phase
                    .replace(/_/g, ' ')
                    .replace(/^\w/, c => c.toUpperCase());
        }
    };

    const statusLabel = (status: SessionStatus) => {
        switch (status) {
            case 'in_progress':
                return 'In progress';
            case 'completed':
                return 'Completed';
            case 'abandoned':
                return 'Abandoned';
            default:
                return status;
        }
    };

    const formatDateTime = (iso: string | null) => {
        if (!iso) return '—';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '—';
        return d.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    const loadSessions = useCallback(async () => {
        setError(null);
        try {
            const { data, error } = await supabase
                .from('sessions')
                .select('*')
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

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadSessions();
        setRefreshing(false);
    }, [loadSessions]);

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

    const renderSessionItem = ({ item }: { item: SessionRow }) => {
        const isInProgress = item.status === 'in_progress';

        return (
            <TouchableOpacity
                className="mb-3 mx-4 rounded-xl bg-white border border-stone-200 shadow-sm px-4 py-3"
                onPress={() => {
                    // TODO: navigate into this session to resume / view details
                    console.log('Tapped session', item.id);
                }}
            >
                {/* First row: phase + status pill */}
                <View className="flex-row justify-between items-center mb-1">
                    <View className="flex-row items-center">
                        <Ionicons name="albums-outline" size={16} color="#4b5563" />
                        <Text className="ml-1.5 text-sm font-semibold text-stone-800">
                            {phaseLabel(item.phase)}
                        </Text>
                    </View>

                    <View
                        className={`px-2 py-0.5 rounded-full ${item.status === 'completed'
                                ? 'bg-emerald-100'
                                : item.status === 'abandoned'
                                    ? 'bg-rose-100'
                                    : 'bg-amber-100'
                            }`}
                    >
                        <Text
                            className={`text-[11px] font-semibold ${item.status === 'completed'
                                    ? 'text-emerald-700'
                                    : item.status === 'abandoned'
                                        ? 'text-rose-700'
                                        : 'text-amber-700'
                                }`}
                        >
                            {statusLabel(item.status)}
                        </Text>
                    </View>
                </View>

                {/* Second row: basic unit / tenancy hint */}
                <Text className="text-xs text-stone-500 mb-1">
                    Unit {item.unit_id.slice(0, 8)}
                    {item.tenancy_id
                        ? ` · Tenancy ${item.tenancy_id.slice(0, 6)}…`
                        : ' · No tenancy linked'}
                </Text>

                {/* Third row: timing info */}
                <View className="flex-row justify-between items-center mt-1">
                    <Text className="text-[11px] text-stone-500">
                        Started {formatDateTime(item.started_at)}
                    </Text>
                    <Text className="text-[11px] text-stone-400">
                        Last activity {formatDateTime(item.last_activity_at)}
                    </Text>
                </View>

                {item.notes && (
                    <Text
                        numberOfLines={2}
                        className="mt-2 text-xs text-stone-600"
                    >
                        {item.notes}
                    </Text>
                )}

                {isInProgress && (
                    <View className="mt-2 flex-row items-center">
                        <Ionicons
                            name="ellipse"
                            size={8}
                            color="#22c55e"
                        />
                        <Text className="ml-1 text-[11px] text-emerald-600">
                            In-progress session — tap to resume
                        </Text>
                    </View>
                )}
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
            <SafeAreaView className="flex-1">
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
                {filteredSessions.length === 0 ? (
                    <View className="flex-1 justify-center items-center px-8">
                        <Text className="text-sm font-medium text-stone-700 mb-1">
                            No sessions yet
                        </Text>
                        <Text className="text-xs text-stone-500 text-center">
                            Start taking photos from the camera screen to create your
                            first session. We&apos;ll track each run here.
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredSessions}
                        keyExtractor={(item) => item.id}
                        renderItem={renderSessionItem}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        }
                        contentContainerStyle={{ paddingBottom: 16 }}
                    />
                )}
            </SafeAreaView>
        </View>
    );
}
