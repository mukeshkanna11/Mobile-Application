import { Feather } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import FormField from '@/components/ui/FormField';
import Segmented from '@/components/ui/Segmented';
import { money } from '@/services/invoices';
import { PLAN_TYPES, type InvoiceFormItem } from '@/services/invoiceForm';

/** Numeric text -> number (blank stays 0). */
const num = (t: string) => Number(t.replace(/[^0-9.]/g, '')) || 0;

/**
 * Editor for a single invoice line item. Totals update live as fields change.
 */
export default function InvoiceItemCard({
  index,
  item,
  onChange,
  onRemove,
  removable,
}: {
  index: number;
  item: InvoiceFormItem;
  onChange: (index: number, patch: Partial<InvoiceFormItem>) => void;
  onRemove: (index: number) => void;
  removable: boolean;
}) {
  const base = Number(item.quantity || 0) * Number(item.unitPrice || 0);
  const tax = (base * Number(item.taxPercent || 0)) / 100;
  const total = base + tax;

  return (
    <View className="mb-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-slate-700">Item {index + 1}</Text>
        {removable ? (
          <Pressable
            hitSlop={8}
            onPress={() => onRemove(index)}
            className="flex-row items-center gap-1 rounded-lg bg-red-50 px-2 py-1"
          >
            <Feather name="trash-2" size={13} color="#dc2626" />
            <Text className="text-xs font-medium text-red-600">Remove</Text>
          </Pressable>
        ) : null}
      </View>

      <FormField
        label="Description"
        required
        value={item.description}
        onChangeText={(t) => onChange(index, { description: t })}
        placeholder="Product / service name"
      />
      <FormField
        label="HSN / SAC Code"
        required
        value={item.hsnCode}
        onChangeText={(t) => onChange(index, { hsnCode: t })}
        placeholder="998314"
      />

      <Segmented
        label="Plan Type"
        options={PLAN_TYPES}
        value={item.planType}
        onChange={(v) => onChange(index, { planType: v })}
        scroll
      />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <FormField
            label="Quantity"
            value={String(item.quantity)}
            onChangeText={(t) => onChange(index, { quantity: num(t) })}
            keyboardType="numeric"
          />
        </View>
        <View className="flex-1">
          <FormField
            label="Users"
            value={String(item.users)}
            onChangeText={(t) => onChange(index, { users: num(t) })}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <FormField
            label="Unit Price"
            value={String(item.unitPrice)}
            onChangeText={(t) => onChange(index, { unitPrice: num(t) })}
            keyboardType="numeric"
          />
        </View>
        <View className="flex-1">
          <FormField
            label="Tax %"
            value={String(item.taxPercent)}
            onChangeText={(t) => onChange(index, { taxPercent: num(t) })}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View className="mt-1 flex-row items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
        <Text className="text-xs text-slate-500">
          Base {money(base)} · Tax {money(tax)}
        </Text>
        <Text className="text-sm font-bold text-slate-900">{money(total)}</Text>
      </View>
    </View>
  );
}
