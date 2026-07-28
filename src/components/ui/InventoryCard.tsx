import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import {
  availableOf,
  limitOf,
  onHandOf,
  reservedOf,
  statusOf,
  STOCK_STATUS,
  type StockRow,
} from '@/services/inventory';

/**
 * Inventory stock card — the mobile replacement for a web ledger row.
 * Shows on-hand / reserved / available with a stock bar, status badge and
 * +1 / -1 stock-in / stock-out actions (matching the web IN/OUT buttons).
 */
export default function InventoryCard({
  row,
  onStockIn,
  onStockOut,
  busy,
}: {
  row: StockRow;
  onStockIn: () => void;
  onStockOut: () => void;
  busy?: boolean;
}) {
  const onHand = onHandOf(row);
  const reserved = reservedOf(row);
  const available = availableOf(row);
  const limit = limitOf(row);
  const status = statusOf(available, limit);
  const tok = STOCK_STATUS[status];
  const pct = limit > 0 ? Math.min(Math.max((available / limit) * 100, 0), 100) : available > 0 ? 100 : 0;

  return (
    <View className="mb-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* Header */}
      <View className="flex-row items-center gap-3">
        <LinearGradient
          colors={['#4f46e5', '#7c3aed']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ height: 44, width: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text className="text-base font-bold text-white">
            {(row.product?.name || '?').charAt(0).toUpperCase()}
          </Text>
        </LinearGradient>

        <View className="flex-1">
          <Text className="text-base font-semibold text-slate-900" numberOfLines={1}>
            {row.product?.name || '--'}
          </Text>
          <Text className="text-xs text-slate-500" numberOfLines={1}>
            SKU: {row.product?.sku || '--'} · {row.warehouse?.name || '--'}
          </Text>
        </View>

        <View className={`rounded-full px-2.5 py-1 ${tok.badgeBg}`}>
          <Text className={`text-xs font-semibold ${tok.badgeText}`}>{tok.label}</Text>
        </View>
      </View>

      {/* Quantities */}
      <View className="mt-3 flex-row">
        <View className="flex-1">
          <Text className="text-[11px] text-slate-400">On Hand</Text>
          <Text className="text-sm font-bold text-slate-900">{onHand}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-[11px] text-slate-400">Reserved</Text>
          <Text className={`text-sm font-bold ${reserved > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
            {reserved}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-[11px] text-slate-400">Available</Text>
          <Text className={`text-sm font-bold ${tok.text}`}>{available}</Text>
        </View>
      </View>

      {/* Stock bar */}
      <View className="mt-3">
        <View className="mb-1 flex-row justify-between">
          <Text className="text-[11px] text-slate-400">Stock level</Text>
          <Text className="text-[11px] text-slate-400">Limit {limit}</Text>
        </View>
        <View className="h-2 overflow-hidden rounded-full bg-slate-200">
          <View className={`h-full rounded-full ${tok.bar}`} style={{ width: `${pct}%` }} />
        </View>
      </View>

      {/* Actions */}
      <View className="mt-4 flex-row gap-3">
        <Pressable
          onPress={onStockIn}
          disabled={busy}
          className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-emerald-50 py-2.5 ${
            busy ? 'opacity-50' : 'active:opacity-80'
          }`}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#059669" />
          ) : (
            <Feather name="plus" size={16} color="#059669" />
          )}
          <Text className="text-sm font-semibold text-emerald-700">Stock In</Text>
        </Pressable>

        <Pressable
          onPress={onStockOut}
          disabled={busy}
          className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-red-50 py-2.5 ${
            busy ? 'opacity-50' : 'active:opacity-80'
          }`}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#dc2626" />
          ) : (
            <Feather name="minus" size={16} color="#dc2626" />
          )}
          <Text className="text-sm font-semibold text-red-700">Stock Out</Text>
        </Pressable>
      </View>
    </View>
  );
}
