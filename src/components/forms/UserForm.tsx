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

import DateField from '@/components/ui/DateField';
import FormField from '@/components/ui/FormField';
import PrimaryButton from '@/components/ui/PrimaryButton';
import SearchablePicker from '@/components/ui/SearchablePicker';
import Segmented from '@/components/ui/Segmented';
import {
  DEPARTMENTS,
  designationsFor,
  emptyUser,
  USER_STATUSES,
  userErrorMessage,
  validateUser,
  type UserInput,
  type UserStatus,
} from '@/services/users';

const toOptions = (values: readonly string[]) => values.map((v) => ({ label: v, value: v }));

const PASSWORD_FIELDS = [
  { key: 'currentPassword', label: 'Old Password' },
  { key: 'newPassword', label: 'New Password' },
  { key: 'confirmPassword', label: 'Confirm New Password' },
] as const;

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

  const handleSave = async () => {
    const err = validateUser(form, isEdit);
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
        {/* Web shows the password field only when creating a user. */}
        {!isEdit && (
          <FormField
            label="Password"
            required
            value={form.password}
            onChangeText={(t) => set('password', t)}
            placeholder="Create secure password"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        )}

        {/* Employment Details — department filters the designation list */}
        <View className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <Text className="mb-3 text-sm font-semibold text-slate-700">
            Employment Details
          </Text>

          <SearchablePicker
            label="Department"
            required
            placeholder="Select Department"
            value={form.department}
            options={toOptions(DEPARTMENTS)}
            onSelect={(v) => setForm((f) => ({ ...f, department: v, designation: '' }))}
          />
          <SearchablePicker
            label="Designation"
            required
            placeholder={form.department ? 'Select Designation' : 'Select department first'}
            value={form.designation}
            options={form.department ? toOptions(designationsFor(form.department)) : []}
            onSelect={(v) => set('designation', v)}
          />
          <FormField
            label="Company"
            value={form.company}
            onChangeText={(t) => set('company', t)}
            placeholder="Company"
          />
          <FormField
            label="Employee ID"
            value={form.employeeId}
            onChangeText={(t) => set('employeeId', t)}
            placeholder="Employee ID"
            autoCapitalize="characters"
          />
          <DateField
            label="Joining Date"
            value={form.joiningDate}
            onChange={(d) => set('joiningDate', d)}
          />
        </View>

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

        {/* Change Password — optional, submitted by the same button */}
        {isEdit && (
          <View className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <Text className="text-sm font-semibold text-slate-700">Change Password</Text>
            <Text className="mb-3 mt-1 text-xs text-slate-500">
              Leave blank to keep your current password.
            </Text>
            {PASSWORD_FIELDS.map((f) => (
              <FormField
                key={f.key}
                label={f.label}
                value={form[f.key]}
                onChangeText={(t) => set(f.key, t)}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            ))}
          </View>
        )}

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
