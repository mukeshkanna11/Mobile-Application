import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import FormField from '@/components/ui/FormField';
import PrimaryButton from '@/components/ui/PrimaryButton';
import {
  emptyEnquiry,
  submitEnquiry,
  SUPPORT_CATEGORIES,
  validateEnquiry,
  type EnquiryForm,
} from '@/services/chatSupport';

const SUCCESS_TEXT =
  'Thank you! Your enquiry has been submitted successfully. Our team will contact you shortly.';

/**
 * Floating "brain" support launcher + enquiry chat — mobile port of the web
 * ChatSupportWidget (same fields, requirement chips, validation, payload and
 * messages). Submitting hits POST /chat, where the backend creates the Chat,
 * the Lead and sends the company email. Mounted once in the root layout; hidden
 * on the login screen, as the web widget only lives in the dashboard layout.
 */
export default function SupportChatWidget() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<EnquiryForm>(emptyEnquiry);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  if (pathname === '/') return null;

  /** Web handleChange: editing clears the banners. */
  const set = (key: keyof EnquiryForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError('');
    setSuccess('');
  };

  const close = () => {
    if (sendingRef.current) return;
    setOpen(false);
    setError('');
    setSuccess('');
  };

  const submit = async () => {
    if (sendingRef.current) return;
    setError('');
    setSuccess('');
    const invalid = validateEnquiry(form);
    if (invalid) {
      setError(invalid);
      return;
    }
    sendingRef.current = true;
    setSending(true);
    try {
      await submitEnquiry(form);
      setSuccess(SUCCESS_TEXT);
      setForm(emptyEnquiry);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to submit your enquiry. Please try again.');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  return (
    <>
      {/* Stacked above the tab bar (62) + the screens' "+" FAB (bottom-6, 56) with a 16px gap,
          right-aligned with that FAB so the two never overlap. */}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Open support chat"
        hitSlop={8}
        style={{ position: 'absolute', right: 24, bottom: insets.bottom + 62 + 24 + 56 + 16, elevation: 8 }}
        className="h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-indigo-600 shadow-lg active:opacity-90"
      >
        <Feather name="message-circle" size={26} color="#ffffff" />
      </Pressable>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
        <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
          {/* HEADER */}
          <View className="flex-row items-center bg-indigo-600 px-4 py-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-white/15">
              <MaterialCommunityIcons name="brain" size={22} color="#ffffff" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-base font-semibold text-white">ReadyTech Support</Text>
              <Text className="text-xs text-indigo-100">How can we help you?</Text>
            </View>
            <Pressable onPress={close} disabled={sending} hitSlop={10} accessibilityLabel="Close support form">
              <Feather name="x" size={22} color="#ffffff" />
            </Pressable>
          </View>

          <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View className="mb-4 max-w-[90%] self-start rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3">
                <Text className="text-sm text-slate-700">
                  Hi! 👋 Tell us what you need and our team will get back to you shortly.
                </Text>
              </View>

              {success ? (
                <View className="mb-4 flex-row items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                  <Feather name="check-circle" size={16} color="#059669" />
                  <Text className="flex-1 text-sm text-emerald-800">{success}</Text>
                </View>
              ) : null}

              {error ? (
                <View className="mb-4 flex-row items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3">
                  <Feather name="alert-triangle" size={16} color="#e11d48" />
                  <Text className="flex-1 text-sm text-rose-700">{error}</Text>
                </View>
              ) : null}

              {!success ? (
                <>
                  <FormField label="Name" required value={form.name} onChangeText={(t) => set('name', t)} placeholder="Enter your name" />
                  <FormField
                    label="Email"
                    required
                    value={form.email}
                    onChangeText={(t) => set('email', t)}
                    placeholder="you@company.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <FormField
                        label="Phone"
                        required
                        value={form.phone}
                        onChangeText={(t) => set('phone', t)}
                        placeholder="9876543210"
                        keyboardType="phone-pad"
                      />
                    </View>
                    <View className="flex-1">
                      <FormField label="Company" required value={form.company} onChangeText={(t) => set('company', t)} placeholder="Company name" />
                    </View>
                  </View>

                  {/* Requirement — the web <select>, shown as quick-pick chips */}
                  <Text className="mb-1.5 text-sm font-medium text-slate-700">
                    Requirement<Text className="text-red-500"> *</Text>
                  </Text>
                  <View className="mb-4 flex-row flex-wrap gap-2">
                    {SUPPORT_CATEGORIES.map((c) => {
                      const active = form.category === c;
                      return (
                        <Pressable
                          key={c}
                          onPress={() => set('category', c)}
                          className={`rounded-full border px-3 py-2 ${active ? 'border-indigo-600 bg-indigo-600' : 'border-slate-200 bg-white'}`}
                        >
                          <Text className={`text-xs font-medium ${active ? 'text-white' : 'text-slate-600'}`}>{c}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <FormField
                    label="Message"
                    required
                    value={form.message}
                    onChangeText={(t) => set('message', t)}
                    placeholder="Tell us how we can help..."
                    multiline
                  />

                  <PrimaryButton label="Submit Enquiry" loadingLabel="Sending..." loading={sending} onPress={submit} />
                </>
              ) : (
                <PrimaryButton label="Submit Another Enquiry" onPress={() => setSuccess('')} />
              )}

              <Text className="mt-4 text-center text-[11px] text-slate-400">
                Your enquiry will be securely sent to the ReadyTech team.
              </Text>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}
