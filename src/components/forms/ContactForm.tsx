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

export interface ContactFormValues {
  name: string;
  company: string;
  email: string;
  phone: string;
  notes: string;
}

export const emptyContact: ContactFormValues = {
  name: '',
  company: '',
  email: '',
  phone: '',
  notes: '',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Shared contact form used by both the Create and Edit Contact screens.
 */
export default function ContactForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: ContactFormValues;
  submitLabel: string;
  onSubmit: (values: ContactFormValues) => Promise<void>;
}) {
  const [form, setForm] = useState<ContactFormValues>(initial ?? emptyContact);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ContactFormValues>(
    key: K,
    value: ContactFormValues[K]
  ) => setForm((f) => ({ ...f, [key]: value }));

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Contact name is required';
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim()))
      return 'Enter a valid email address';
    if (form.phone.trim() && form.phone.replace(/\D/g, '').length < 7)
      return 'Enter a valid phone number';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
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
        <Text className="mb-3 mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Contact Information
        </Text>

        <FormField
          label="Full Name"
          required
          value={form.name}
          onChangeText={(t) => set('name', t)}
          placeholder="John Smith"
        />
        <FormField
          label="Company"
          value={form.company}
          onChangeText={(t) => set('company', t)}
          placeholder="ABC Technologies"
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
        <FormField
          label="Notes"
          value={form.notes}
          onChangeText={(t) => set('notes', t)}
          placeholder="Add a note about this contact…"
          multiline
        />

        <View className="mt-4">
          <PrimaryButton
            label={submitLabel}
            loadingLabel="Saving…"
            loading={saving}
            onPress={handleSave}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
