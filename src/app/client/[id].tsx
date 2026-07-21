import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import EnterpriseHeader, { HeaderAction } from '@/components/ui/EnterpriseHeader';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  deleteClient,
  fetchClient,
  type Address,
  type Client,
} from '@/services/clients';

type FeatherName = keyof typeof Feather.glyphMap;

function DetailRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: FeatherName;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  if (!value) return null;
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      className="flex-row items-center gap-3 py-3"
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-slate-100">
        <Feather name={icon} size={16} color="#4f46e5" />
      </View>
      <View className="flex-1">
        <Text className="text-xs text-slate-400">{label}</Text>
        <Text
          className={`text-sm ${onPress ? 'text-indigo-600' : 'text-slate-800'}`}
        >
          {value}
        </Text>
      </View>
      {onPress && <Feather name="external-link" size={16} color="#cbd5e1" />}
    </Pressable>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-4 rounded-2xl border border-slate-100 bg-white px-4 shadow-sm">
      <Text className="pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </Text>
      {children}
    </View>
  );
}

function formatAddress(addr?: Address): string | undefined {
  if (!addr) return undefined;
  const parts = [
    addr.addressLine1,
    addr.addressLine2,
    addr.city,
    addr.state,
    addr.pincode,
    addr.country,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : undefined;
}

export default function ClientDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(false);
      setLoading(true);
      const data = await fetchClient(id);
      setClient(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Refresh on focus so edits reflect when returning from the edit screen.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const confirmDelete = useCallback(() => {
    if (!id) return;
    Alert.alert(
      'Delete client',
      `Delete “${client?.companyName ?? 'this client'}” permanently?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteClient(id);
              Toast.show({ type: 'success', text1: 'Client removed' });
              router.back();
            } catch (err: any) {
              setDeleting(false);
              Toast.show({
                type: 'error',
                text1: 'Delete failed',
                text2: err?.response?.data?.message ?? 'Please try again.',
              });
            }
          },
        },
      ]
    );
  }, [id, client]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* Enterprise gradient profile header */}
      <EnterpriseHeader
        onBack
        title="Client Profile"
        badge="ReadyTech Solutions"
        right={
          client ? (
            <>
              <HeaderAction
                icon="edit-2"
                onPress={() =>
                  router.push({
                    pathname: '/client/edit/[id]',
                    params: { id: client._id },
                  })
                }
              />
              <HeaderAction
                icon="trash-2"
                color="#fecaca"
                disabled={deleting}
                onPress={confirmDelete}
              />
            </>
          ) : undefined
        }
      >
        {client ? (
          <View className="mt-4 flex-row items-center gap-4">
            <View className="h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
              <Text className="text-2xl font-black text-white">
                {(client.companyName || client.contactPerson || '?')
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-white" numberOfLines={1}>
                {client.companyName || client.contactPerson || 'Unnamed Client'}
              </Text>
              <Text className="text-xs text-slate-300" numberOfLines={1}>
                {client.contactPerson}
              </Text>
              <View className="mt-2 flex-row flex-wrap gap-2">
                <View
                  className={`flex-row items-center gap-1.5 rounded-full px-2.5 py-1 ${
                    client.status === 'Active'
                      ? 'bg-green-500/20'
                      : 'bg-white/10'
                  }`}
                >
                  <View
                    className={`h-1.5 w-1.5 rounded-full ${
                      client.status === 'Active'
                        ? 'bg-green-400'
                        : 'bg-slate-300'
                    }`}
                  />
                  <Text
                    className={`text-xs font-semibold ${
                      client.status === 'Active'
                        ? 'text-green-200'
                        : 'text-slate-200'
                    }`}
                  >
                    {client.status ?? 'Unknown'}
                  </Text>
                </View>
                {client.clientType ? (
                  <View className="rounded-full bg-blue-400/20 px-2.5 py-1">
                    <Text className="text-xs font-medium text-blue-200">
                      {client.clientType}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}
      </EnterpriseHeader>

      {loading ? (
        <LoadingState label="Loading client…" />
      ) : error || !client ? (
        <MessageState
          icon="alert-triangle"
          tone="error"
          title="Couldn't load client"
          message="This client may have been removed."
          actionLabel="Retry"
          onAction={load}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <Section title="Contact">
            <DetailRow
              icon="mail"
              label="Email"
              value={client.email}
              onPress={
                client.email
                  ? () => Linking.openURL(`mailto:${client.email}`)
                  : undefined
              }
            />
            <DetailRow
              icon="phone"
              label="Phone"
              value={client.phone}
              onPress={
                client.phone
                  ? () => Linking.openURL(`tel:${client.phone}`)
                  : undefined
              }
            />
            <DetailRow
              icon="globe"
              label="Website"
              value={client.website}
              onPress={
                client.website
                  ? () =>
                      Linking.openURL(
                        client.website!.startsWith('http')
                          ? client.website!
                          : `https://${client.website}`
                      )
                  : undefined
              }
            />
          </Section>

          {(client.gstNumber || client.panNumber) && (
            <Section title="Tax">
              <DetailRow
                icon="file-text"
                label="GST Number"
                value={client.gstNumber}
              />
              <DetailRow
                icon="credit-card"
                label="PAN Number"
                value={client.panNumber}
              />
            </Section>
          )}

          {(formatAddress(client.billingAddress) ||
            formatAddress(client.shippingAddress)) && (
            <Section title="Addresses">
              <DetailRow
                icon="map-pin"
                label="Billing"
                value={formatAddress(client.billingAddress)}
              />
              <DetailRow
                icon="truck"
                label="Shipping"
                value={formatAddress(client.shippingAddress)}
              />
            </Section>
          )}

          {(client.currentPlan || client.subscriptionStatus) && (
            <Section title="Subscription">
              <DetailRow
                icon="award"
                label="Current Plan"
                value={client.currentPlan}
              />
              <DetailRow
                icon="refresh-cw"
                label="Status"
                value={client.subscriptionStatus}
              />
            </Section>
          )}

          {client.notes ? (
            <Section title="Notes">
              <Text className="pb-4 pt-1 text-sm leading-relaxed text-slate-700">
                {client.notes}
              </Text>
            </Section>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
