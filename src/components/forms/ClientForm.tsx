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
  emptyClient,
  type Address,
  type ClientInput,
  type ClientStatus,
  type ClientType,
} from '@/services/clients';

const CLIENT_TYPES = ['Customer', 'Prospect', 'Partner'] as const;
const STATUSES: readonly ClientStatus[] = ['Active', 'Inactive'];
const SUBSCRIPTIONS = ['Trial', 'Active', 'Expired', 'Cancelled'] as const;

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="mb-3 mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </Text>
  );
}

interface ClientFormProps {
  initial?: ClientInput;
  submitLabel: string;
  /** Persist to the backend; resolve on success. */
  onSubmit: (input: ClientInput) => Promise<void>;
}

/**
 * Shared create/edit form. Field set mirrors the web drawer exactly.
 */
export default function ClientForm({
  initial,
  submitLabel,
  onSubmit,
}: ClientFormProps) {
  const [form, setForm] = useState<ClientInput>(initial ?? emptyClient);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ClientInput>(key: K, value: ClientInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setBilling = (key: keyof Address, value: string) =>
    setForm((f) => ({
      ...f,
      billingAddress: { ...f.billingAddress, [key]: value },
    }));

  const handleSubmit = async () => {
    if (!form.companyName.trim() || !form.contactPerson.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Missing details',
        text2: 'Company name and contact person are required.',
      });
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
        <SectionTitle>Company Information</SectionTitle>
        <FormField
          label="Company Name"
          required
          value={form.companyName}
          onChangeText={(t) => set('companyName', t)}
          placeholder="Acme Pvt Ltd"
        />
        <FormField
          label="Contact Person"
          required
          value={form.contactPerson}
          onChangeText={(t) => set('contactPerson', t)}
          placeholder="Full name"
        />

        <SectionTitle>Contact Details</SectionTitle>
        <FormField
          label="Email"
          value={form.email}
          onChangeText={(t) => set('email', t)}
          placeholder="name@company.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <FormField
          label="Phone"
          value={form.phone}
          onChangeText={(t) => set('phone', t)}
          placeholder="+91…"
          keyboardType="phone-pad"
        />
        <FormField
          label="Website"
          value={form.website}
          onChangeText={(t) => set('website', t)}
          placeholder="https://…"
          autoCapitalize="none"
        />
        <FormField
          label="Billing Address"
          value={form.billingAddress.addressLine1 ?? ''}
          onChangeText={(t) => setBilling('addressLine1', t)}
          placeholder="Street, area"
        />

        <SectionTitle>Business Information</SectionTitle>
        <Segmented<ClientType>
          label="Client Type"
          options={CLIENT_TYPES}
          value={
            (CLIENT_TYPES as readonly string[]).includes(form.clientType)
              ? form.clientType
              : 'Customer'
          }
          onChange={(v) => set('clientType', v)}
        />
        <Segmented<ClientStatus>
          label="Status"
          options={STATUSES}
          value={form.status}
          onChange={(v) => set('status', v)}
        />
        <FormField
          label="GST Number"
          value={form.gstNumber}
          onChangeText={(t) => set('gstNumber', t)}
          autoCapitalize="characters"
        />
        <FormField
          label="PAN Number"
          value={form.panNumber}
          onChangeText={(t) => set('panNumber', t)}
          autoCapitalize="characters"
        />

        <SectionTitle>Subscription</SectionTitle>
        <FormField
          label="Current Plan"
          value={form.currentPlan}
          onChangeText={(t) => set('currentPlan', t)}
          placeholder="e.g. Growth Suite"
        />
        <Segmented
          label="Subscription Status"
          options={SUBSCRIPTIONS}
          value={form.subscriptionStatus}
          onChange={(v) => set('subscriptionStatus', v)}
          scroll
        />

        <SectionTitle>Additional Notes</SectionTitle>
        <FormField
          label="Notes"
          value={form.notes}
          onChangeText={(t) => set('notes', t)}
          placeholder="Requirements, follow-ups, meeting summary…"
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
