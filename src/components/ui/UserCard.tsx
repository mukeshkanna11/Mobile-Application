import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View } from 'react-native';

import { formatDate, roleStyle, type User } from '@/services/users';

/**
 * Premium user card — the mobile replacement for a web Users table row.
 * Carries the same cells: avatar initial, name + email, role badge, status
 * pill with dot, created date, and the Edit / Delete row actions.
 */
export default function UserCard({
  user,
  onPress,
  onEdit,
  onDelete,
}: {
  user: User;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  // Web uses `u.name?.charAt(0).toUpperCase()` for the avatar.
  const initial = (user.name || '?').charAt(0).toUpperCase();
  const active = user.isActive !== false;
  const [roleBg, roleText] = roleStyle(user.role).split(' ');

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
    >
      <View className="flex-row items-center gap-3">
        {/* Gradient avatar / initials */}
        <LinearGradient
          colors={['#6366f1', '#7c3aed']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            height: 44,
            width: 44,
            borderRadius: 999,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text className="text-base font-bold text-white">{initial}</Text>
        </LinearGradient>

        {/* Identity */}
        <View className="flex-1">
          <Text
            className="text-base font-semibold text-slate-900"
            numberOfLines={1}
          >
            {user.name || 'Unnamed'}
          </Text>
          <Text className="text-xs text-slate-500" numberOfLines={1}>
            {user.email || '—'}
          </Text>
          {/* Web table's Department / Designation / Company columns */}
          {user.department || user.designation || user.company ? (
            <Text className="mt-0.5 text-xs text-slate-400" numberOfLines={1}>
              {[user.designation, user.department, user.company].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
        </View>

        <Feather name="chevron-right" size={18} color="#cbd5e1" />
      </View>

      {/* Meta row: role + status + created date */}
      <View className="mt-3 flex-row items-center gap-2">
        <View className={`rounded-full px-2.5 py-1 ${roleBg}`}>
          <Text className={`text-xs font-semibold ${roleText}`}>
            {user.role || 'unknown'}
          </Text>
        </View>

        <View
          className={`flex-row items-center gap-1.5 rounded-full px-2.5 py-1 ${
            active ? 'bg-green-100' : 'bg-red-100'
          }`}
        >
          <View
            className={`h-2 w-2 rounded-full ${
              active ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <Text
            className={`text-xs font-semibold ${
              active ? 'text-green-700' : 'text-red-700'
            }`}
          >
            {active ? 'Active' : 'Inactive'}
          </Text>
        </View>

        <View className="flex-1" />

        <View className="flex-row items-center gap-1">
          <Feather name="calendar" size={12} color="#94a3b8" />
          <Text className="text-xs text-slate-500">
            {formatDate(user.createdAt)}
          </Text>
        </View>
      </View>

      {/* Row actions (web table Edit / Trash2 buttons) */}
      {(onEdit || onDelete) && (
        <View className="mt-3 flex-row justify-end gap-2 border-t border-slate-100 pt-3">
          {onEdit && (
            <Pressable
              onPress={onEdit}
              hitSlop={6}
              className="flex-row items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 active:opacity-70"
            >
              <Feather name="edit-2" size={14} color="#2563eb" />
              <Text className="text-xs font-medium text-blue-600">Edit</Text>
            </Pressable>
          )}
          {onDelete && (
            <Pressable
              onPress={onDelete}
              hitSlop={6}
              className="flex-row items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 active:opacity-70"
            >
              <Feather name="trash-2" size={14} color="#dc2626" />
              <Text className="text-xs font-medium text-red-600">Remove</Text>
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
}
