import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
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

  const setShipping = (key: keyof Address, value: string) =>
    setForm((f) => ({
      ...f,
      shippingAddress: { ...f.shippingAddress, [key]: value },
    }));

  /** Copies billing → shipping so the common case is one tap. */
  const copyBillingToShipping = () =>
    setForm((f) => ({ ...f, shippingAddress: { ...f.billingAddress } }));

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

        <SectionTitle>Tax Information</SectionTitle>
        <FormField
          label="GST Number"
          value={form.gstNumber}
          onChangeText={(t) => set('gstNumber', t)}
          placeholder="29ABCDE1234F1Z5"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={15}
        />
        <FormField
          label="PAN Number"
          value={form.panNumber}
          onChangeText={(t) => set('panNumber', t)}
          placeholder="ABCDE1234F"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={10}
        />

        <SectionTitle>Billing Address</SectionTitle>
        <FormField
          label="Address Line 1"
          value={form.billingAddress.addressLine1 ?? ''}
          onChangeText={(t) => setBilling('addressLine1', t)}
          placeholder="Street, area"
        />
        <FormField
          label="Address Line 2"
          value={form.billingAddress.addressLine2 ?? ''}
          onChangeText={(t) => setBilling('addressLine2', t)}
          placeholder="Landmark, building"
        />
        <View className="flex-row" style={{ gap: 12 }}>
          <View className="flex-1">
            <FormField
              label="City"
              value={form.billingAddress.city ?? ''}
              onChangeText={(t) => setBilling('city', t)}
              placeholder="Coimbatore"
            />
          </View>
          <View className="flex-1">
            <FormField
              label="State"
              value={form.billingAddress.state ?? ''}
              onChangeText={(t) => setBilling('state', t)}
              placeholder="Tamil Nadu"
            />
          </View>
        </View>
        <View className="flex-row" style={{ gap: 12 }}>
          <View className="flex-1">
            <FormField
              label="Pincode"
              value={form.billingAddress.pincode ?? ''}
              onChangeText={(t) => setBilling('pincode', t)}
              placeholder="641004"
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>
          <View className="flex-1">
            <FormField
              label="Country"
              value={form.billingAddress.country ?? ''}
              onChangeText={(t) => setBilling('country', t)}
              placeholder="India"
            />
          </View>
        </View>

        <View className="mb-3 mt-2 flex-row items-center justify-between">
          <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Shipping Address
          </Text>
          <Pressable
            onPress={copyBillingToShipping}
            hitSlop={6}
            className="flex-row items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 active:opacity-80"
          >
            <Feather name="copy" size={13} color="#4f46e5" />
            <Text className="text-xs font-medium text-indigo-600">
              Same as billing
            </Text>
          </Pressable>
        </View>
        <FormField
          label="Address Line 1"
          value={form.shippingAddress.addressLine1 ?? ''}
          onChangeText={(t) => setShipping('addressLine1', t)}
          placeholder="Street, area"
        />
        <FormField
          label="Address Line 2"
          value={form.shippingAddress.addressLine2 ?? ''}
          onChangeText={(t) => setShipping('addressLine2', t)}
          placeholder="Landmark, building"
        />
        <View className="flex-row" style={{ gap: 12 }}>
          <View className="flex-1">
            <FormField
              label="City"
              value={form.shippingAddress.city ?? ''}
              onChangeText={(t) => setShipping('city', t)}
              placeholder="Coimbatore"
            />
          </View>
          <View className="flex-1">
            <FormField
              label="State"
              value={form.shippingAddress.state ?? ''}
              onChangeText={(t) => setShipping('state', t)}
              placeholder="Tamil Nadu"
            />
          </View>
        </View>
        <View className="flex-row" style={{ gap: 12 }}>
          <View className="flex-1">
            <FormField
              label="Pincode"
              value={form.shippingAddress.pincode ?? ''}
              onChangeText={(t) => setShipping('pincode', t)}
              placeholder="641004"
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>
          <View className="flex-1">
            <FormField
              label="Country"
              value={form.shippingAddress.country ?? ''}
              onChangeText={(t) => setShipping('country', t)}
              placeholder="India"
            />
          </View>
        </View>

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
