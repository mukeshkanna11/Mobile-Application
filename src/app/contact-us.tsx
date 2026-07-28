import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import FormField from '@/components/ui/FormField';
import PrimaryButton from '@/components/ui/PrimaryButton';
import Segmented from '@/components/ui/Segmented';
import API from '@/services/api';

const EXPERTISE = [
  'CRM Development',
  'Web Development',
  'Mobile App',
  'Automation & AI',
] as const;

const WHATSAPP = '919000000000';
const PHONE = '+91 90000 00000';
const EMAIL = 'support@readytechsolutions.com';

interface ContactUsForm {
  name: string;
  email: string;
  phone: string;
  location: string;
  expertise: string;
  message: string;
}

const EMPTY: ContactUsForm = {
  name: '',
  email: '',
  phone: '',
  location: '',
  expertise: '',
  message: '',
};

type Errors = Partial<Record<keyof ContactUsForm, string>>;

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <Text className="-mt-2 mb-3 text-xs text-red-500">{error}</Text>;
}

export default function ContactUsScreen() {
  const [form, setForm] = useState<ContactUsForm>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  const set = <K extends keyof ContactUsForm>(key: K, value: ContactUsForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  /* ================= VALIDATION (identical to web) ================= */
  const validate = (): boolean => {
    const newErrors: Errors = {};
    if (!form.name) newErrors.name = 'Name is required';
    if (!form.email) newErrors.email = 'Email is required';
    if (!form.phone) newErrors.phone = 'Phone is required';
    if (!form.expertise) newErrors.expertise = 'Select expertise';
    if (!form.message) newErrors.message = 'Message required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ================= SUBMIT (mirrors web FormData POST /contact) ================= */
  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const data = new FormData();
      (Object.keys(form) as (keyof ContactUsForm)[]).forEach((key) =>
        data.append(key, form[key])
      );

      // Let axios/React Native set `multipart/form-data; boundary=…` itself —
      // overriding the instance's JSON default with a boundary-less type would
      // make the FormData body unparseable on the server.
      await API.post('/contact', data, {
        headers: { 'Content-Type': undefined } as never,
      });

      Toast.show({ type: 'success', text1: 'Message sent successfully!' });
      setForm(EMPTY);
    } catch {
      Toast.show({ type: 'error', text1: 'Something went wrong' });
    } finally {
      setLoading(false);
    }
  };

  const openUrl = (url: string) =>
    Linking.openURL(url).catch(() =>
      Toast.show({ type: 'error', text1: 'Unable to open' })
    );

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        icon="message-circle"
        title="Contact Us"
        badge="ReadyTech Solutions"
        subtitle="Connect with our team of experts"
      >
        <View className="mt-4 flex-row gap-3">
          <Pressable
            onPress={() => openUrl(`tel:${PHONE.replace(/\s/g, '')}`)}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 py-2.5 active:opacity-80"
          >
            <Feather name="phone" size={15} color="#ffffff" />
            <Text className="text-xs font-semibold text-white">Call</Text>
          </Pressable>
          <Pressable
            onPress={() => openUrl(`mailto:${EMAIL}`)}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 py-2.5 active:opacity-80"
          >
            <Feather name="mail" size={15} color="#ffffff" />
            <Text className="text-xs font-semibold text-white">Email</Text>
          </Pressable>
          <Pressable
            onPress={() => openUrl(`https://wa.me/${WHATSAPP}`)}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-green-500 py-2.5 active:opacity-80"
          >
            <Feather name="message-circle" size={15} color="#ffffff" />
            <Text className="text-xs font-semibold text-white">WhatsApp</Text>
          </Pressable>
        </View>
      </EnterpriseHeader>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-xl font-bold text-slate-900">
            Let’s talk about your project
          </Text>
          <Text className="mb-5 mt-1 text-sm text-slate-500">
            CRM, Automation, Web & Mobile Development, AI solutions.
          </Text>

          <FormField
            label="Full Name"
            required
            value={form.name}
            onChangeText={(t) => set('name', t)}
            placeholder="John Smith"
          />
          <FieldError error={errors.name} />

          <FormField
            label="Email Address"
            required
            value={form.email}
            onChangeText={(t) => set('email', t)}
            placeholder="john@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <FieldError error={errors.email} />

          <FormField
            label="Phone Number"
            required
            value={form.phone}
            onChangeText={(t) => set('phone', t)}
            placeholder="+91 9876543210"
            keyboardType="phone-pad"
          />
          <FieldError error={errors.phone} />

          <FormField
            label="Location"
            value={form.location}
            onChangeText={(t) => set('location', t)}
            placeholder="City, Country"
          />

          <Segmented
            label="Expertise"
            options={EXPERTISE}
            value={form.expertise as (typeof EXPERTISE)[number]}
            onChange={(v) => set('expertise', v)}
            scroll
          />
          <FieldError error={errors.expertise} />

          <FormField
            label="Message"
            required
            value={form.message}
            onChangeText={(t) => set('message', t)}
            placeholder="Tell us about your project…"
            multiline
          />
          <FieldError error={errors.message} />

          <View className="mt-2">
            <PrimaryButton
              label="Submit"
              loadingLabel="Sending…"
              loading={loading}
              onPress={handleSubmit}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* WhatsApp float */}
      <Pressable
        onPress={() => openUrl(`https://wa.me/${WHATSAPP}`)}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-green-500 shadow-lg active:opacity-90"
      >
        <Feather name="message-circle" size={26} color="#ffffff" />
      </Pressable>
    </SafeAreaView>
  );
}
