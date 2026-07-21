import { Feather } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

type FeatherName = keyof typeof Feather.glyphMap;

/** Card section with an uppercase title. */
export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-4 rounded-2xl border border-slate-100 bg-white px-4 shadow-sm">
      <Text className="pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </Text>
      {children}
    </View>
  );
}

/** Labeled row with a leading icon; optional press action (call/email/link). */
export function DetailRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: FeatherName;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  if (!value) return null;
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      className="flex-row items-center gap-3 py-3"
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-slate-100">
        <Feather name={icon} size={16} color="#4f46e5" />
      </View>
      <View className="flex-1">
        <Text className="text-xs text-slate-400">{label}</Text>
        <Text
          className={`text-sm ${onPress ? 'text-indigo-600' : 'text-slate-800'}`}
        >
          {value}
        </Text>
      </View>
      {onPress && <Feather name="external-link" size={16} color="#cbd5e1" />}
    </Pressable>
  );
}
