import { Feather } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import Badge from '@/components/ui/Badge';
import { money } from '@/services/invoices';
import {
  customerName,
  soTotal,
  STATUS_LABEL,
  STATUS_STYLE,
  type SalesOrder,
} from '@/services/salesOrders';

/** Sales order list card — number, customer, status, item count and total. */
export default function SalesOrderCard({
  so,
  onPress,
}: {
  so: SalesOrder;
  onPress?: () => void;
}) {
  const style = STATUS_STYLE[so.status] ?? STATUS_STYLE.DRAFT;
  const count = so.items?.length ?? 0;

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
    >
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100">
          <Feather name="file-text" size={20} color="#4f46e5" />
        </View>

        <View className="flex-1">
          <Text className="text-base font-semibold text-slate-900" numberOfLines={1}>
            {so.soNumber}
          </Text>
          <Text className="text-xs text-slate-500" numberOfLines={1}>
            {customerName(so.customer)}
          </Text>
        </View>

        <Text className="text-base font-bold text-slate-900">{money(soTotal(so))}</Text>
      </View>

      <View className="mt-3 flex-row items-center gap-2">
        <Badge label={STATUS_LABEL[so.status] ?? so.status} {...style} />
        <Text className="text-xs text-slate-500">
          {count} item{count === 1 ? '' : 's'}
        </Text>
        {so.createdAt ? (
          <Text className="ml-auto text-xs text-slate-400">
            {new Date(so.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
