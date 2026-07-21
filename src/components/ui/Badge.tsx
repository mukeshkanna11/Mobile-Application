import { Text, View } from 'react-native';

/**
 * Generic pill badge. Pass Tailwind bg + text classes for full control.
 */
export default function Badge({
  label,
  bg = 'bg-slate-100',
  text = 'text-slate-600',
  dot,
}: {
  label: string;
  bg?: string;
  text?: string;
  dot?: string;
}) {
  return (
    <View className={`flex-row items-center gap-1.5 rounded-full px-2.5 py-1 ${bg}`}>
      {dot ? <View className={`h-1.5 w-1.5 rounded-full ${dot}`} /> : null}
      <Text className={`text-xs font-semibold ${text}`}>{label}</Text>
    </View>
  );
}
