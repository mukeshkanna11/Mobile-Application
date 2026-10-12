import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

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
 *
 * Three-column layout: fixed avatar, flexible title/subtitle that truncates,
 * and a right-aligned timestamp column. Horizontal padding matches the card
 * header (px-5) so the whole feed shares one gutter.
 *
 * Pass `onToggleDone` to show a Complete / Completed toggle in the right
 * column; without it the row stays read-only (plain "Done" label).
 */
export default function ActivityRow({
  activity,
  onToggleDone,
  saving = false,
  disabled = false,
}: {
  activity: Activity;
  onToggleDone?: () => void;
  /** This row's update is in flight — shows a spinner. */
  saving?: boolean;
  /** Any update is in flight — blocks taps (prevents duplicate submissions). */
  disabled?: boolean;
}) {
  const icon = ICON_BY_TYPE[activity.type ?? ''] ?? 'activity';
  const date = formatDate(activity.createdAt);
  const assignee = activity.assignedTo?.name ?? 'Unassigned';
  const subtitle = activity.notes ? `${assignee} · ${activity.notes}` : assignee;

  return (
    <View className="flex-row items-center px-5 py-3.5">
      {/* AVATAR — fixed, never shrinks */}
      <View
        className={`h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          activity.done ? 'bg-green-100' : 'bg-indigo-100'
        }`}
      >
        <Feather
          name={icon}
          size={17}
          color={activity.done ? '#16a34a' : '#4f46e5'}
        />
      </View>

      {/* TITLE + SUBTITLE — takes the slack, truncates instead of pushing */}
      <View className="ml-3 min-w-0 flex-1">
        <Text
          className="text-sm font-semibold text-slate-800"
          numberOfLines={1}
        >
          {activity.type ?? 'Activity'}
        </Text>
        <Text className="mt-0.5 text-xs text-slate-500" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      {/* TIMESTAMP — right-aligned column */}
      <View className="ml-3 shrink-0 items-end">
        {date ? (
          <Text className="text-[11px] font-medium text-slate-400">{date}</Text>
        ) : null}
        {onToggleDone ? (
          <Pressable
            onPress={onToggleDone}
            disabled={disabled || saving}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityState={{ checked: Boolean(activity.done), busy: saving }}
            accessibilityLabel={activity.done ? 'Completed. Tap to reopen' : 'Mark as complete'}
            className={`mt-1.5 min-w-[92px] flex-row items-center justify-center rounded-full border px-2.5 py-1 active:opacity-80 ${
              activity.done ? 'border-green-200 bg-green-50' : 'border-indigo-200 bg-indigo-50'
            } ${disabled && !saving ? 'opacity-50' : ''}`}
          >
            {saving ? (
              <ActivityIndicator size="small" color={activity.done ? '#16a34a' : '#4f46e5'} />
            ) : (
              <>
                <Feather
                  name={activity.done ? 'check-circle' : 'circle'}
                  size={12}
                  color={activity.done ? '#16a34a' : '#4f46e5'}
                />
                <Text
                  className={`ml-1 text-[11px] font-semibold ${
                    activity.done ? 'text-green-700' : 'text-indigo-600'
                  }`}
                >
                  {activity.done ? 'Completed' : 'Complete'}
                </Text>
              </>
            )}
          </Pressable>
        ) : activity.done ? (
          <View className="mt-1 flex-row items-center">
            <Feather name="check-circle" size={12} color="#16a34a" />
            <Text className="ml-1 text-[10px] font-semibold text-green-600">
              Done
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
