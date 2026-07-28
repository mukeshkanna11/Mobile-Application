import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { DetailRow, Section } from '@/components/ui/DetailSection';
import EnterpriseHeader, { HeaderAction } from '@/components/ui/EnterpriseHeader';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import API from '@/services/api';

type FeatherName = keyof typeof Feather.glyphMap;

interface Contact {
  _id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

function initials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || '?'
  );
}

function QuickAction({
  icon,
  label,
  color,
  onPress,
  disabled,
}: {
  icon: FeatherName;
  label: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-1 items-center gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ${
        disabled ? 'opacity-40' : 'active:opacity-80'
      }`}
    >
      <View
        className="h-11 w-11 items-center justify-center rounded-full"
        style={{ backgroundColor: `${color}1A` }}
      >
        <Feather name={icon} size={20} color={color} />
      </View>
      <Text className="text-xs font-medium text-slate-700">{label}</Text>
    </Pressable>
  );
}

export default function ContactDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(false);
      setLoading(true);
      const { data } = await API.get(`/clients/${id}`);
      const c = (data?.data ?? data) as any;
      setContact({
        _id: c._id,
        name: c.companyName || c.contactPerson || 'Unnamed',
        company: c.companyName,
        email: c.email,
        phone: c.phone,
        notes: c.notes,
      });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openUrl = (url: string) =>
    Linking.openURL(url).catch(() =>
      Toast.show({ type: 'error', text1: 'Unable to open' })
    );

  const phoneDigits = (contact?.phone ?? '').replace(/[^\d]/g, '');

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        title="Contact"
        badge="ReadyTech Solutions"
        right={
          contact ? (
            <HeaderAction
              icon="edit-2"
              onPress={() =>
                router.push({
                  pathname: '/client/edit/[id]',
                  params: { id: contact._id },
                })
              }
            />
          ) : undefined
        }
      >
        {contact ? (
          <View className="mt-4 flex-row items-center gap-4">
            <View className="h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10">
              <Text className="text-2xl font-black text-white">
                {initials(contact.name)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-white" numberOfLines={1}>
                {contact.name}
              </Text>
              {contact.company ? (
                <Text className="text-xs text-slate-300" numberOfLines={1}>
                  {contact.company}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}
      </EnterpriseHeader>

      {loading ? (
        <LoadingState label="Loading contact…" />
      ) : error || !contact ? (
        <MessageState
          icon="alert-triangle"
          tone="error"
          title="Couldn't load contact"
          message="This contact may have been removed."
          actionLabel="Retry"
          onAction={load}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick actions */}
          <View className="flex-row gap-3">
            <QuickAction
              icon="phone"
              label="Call"
              color="#4f46e5"
              disabled={!contact.phone}
              onPress={() => openUrl(`tel:${contact.phone}`)}
            />
            <QuickAction
              icon="message-circle"
              label="WhatsApp"
              color="#16a34a"
              disabled={!phoneDigits}
              onPress={() => openUrl(`https://wa.me/${phoneDigits}`)}
            />
            <QuickAction
              icon="mail"
              label="Email"
              color="#0ea5e9"
              disabled={!contact.email}
              onPress={() => openUrl(`mailto:${contact.email}`)}
            />
          </View>

          <Section title="Contact Information">
            <DetailRow
              icon="phone"
              label="Phone"
              value={contact.phone}
              onPress={
                contact.phone ? () => openUrl(`tel:${contact.phone}`) : undefined
              }
            />
            <DetailRow
              icon="mail"
              label="Email"
              value={contact.email}
              onPress={
                contact.email
                  ? () => openUrl(`mailto:${contact.email}`)
                  : undefined
              }
            />
            <DetailRow icon="briefcase" label="Company" value={contact.company} />
          </Section>

          <Section title="Notes">
            <Text className="pb-4 pt-1 text-sm leading-relaxed text-slate-700">
              {contact.notes || 'No notes added for this contact yet.'}
            </Text>
          </Section>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
