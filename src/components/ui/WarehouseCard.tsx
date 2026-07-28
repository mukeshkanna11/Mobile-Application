import { Feather } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import Badge from '@/components/ui/Badge';
import type { Warehouse } from '@/services/warehouses';

/**
 * Warehouse list card — name, code, status, location/manager and a capacity
 * utilisation bar (currentStock / capacity).
 */
export default function WarehouseCard({
  warehouse,
  onPress,
}: {
  warehouse: Warehouse;
  onPress?: () => void;
}) {
  const capacity = Number(warehouse.capacity || 0);
  const stock = Number(warehouse.currentStock || 0);
  const pct = capacity > 0 ? Math.min(Math.max((stock / capacity) * 100, 0), 100) : 0;
  const isActive = (warehouse.status || 'Active') === 'Active';

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
    >
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100">
          <Feather name="home" size={20} color="#4f46e5" />
        </View>

        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="flex-1 text-base font-semibold text-slate-900" numberOfLines={1}>
              {warehouse.name}
            </Text>
            {warehouse.isPrimary ? (
              <Badge label="Primary" bg="bg-indigo-100" text="text-indigo-700" />
            ) : null}
          </View>
          <Text className="text-xs text-slate-500" numberOfLines={1}>
            {warehouse.code ? `${warehouse.code} · ` : ''}
            {warehouse.location || warehouse.city || 'No location'}
          </Text>
        </View>

        <Feather name="chevron-right" size={18} color="#cbd5e1" />
      </View>

      <View className="mt-3 flex-row items-center gap-2">
        <Badge
          label={isActive ? 'Active' : 'Inactive'}
          bg={isActive ? 'bg-emerald-100' : 'bg-slate-200'}
          text={isActive ? 'text-emerald-700' : 'text-slate-600'}
          dot={isActive ? 'bg-emerald-500' : 'bg-slate-400'}
        />
        {warehouse.manager ? (
          <View className="flex-row items-center gap-1">
            <Feather name="user" size={12} color="#94a3b8" />
            <Text className="text-xs text-slate-500" numberOfLines={1}>
              {warehouse.manager}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Capacity utilisation */}
      <View className="mt-3">
        <View className="mb-1 flex-row justify-between">
          <Text className="text-[11px] text-slate-400">
            Stock {stock} / {capacity || '—'}
          </Text>
          <Text className="text-[11px] text-slate-400">
            {capacity > 0 ? `${Math.round(pct)}%` : 'No capacity set'}
          </Text>
        </View>
        <View className="h-2 overflow-hidden rounded-full bg-slate-200">
          <View
            className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-indigo-600'}`}
            style={{ width: `${pct}%` }}
          />
        </View>
      </View>
    </Pressable>
  );
}
