import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import DateField from '@/components/ui/DateField';
import FormField from '@/components/ui/FormField';
import PrimaryButton from '@/components/ui/PrimaryButton';
import SearchablePicker from '@/components/ui/SearchablePicker';
import Segmented from '@/components/ui/Segmented';
import {
  COMPANY_SIZES,
  emptyLead,
  LEAD_DEPARTMENTS,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STATUS_OPTIONS,
  validateLead,
  type LeadInput,
} from '@/services/leads';
import { fetchUsers, type User } from '@/services/users';

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="mb-3 mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </Text>
  );
}

const toOptions = (values: readonly string[]) => values.map((v) => ({ label: v, value: v }));

interface LeadFormProps {
  initial?: LeadInput;
  submitLabel: string;
  onSubmit: (input: LeadInput) => Promise<void>;
}

/**
 * Shared create/edit form — the mobile version of the web Leads drawer: same
 * sections, fields, enum options and validation (name is the only required field).
 */
export default function LeadForm({ initial, submitLabel, onSubmit }: LeadFormProps) {
  const [form, setForm] = useState<LeadInput>(initial ?? emptyLead);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [usersError, setUsersError] = useState(false);

  // Web fetchUsers() for the "Assigned To" select (GET /admin/users).
  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch(() => setUsersError(true));
  }, []);

  const set = <K extends keyof LeadInput>(key: K, value: LeadInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    const err = validateLead(form);
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
        text1: 'Failed to save lead',
        text2: e?.response?.data?.message || e?.response?.data?.error || 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const userOptions = [
    { label: 'Unassigned', value: '' },
    ...users.map((u) => ({ label: u.name || u.email, sublabel: u.email, value: u._id })),
  ];

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <SectionTitle>Personal Information</SectionTitle>
        <FormField label="Full Name" required value={form.name} onChangeText={(t) => set('name', t)} placeholder="John Smith" />
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
        <FormField label="Company" value={form.company} onChangeText={(t) => set('company', t)} placeholder="ABC Technologies" />

        <SectionTitle>Company & Requirement</SectionTitle>
        <FormField label="Designation" value={form.designation} onChangeText={(t) => set('designation', t)} placeholder="Sales Manager" />
        <FormField label="Industry" value={form.industry} onChangeText={(t) => set('industry', t)} placeholder="Software" />
        <FormField
          label="Website"
          value={form.website}
          onChangeText={(t) => set('website', t)}
          placeholder="https://company.com"
          autoCapitalize="none"
        />
        <SearchablePicker
          label="Company Size"
          placeholder="Select size"
          value={form.companySize}
          options={[{ label: 'Not specified', value: '' }, ...toOptions(COMPANY_SIZES)]}
          onSelect={(v) => set('companySize', v)}
        />
        <FormField
          label="Requirement"
          value={form.requirement}
          onChangeText={(t) => set('requirement', t)}
          placeholder="What is the customer looking for?"
          multiline
        />
        <FormField
          label="Customer Message"
          value={form.message}
          onChangeText={(t) => set('message', t)}
          placeholder="Message received from the customer"
          multiline
        />

        <SectionTitle>Lead Details</SectionTitle>
        <Segmented label="Status" options={LEAD_STATUS_OPTIONS} value={form.status} onChange={(v) => set('status', v)} scroll />
        <SearchablePicker
          label="Lead Source"
          value={form.source}
          options={toOptions(LEAD_SOURCES)}
          onSelect={(v) => set('source', v)}
        />
        <Segmented label="Priority" options={LEAD_PRIORITIES} value={form.priority} onChange={(v) => set('priority', v)} />
        <Segmented
          label="Department"
          options={LEAD_DEPARTMENTS}
          value={form.department}
          onChange={(v) => set('department', v)}
          scroll
        />

        <SectionTitle>Sales & Follow-up</SectionTitle>
        <FormField
          label="Deal Value"
          value={form.value}
          onChangeText={(t) => set('value', t)}
          placeholder="0"
          keyboardType="numeric"
        />
        <FormField
          label="Expected Value"
          value={form.expectedValue}
          onChangeText={(t) => set('expectedValue', t)}
          placeholder="0"
          keyboardType="numeric"
        />
        <DateField label="Follow-up Date" value={form.followUpDate} onChange={(d) => set('followUpDate', d)} />
        <DateField label="Last Contacted" value={form.lastContactedAt} onChange={(d) => set('lastContactedAt', d)} />
        <DateField label="Next Follow-up" value={form.nextFollowUpAt} onChange={(d) => set('nextFollowUpAt', d)} />
        <SearchablePicker
          label="Assigned To"
          placeholder={usersError ? 'Users unavailable' : 'Select user'}
          value={form.assignedTo}
          options={userOptions}
          onSelect={(v) => set('assignedTo', v)}
          searchPlaceholder="Search users…"
        />
        {usersError ? (
          <Text className="-mt-2 mb-4 text-xs text-amber-600">
            Couldn&apos;t load users (admin access required). Assignment is unchanged.
          </Text>
        ) : null}

        <SectionTitle>Notes</SectionTitle>
        <FormField
          label="Notes"
          value={form.notes}
          onChangeText={(t) => set('notes', t)}
          placeholder="Customer requirements, follow-up details, meeting notes…"
          multiline
        />

        <View className="mt-4">
          <PrimaryButton label={submitLabel} loadingLabel="Saving…" loading={saving} onPress={handleSubmit} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
