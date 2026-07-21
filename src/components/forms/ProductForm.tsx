import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import FormField from '@/components/ui/FormField';
import PrimaryButton from '@/components/ui/PrimaryButton';
import Segmented from '@/components/ui/Segmented';
import { emptyProduct, type ProductInput, type ProductStatus } from '@/services/products';

const STATUSES: readonly ProductStatus[] = ['Active', 'Inactive'];

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="mb-3 mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </Text>
  );
}

interface ProductFormProps {
  initial?: ProductInput;
  submitLabel: string;
  onSubmit: (input: ProductInput) => Promise<void>;
}

/**
 * Shared create/edit form. Field set + validation mirror the web drawer
 * (only Product Name is required, matching the web `required` attribute).
 */
export default function ProductForm({
  initial,
  submitLabel,
  onSubmit,
}: ProductFormProps) {
  const [form, setForm] = useState<ProductInput>(initial ?? emptyProduct);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      Toast.show({ type: 'error', text1: 'Product name is required' });
      return;
    }
    try {
      setSaving(true);
      await onSubmit(form);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Save failed',
        text2: err?.response?.data?.message ?? 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <SectionTitle>Product Information</SectionTitle>
        <FormField
          label="Product Name"
          required
          value={form.name}
          onChangeText={(t) => set('name', t)}
          placeholder="Apple iPhone 16"
        />
        <FormField
          label="SKU"
          value={form.sku}
          onChangeText={(t) => set('sku', t)}
          placeholder="RTS-10001"
          autoCapitalize="characters"
        />
        <FormField
          label="Category"
          value={form.category}
          onChangeText={(t) => set('category', t)}
          placeholder="Electronics"
        />
        <Segmented<ProductStatus>
          label="Status"
          options={STATUSES}
          value={form.status}
          onChange={(v) => set('status', v)}
        />

        <SectionTitle>Pricing & Inventory</SectionTitle>
        <FormField
          label="Selling Price (₹)"
          value={form.price}
          onChangeText={(t) => set('price', t)}
          placeholder="50000"
          keyboardType="numeric"
        />
        <FormField
          label="Stock Quantity"
          value={form.stock}
          onChangeText={(t) => set('stock', t)}
          placeholder="0"
          keyboardType="numeric"
        />
        <FormField
          label="Tax (%)"
          value={form.tax}
          onChangeText={(t) => set('tax', t)}
          placeholder="0"
          keyboardType="numeric"
        />

        <SectionTitle>Description</SectionTitle>
        <FormField
          label="Product Description"
          value={form.description}
          onChangeText={(t) => set('description', t)}
          placeholder="Enter product description…"
          multiline
        />

        <View className="mt-4">
          <PrimaryButton
            label={submitLabel}
            loadingLabel="Saving…"
            loading={saving}
            onPress={handleSubmit}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
