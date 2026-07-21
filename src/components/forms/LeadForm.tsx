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
  emptyLead,
  LEAD_SOURCES,
  LEAD_STATUSES,
  type LeadInput,
  type LeadPriority,
} from '@/services/leads';

const PRIORITIES: readonly LeadPriority[] = ['High', 'Medium', 'Low'];
const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'] as const;

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="mb-3 mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </Text>
  );
}

interface LeadFormProps {
  initial?: LeadInput;
  submitLabel: string;
  onSubmit: (input: LeadInput) => Promise<void>;
}

/**
 * Shared create/edit form. Field set + validation mirror the web Leads drawer
 * (name is the only required field, matching the backend).
 */
export default function LeadForm({
  initial,
  submitLabel,
  onSubmit,
}: LeadFormProps) {
  const [form, setForm] = useState<LeadInput>(initial ?? emptyLead);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof LeadInput>(key: K, value: LeadInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      Toast.show({ type: 'error', text1: 'Full name is required' });
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
        <SectionTitle>👤 Personal Information</SectionTitle>
        <FormField
          label="Full Name"
          required
          value={form.name}
          onChangeText={(t) => set('name', t)}
          placeholder="John Smith"
        />
        <FormField
          label="Designation"
          value={form.designation ?? ''}
          onChangeText={(t) => set('designation', t)}
          placeholder="Sales Manager"
        />
        <FormField
          label="Email"
          value={form.email}
          onChangeText={(t) => set('email', t)}
          placeholder="john@company.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <FormField
          label="Phone"
          value={form.phone}
          onChangeText={(t) => set('phone', t)}
          placeholder="+91 9876543210"
          keyboardType="phone-pad"
        />

        <SectionTitle>🏢 Company Information</SectionTitle>
        <FormField
          label="Company"
          value={form.company}
          onChangeText={(t) => set('company', t)}
          placeholder="ABC Technologies"
        />
        <FormField
          label="Industry"
          value={form.industry ?? ''}
          onChangeText={(t) => set('industry', t)}
          placeholder="Software"
        />
        <FormField
          label="Website"
          value={form.website ?? ''}
          onChangeText={(t) => set('website', t)}
          placeholder="https://company.com"
          autoCapitalize="none"
        />
        <Segmented
          label="Company Size"
          options={COMPANY_SIZES}
          value={
            (COMPANY_SIZES as readonly string[]).includes(form.companySize ?? '')
              ? (form.companySize as (typeof COMPANY_SIZES)[number])
              : COMPANY_SIZES[0]
          }
          onChange={(v) => set('companySize', v)}
          scroll
        />

        <SectionTitle>🎯 Lead Details</SectionTitle>
        <Segmented
          label="Status"
          options={LEAD_STATUSES}
          value={
            (LEAD_STATUSES as readonly string[]).includes(form.status)
              ? (form.status as (typeof LEAD_STATUSES)[number])
              : 'New'
          }
          onChange={(v) => set('status', v)}
        />
        <Segmented
          label="Lead Source"
          options={LEAD_SOURCES}
          value={
            (LEAD_SOURCES as readonly string[]).includes(form.source)
              ? (form.source as (typeof LEAD_SOURCES)[number])
              : 'Website'
          }
          onChange={(v) => set('source', v)}
          scroll
        />
        <Segmented
          label="Priority"
          options={PRIORITIES}
          value={form.priority ?? 'Medium'}
          onChange={(v) => set('priority', v)}
        />
        <FormField
          label="Assigned To"
          value={form.assignedTo ?? ''}
          onChangeText={(t) => set('assignedTo', t)}
          placeholder="Sales Executive"
        />

        <SectionTitle>💰 Sales Information</SectionTitle>
        <FormField
          label="Expected Deal Value"
          value={form.expectedValue ?? ''}
          onChangeText={(t) => set('expectedValue', t)}
          placeholder="50000"
          keyboardType="numeric"
        />
        <FormField
          label="Follow-up Date"
          value={form.followUpDate ?? ''}
          onChangeText={(t) => set('followUpDate', t)}
          placeholder="YYYY-MM-DD"
        />

        <SectionTitle>📝 Notes</SectionTitle>
        <FormField
          label="Notes"
          value={form.notes}
          onChangeText={(t) => set('notes', t)}
          placeholder="Customer requirements, follow-up details, meeting notes…"
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
