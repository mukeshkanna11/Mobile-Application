import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';

type FeatherName = keyof typeof Feather.glyphMap;
export type KpiAccent = 'indigo' | 'green' | 'amber';

/** Gradient palette mirrors the web `Kpi` component's accent styles. */
const ACCENTS: Record<KpiAccent, [string, string]> = {
  indigo: ['#4f46e5', '#2563eb'],
  green: ['#059669', '#16a34a'],
  amber: ['#f97316', '#d97706'],
};

/**
 * Compact gradient KPI tile (mobile-optimized version of the web KPI card).
 */
export default function KpiCard({
  title,
  value,
  icon,
  accent,
  badge,
}: {
  title: string;
  value: number | string;
  icon: FeatherName;
  accent: KpiAccent;
  badge?: string;
}) {
  return (
    <LinearGradient
      colors={ACCENTS[accent]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1, borderRadius: 20, overflow: 'hidden' }}
    >
      <View className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10" />
      <View className="p-3.5">
        <View className="flex-row items-center justify-between">
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-white/25">
            <Feather name={icon} size={18} color="#ffffff" />
          </View>
          {badge ? (
            <View className="rounded-full bg-white/15 px-2 py-0.5">
              <Text className="text-[10px] font-semibold text-white/90">
                {badge}
              </Text>
            </View>
          ) : null}
        </View>

        <Text className="mt-3 text-2xl font-bold text-white">{value}</Text>
        <Text className="text-[11px] text-white/80">{title}</Text>
      </View>
    </LinearGradient>
  );
}
