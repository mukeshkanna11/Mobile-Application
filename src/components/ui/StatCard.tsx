import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, Text, View } from 'react-native';

type FeatherName = keyof typeof Feather.glyphMap;

interface StatCardProps {
  label: string;
  value: number | string;
  icon: FeatherName;
  /** Tailwind bg tint + icon color pair. */
  tint: string;
  iconColor: string;
  loading?: boolean;
}

/**
 * Metric tile for the dashboard grid (Clients, Products, Inventory, Invoices).
 */
export default function StatCard({
  label,
  value,
  icon,
  tint,
  iconColor,
  loading = false,
}: StatCardProps) {
  return (
    <View className="flex-1 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <View
        className={`h-10 w-10 items-center justify-center rounded-xl ${tint}`}
      >
        <Feather name={icon} size={20} color={iconColor} />
      </View>

      {loading ? (
        <ActivityIndicator className="mt-3 self-start" color={iconColor} />
      ) : (
        <Text className="mt-3 text-2xl font-bold text-slate-900">{value}</Text>
      )}

      <Text className="mt-1 text-sm text-slate-500">{label}</Text>
    </View>
  );
}
