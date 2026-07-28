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
import {
  emptyWarehouse,
  validateWarehouse,
  type WarehouseInput,
  type WarehouseStatus,
} from '@/services/warehouses';

const STATUSES: readonly WarehouseStatus[] = ['Active', 'Inactive'];
const PRIMARY_OPTIONS = ['No', 'Yes'] as const;

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="mb-3 mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </Text>
  );
}

const num = (t: string) => t.replace(/[^0-9.]/g, '');

/**
 * Shared create/edit warehouse form. Field set + validation mirror the web
 * (only Warehouse name is required).
 */
export default function WarehouseForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: WarehouseInput;
  submitLabel: string;
  onSubmit: (input: WarehouseInput) => Promise<void>;
}) {
  const [form, setForm] = useState<WarehouseInput>(initial ?? emptyWarehouse);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof WarehouseInput>(key: K, value: WarehouseInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    const err = validateWarehouse(form);
    if (err) {
      Toast.show({ type: 'error', text1: err });
      return;
    }
    try {
      setSaving(true);
      await onSubmit(form);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Save failed',
        text2: error?.response?.data?.message ?? 'Please try again.',
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
        <SectionTitle>Warehouse Information</SectionTitle>
        <FormField
          label="Name"
          required
          value={form.name}
          onChangeText={(t) => set('name', t)}
          placeholder="Central Warehouse"
        />
        <FormField
          label="Code"
          value={form.code}
          onChangeText={(t) => set('code', t)}
          placeholder="WH-001"
          autoCapitalize="characters"
        />
        <Segmented<WarehouseStatus>
          label="Status"
          options={STATUSES}
          value={form.status}
          onChange={(v) => set('status', v)}
        />
        <Segmented
          label="Primary Warehouse"
          options={PRIMARY_OPTIONS}
          value={form.isPrimary ? 'Yes' : 'No'}
          onChange={(v) => set('isPrimary', v === 'Yes')}
        />

        <SectionTitle>Contact & Location</SectionTitle>
        <FormField
          label="Manager"
          value={form.manager}
          onChangeText={(t) => set('manager', t)}
          placeholder="Manager name"
        />
        <FormField
          label="Phone"
          value={form.phone}
          onChangeText={(t) => set('phone', t)}
          placeholder="+91…"
          keyboardType="phone-pad"
        />
        <FormField
          label="Email"
          value={form.email}
          onChangeText={(t) => set('email', t)}
          placeholder="warehouse@company.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <FormField
          label="Location"
          value={form.location}
          onChangeText={(t) => set('location', t)}
          placeholder="Area / zone"
        />
        <FormField
          label="Address"
          value={form.address}
          onChangeText={(t) => set('address', t)}
          placeholder="Street address"
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <FormField label="City" value={form.city} onChangeText={(t) => set('city', t)} />
          </View>
          <View className="flex-1">
            <FormField label="State" value={form.state} onChangeText={(t) => set('state', t)} />
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <FormField label="Country" value={form.country} onChangeText={(t) => set('country', t)} />
          </View>
          <View className="flex-1">
            <FormField
              label="Pincode"
              value={form.pincode}
              onChangeText={(t) => set('pincode', t)}
              keyboardType="numeric"
            />
          </View>
        </View>

        <SectionTitle>Capacity</SectionTitle>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <FormField
              label="Capacity"
              value={form.capacity}
              onChangeText={(t) => set('capacity', num(t))}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>
          <View className="flex-1">
            <FormField
              label="Current Stock"
              value={form.currentStock}
              onChangeText={(t) => set('currentStock', num(t))}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>
        </View>

        <SectionTitle>Description</SectionTitle>
        <FormField
          label="Description"
          value={form.description}
          onChangeText={(t) => set('description', t)}
          placeholder="Notes about this warehouse…"
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
