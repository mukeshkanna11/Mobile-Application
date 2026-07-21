import { Feather } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import type { Activity } from '@/services/dashboard';

type FeatherName = keyof typeof Feather.glyphMap;

const ICON_BY_TYPE: Record<string, FeatherName> = {
  Call: 'phone',
  Email: 'mail',
  Meeting: 'users',
  Task: 'check-square',
};

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Single line in the "Recent Activities" feed.
 */
export default function ActivityRow({ activity }: { activity: Activity }) {
  const icon = ICON_BY_TYPE[activity.type ?? ''] ?? 'activity';

  return (
    <View className="flex-row items-center gap-3 py-3">
      <View
        className={`h-9 w-9 items-center justify-center rounded-full ${
          activity.done ? 'bg-green-100' : 'bg-indigo-100'
        }`}
      >
        <Feather
          name={icon}
          size={16}
          color={activity.done ? '#16a34a' : '#4f46e5'}
        />
      </View>

      <View className="flex-1">
        <Text className="text-sm font-medium text-slate-800" numberOfLines={1}>
          {activity.type ?? 'Activity'}
          {activity.notes ? ` · ${activity.notes}` : ''}
        </Text>
        <Text className="text-xs text-slate-400">
          {activity.assignedTo?.name ?? 'Unassigned'}
          {formatDate(activity.createdAt)
            ? ` • ${formatDate(activity.createdAt)}`
            : ''}
        </Text>
      </View>

      {activity.done && (
        <Feather name="check-circle" size={16} color="#16a34a" />
      )}
    </View>
  );
}
