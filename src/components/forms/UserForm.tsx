import { Feather } from '@expo/vector-icons';
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
  emptyUser,
  USER_STATUSES,
  userErrorMessage,
  type UserInput,
  type UserStatus,
} from '@/services/users';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Web <select> option labels, mapped to the lowercase values the API stores. */
const ROLE_OPTIONS = ['Admin', 'Employee', 'Client'] as const;

function roleLabel(role: string): (typeof ROLE_OPTIONS)[number] {
  const match = ROLE_OPTIONS.find((r) => r.toLowerCase() === role.toLowerCase());
  return match ?? 'Employee';
}

/**
 * Shared user form used by both the Create and Edit User screens — the mobile
 * equivalent of the web Users.jsx drawer. Same fields, same validation, same
 * payload construction.
 */
export default function UserForm({
  initial,
  submitLabel,
  isEdit = false,
  onSubmit,
}: {
  initial?: UserInput;
  submitLabel: string;
  /** Edit mode makes the password optional (blank keeps the existing one). */
  isEdit?: boolean;
  onSubmit: (values: UserInput) => Promise<void>;
}) {
  const [form, setForm] = useState<UserInput>(initial ?? emptyUser);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof UserInput>(key: K, value: UserInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Full name is required';
    if (!form.email.trim()) return 'Email address is required';
    if (!EMAIL_RE.test(form.email.trim()))
      return 'Enter a valid email address';
    // Web: `if (!editingId && !form.password) toast.error("Password is required")`
    if (!isEdit && !form.password) return 'Password is required';
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
      // Surface the API's own validation/error text rather than a generic line.
      Toast.show({
        type: 'error',
        text1: 'Save failed',
        text2: userErrorMessage(error),
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
          Personal Details
        </Text>

        <FormField
          label="Full Name"
          required
          value={form.name}
          onChangeText={(t) => set('name', t)}
          placeholder="Enter full name"
        />
        <FormField
          label="Email Address"
          required
          value={form.email}
          onChangeText={(t) => set('email', t)}
          placeholder="user@company.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <FormField
          label="Password"
          required={!isEdit}
          value={form.password}
          onChangeText={(t) => set('password', t)}
          placeholder={
            isEdit
              ? 'Leave blank to keep existing password'
              : 'Create secure password'
          }
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* Access Control — the web drawer's role + status selects */}
        <View className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <Text className="mb-3 text-sm font-semibold text-slate-700">
            Access Control
          </Text>

          <Segmented
            label="Role"
            options={ROLE_OPTIONS}
            value={roleLabel(form.role)}
            onChange={(v) => set('role', v.toLowerCase())}
            scroll
          />
          <Segmented
            label="Status"
            options={USER_STATUSES}
            value={form.status}
            onChange={(v) => set('status', v as UserStatus)}
          />
        </View>

        {/* Security note (web's indigo callout) */}
        <View className="mb-4 flex-row items-start gap-2 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
          <Feather name="lock" size={14} color="#4338ca" />
          <Text className="flex-1 text-xs leading-relaxed text-indigo-700">
            User credentials are securely managed under ReadyTech Solutions
            enterprise access policy.
          </Text>
        </View>

        <PrimaryButton
          label={submitLabel}
          loadingLabel="Saving…"
          loading={saving}
          onPress={handleSave}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
