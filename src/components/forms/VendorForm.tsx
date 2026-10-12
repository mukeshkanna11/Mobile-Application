import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import FormField from '@/components/ui/FormField';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { emptyVendor, validateVendor, type VendorInput } from '@/services/vendors';

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="mb-3 mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </Text>
  );
}

/** Shared create/edit vendor form. Fields match the backend Vendor model. */
export default function VendorForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: VendorInput;
  submitLabel: string;
  onSubmit: (input: VendorInput) => Promise<void>;
}) {
  const [form, setForm] = useState<VendorInput>(initial ?? emptyVendor);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof VendorInput>(key: K, value: VendorInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    const err = validateVendor(form);
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
        <SectionTitle>Vendor Information</SectionTitle>
        <FormField
          label="Vendor Name"
          required
          value={form.name}
          onChangeText={(t) => set('name', t)}
          placeholder="Acme Supplies"
        />

        <SectionTitle>Contact</SectionTitle>
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
          placeholder="vendor@company.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <FormField
          label="Address"
          value={form.address}
          onChangeText={(t) => set('address', t)}
          placeholder="Street, city, state"
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
