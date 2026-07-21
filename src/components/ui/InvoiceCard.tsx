import { Feather } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import InvoiceStatusBadge from '@/components/ui/InvoiceStatusBadge';
import { calculateTotals, money, type Invoice } from '@/services/invoices';

/** Customer display name, matching the web `name` derivation. */
function customerName(invoice: Invoice): string {
  return (
    invoice?.customer?.companyName ||
    invoice?.customer?.contactPerson ||
    invoice?.customerName ||
    'N/A'
  );
}

/**
 * Mobile invoice card (replaces a web table row). Shows number, customer,
 * grand total, balance and the computed status.
 */
export default function InvoiceCard({
  invoice,
  onPress,
}: {
  invoice: Invoice;
  onPress?: () => void;
}) {
  const { grandTotal, balance, computedStatus } = calculateTotals(invoice);

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
    >
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
          <Feather name="file-text" size={18} color="#4f46e5" />
        </View>

        <View className="flex-1">
          <Text className="text-base font-semibold text-slate-900" numberOfLines={1}>
            {invoice.invoiceNumber || '-'}
          </Text>
          <Text className="text-xs text-slate-500" numberOfLines={1}>
            {customerName(invoice)}
          </Text>
        </View>

        <View className="items-end">
          <Text className="text-base font-bold text-slate-900">
            {money(grandTotal)}
          </Text>
          <Feather name="chevron-right" size={18} color="#cbd5e1" />
        </View>
      </View>

      <View className="mt-3 flex-row items-center justify-between">
        <InvoiceStatusBadge status={computedStatus} />
        <View className="flex-row items-center gap-1.5">
          <Text className="text-xs text-slate-400">Balance</Text>
          <Text
            className={`text-sm font-semibold ${
              balance === 0 ? 'text-emerald-600' : 'text-red-500'
            }`}
          >
            {money(balance)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
