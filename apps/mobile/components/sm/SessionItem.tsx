import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SessionRow, SessionPhase, SessionStatus } from '../../types';

interface SessionItemProps {
    item: SessionRow;
    onPress: (item: SessionRow) => void;
}

export function SessionItem({ item, onPress }: SessionItemProps) {
    const isInProgress = item.status === 'in_progress';

    const phaseLabel = (phase: SessionPhase) => {
        switch (phase) {
            case 'move_in':
                return 'Move-in';
            case 'move_out':
                return 'Move-out';
            case 'repair':
                return 'Repair';
            default:
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

    return (
        <TouchableOpacity
            className="mb-3 mx-4 rounded-xl bg-white border border-gray-200 px-4 py-3"
            onPress={() => onPress(item)}
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
                {item.tenancies?.units?.properties
                    ? `${item.tenancies.units.properties.name} · Unit ${item.tenancies.units.unit_number}`
                    : item.tenancies?.unit_id
                        ? `Unit ${item.tenancies.unit_id.slice(0, 8)}`
                        : 'No unit linked'}
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

            {isInProgress && (
                <View className="mt-2 flex-row items-center">
                    <Ionicons
                        name="ellipse"
                        size={8}
                        color="#22c55e"
                    />
                    <Text className="ml-1 text-[11px] text-emerald-600">
                        In-progress session
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

