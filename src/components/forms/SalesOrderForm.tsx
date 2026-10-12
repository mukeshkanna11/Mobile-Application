import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import FormField from '@/components/ui/FormField';
import PrimaryButton from '@/components/ui/PrimaryButton';
import SearchablePicker from '@/components/ui/SearchablePicker';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import { fetchClients, type Client } from '@/services/clients';
import { money } from '@/services/invoices';
import { fetchProducts, isForbidden, type Product } from '@/services/products';
import { productOptions } from '@/services/purchaseOrders';
import {
  clientOptions,
  defaultPrice,
  emptySO,
  emptySOItem,
  lineTotal,
  validateSO,
  type SOFormItem,
  type SOInput,
} from '@/services/salesOrders';

const num = (t: string) => t.replace(/[^0-9.]/g, '');

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="mb-3 mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </Text>
  );
}

/** Shared create/edit sales order form (customer, line items, notes). */
export default function SalesOrderForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: SOInput;
  submitLabel: string;
  onSubmit: (input: SOInput) => Promise<void>;
}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState<SOInput>(initial ?? emptySO);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([fetchClients(), fetchProducts()])
      .then(([c, p]) => {
        setClients(c);
        setProducts(p);
        setError(false);
      })
      .catch((err) => (isForbidden(err) ? setForbidden(true) : setError(true)))
      .finally(() => setLoading(false));
  }, [reloadKey]);

  const customerOpts = useMemo(() => clientOptions(clients), [clients]);
  const productOpts = useMemo(() => productOptions(products), [products]);
  const total = form.items.reduce((s, i) => s + lineTotal(i), 0);

  const setItem = (index: number, patch: Partial<SOFormItem>) =>
    setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) }));

  /** Like the web: picking a product defaults an empty price from the product. */
  const pickProduct = (index: number, productId: string) => {
    const current = form.items[index];
    const price = Number(current.price) > 0
      ? current.price
      : String(defaultPrice(products.find((p) => p._id === productId)));
    setItem(index, { product: productId, price });
  };

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { ...emptySOItem }] }));
  const removeItem = (index: number) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }));

  const handleSubmit = async () => {
    const err = validateSO(form);
    if (err) {
      Toast.show({ type: 'error', text1: err });
      return;
    }
    try {
      setSaving(true);
      await onSubmit(form);
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Save failed',
        text2: e?.response?.data?.message ?? 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label="Loading customers & products…" />;
  // /clients and /products are admin-only on the backend.
  if (forbidden)
    return (
      <MessageState
        icon="lock"
        title="Admin access required"
        message="Customers and products can only be loaded by admin users. Ask an administrator to create this sales order or to grant you access."
      />
    );
  if (error)
    return (
      <MessageState
        icon="wifi-off"
        tone="error"
        title="Couldn't load customers or products"
        actionLabel="Retry"
        onAction={() => {
          setLoading(true);
          setReloadKey((k) => k + 1);
        }}
      />
    );

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <SectionTitle>Customer</SectionTitle>
        <SearchablePicker
          label="Customer"
          required
          placeholder={customerOpts.length ? 'Select customer' : 'No clients — add one first'}
          value={form.customer}
          options={customerOpts}
          onSelect={(v) => setForm((f) => ({ ...f, customer: v }))}
          searchPlaceholder="Search customers…"
        />

        <SectionTitle>Items</SectionTitle>
        {form.items.map((item, index) => (
          <View key={index} className="mb-3 rounded-2xl border border-slate-200 bg-white p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-slate-700">Item {index + 1}</Text>
              {form.items.length > 1 ? (
                <Pressable hitSlop={10} onPress={() => removeItem(index)}>
                  <Feather name="trash-2" size={16} color="#dc2626" />
                </Pressable>
              ) : null}
            </View>
            <SearchablePicker
              label="Product"
              required
              placeholder="Select product"
              value={item.product}
              options={productOpts}
              onSelect={(v) => pickProduct(index, v)}
              searchPlaceholder="Search products…"
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <FormField
                  label="Qty"
                  required
                  value={item.qty}
                  onChangeText={(t) => setItem(index, { qty: num(t) })}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <FormField
                  label="Unit Price (₹)"
                  value={item.price}
                  onChangeText={(t) => setItem(index, { price: num(t) })}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
            </View>
            <Text className="text-right text-xs text-slate-500">
              Line total: <Text className="font-semibold text-slate-800">{money(lineTotal(item))}</Text>
            </Text>
          </View>
        ))}

        <Pressable
          onPress={addItem}
          className="mb-4 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-indigo-300 bg-indigo-50 py-3"
        >
          <Feather name="plus" size={16} color="#4f46e5" />
          <Text className="text-sm font-medium text-indigo-600">Add item</Text>
        </Pressable>

        <SectionTitle>Notes</SectionTitle>
        <FormField
          label="Notes"
          value={form.notes}
          onChangeText={(t) => setForm((f) => ({ ...f, notes: t }))}
          placeholder="Delivery instructions, references…"
          multiline
        />

        <View className="mb-4 flex-row items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
          <Text className="text-sm font-medium text-slate-600">Order Total</Text>
          <Text className="text-lg font-bold text-slate-900">{money(total)}</Text>
        </View>

        <PrimaryButton label={submitLabel} loadingLabel="Saving…" loading={saving} onPress={handleSubmit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
