import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

type FeatherName = keyof typeof Feather.glyphMap;

/** Full-height loading spinner. */
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <ActivityIndicator size="large" color="#4f46e5" />
      <Text className="mt-3 text-sm text-slate-400">{label}</Text>
    </View>
  );
}

/** Centered icon + message, optionally with a retry button. */
export function MessageState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  tone = 'neutral',
}: {
  icon: FeatherName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'neutral' | 'error';
}) {
  const isError = tone === 'error';
  return (
    <View className="flex-1 items-center justify-center px-8 py-20">
      <View
        className={`h-16 w-16 items-center justify-center rounded-2xl ${
          isError ? 'bg-red-100' : 'bg-slate-100'
        }`}
      >
        <Feather
          name={icon}
          size={28}
          color={isError ? '#dc2626' : '#94a3b8'}
        />
      </View>
      <Text className="mt-4 text-lg font-semibold text-slate-900">{title}</Text>
      {message ? (
        <Text className="mt-1 text-center text-sm text-slate-400">
          {message}
        </Text>
      ) : null}

      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          className="mt-5 flex-row items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 active:opacity-80"
        >
          <Feather name="refresh-cw" size={16} color="#ffffff" />
          <Text className="font-medium text-white">{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
