import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import DateField from '@/components/ui/DateField';
import FormField from '@/components/ui/FormField';
import PrimaryButton from '@/components/ui/PrimaryButton';
import SearchablePicker, { type PickerOption } from '@/components/ui/SearchablePicker';
import Segmented from '@/components/ui/Segmented';
import { fetchLeads, type Lead } from '@/services/leads';
import {
  emptyOpportunity,
  STAGES,
  validateOpportunity,
  type OpportunityInput,
  type Stage,
} from '@/services/opportunities';

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="mb-3 mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </Text>
  );
}

const num = (t: string) => t.replace(/[^0-9.]/g, '');

/**
 * Shared create/edit form. Validation mirrors the backend (title + lead
 * required); the lead is chosen from the existing /leads API.
 */
export default function OpportunityForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: OpportunityInput;
  submitLabel: string;
  onSubmit: (input: OpportunityInput) => Promise<void>;
}) {
  const [form, setForm] = useState<OpportunityInput>(initial ?? emptyOpportunity);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLeads()
      .then(setLeads)
      .catch(() => Toast.show({ type: 'error', text1: 'Unable to load leads' }));
  }, []);

  const set = <K extends keyof OpportunityInput>(key: K, value: OpportunityInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const leadOptions: PickerOption[] = useMemo(
    () =>
      leads.map((l) => ({
        value: l._id,
        label: l.name || 'Unnamed',
        sublabel: l.company || l.email || l.phone,
      })),
    [leads]
  );

  const handleSubmit = async () => {
    const err = validateOpportunity(form);
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
        <SectionTitle>Opportunity</SectionTitle>
        <FormField
          label="Title"
          required
          value={form.title}
          onChangeText={(t) => set('title', t)}
          placeholder="Enterprise CRM deal"
        />
        <SearchablePicker
          label="Lead"
          required
          placeholder="Select lead"
          searchPlaceholder="Search leads…"
          value={form.lead}
          options={leadOptions}
          onSelect={(v) => set('lead', v)}
        />
        <Segmented
          label="Stage"
          options={STAGES}
          value={form.stage}
          onChange={(v) => set('stage', v as Stage)}
          scroll
        />

        <SectionTitle>Deal</SectionTitle>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <FormField
              label="Value (₹)"
              value={form.value}
              onChangeText={(t) => set('value', num(t))}
              keyboardType="numeric"
              placeholder="50000"
            />
          </View>
          <View className="flex-1">
            <FormField
              label="Probability (%)"
              value={form.probability}
              onChangeText={(t) => set('probability', num(t))}
              keyboardType="numeric"
              placeholder="70"
            />
          </View>
        </View>
        <DateField
          label="Expected Close Date"
          value={form.expectedCloseDate}
          onChange={(d) => set('expectedCloseDate', d)}
        />

        <SectionTitle>Notes</SectionTitle>
        <FormField
          label="Notes"
          value={form.notes}
          onChangeText={(t) => set('notes', t)}
          placeholder="Deal context, next steps…"
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
