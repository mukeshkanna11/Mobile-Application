import { Feather } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import Badge from '@/components/ui/Badge';
import { money } from '@/services/invoices';
import {
  poTotal,
  refName,
  STATUS_LABEL,
  type PurchaseOrder,
} from '@/services/purchaseOrders';

/** Purchase order list card — number, vendor, status, item count and total. */
export default function PurchaseOrderCard({
  po,
  onPress,
}: {
  po: PurchaseOrder;
  onPress?: () => void;
}) {
  const received = po.status === 'RECEIVED';
  const count = po.items?.length ?? 0;

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
    >
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100">
          <Feather name="shopping-cart" size={20} color="#4f46e5" />
        </View>

        <View className="flex-1">
          <Text className="text-base font-semibold text-slate-900" numberOfLines={1}>
            {po.poNumber}
          </Text>
          <Text className="text-xs text-slate-500" numberOfLines={1}>
            {refName(po.vendor, 'Unknown vendor')}
          </Text>
        </View>

        <Text className="text-base font-bold text-slate-900">{money(poTotal(po))}</Text>
      </View>

      <View className="mt-3 flex-row items-center gap-2">
        <Badge
          label={STATUS_LABEL[po.status] ?? po.status}
          bg={received ? 'bg-emerald-100' : 'bg-amber-100'}
          text={received ? 'text-emerald-700' : 'text-amber-700'}
          dot={received ? 'bg-emerald-500' : 'bg-amber-500'}
        />
        <Text className="text-xs text-slate-500">
          {count} item{count === 1 ? '' : 's'}
        </Text>
        {po.createdAt ? (
          <Text className="ml-auto text-xs text-slate-400">
            {new Date(po.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
