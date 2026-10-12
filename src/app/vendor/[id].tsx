import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, Linking, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { DetailRow, Section } from '@/components/ui/DetailSection';
import EnterpriseHeader, { HeaderAction } from '@/components/ui/EnterpriseHeader';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  deleteVendor,
  fetchVendor,
  getCachedVendor,
  vendorStatus,
  type Vendor,
} from '@/services/vendors';
import { goBackOr } from '@/utils/nav';

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : undefined;

export default function VendorDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // No GET /vendors/:id — start from the record cached by the list screen.
  const [v, setV] = useState<Vendor | null>(() => (id ? getCachedVendor(id) ?? null : null));
  const [loading, setLoading] = useState(!v);
  const [error, setError] = useState(false);
  // Once data is on screen, a failed refresh keeps it and toasts instead of blanking the view.
  const loadedRef = useRef(Boolean(v));
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(
    async (force = false) => {
      if (!id) return;
      try {
        setError(false);
        if (force || !getCachedVendor(id)) setLoading(true);
        setV(await fetchVendor(id, force));
        loadedRef.current = true;
      } catch (err: any) {
        if (loadedRef.current) {
          Toast.show({
            type: 'error',
            text1: "Couldn't refresh vendor",
            text2: err?.response?.data?.message ?? 'Showing the last loaded data.',
          });
        } else {
          setError(true);
        }
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const confirmDelete = useCallback(() => {
    if (!id) return;
    Alert.alert('Delete vendor', `Delete “${v?.name ?? 'this vendor'}”?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleting(true);
            await deleteVendor(id);
            Toast.show({ type: 'success', text1: 'Vendor removed' });
            goBackOr('/vendors');
          } catch (err: any) {
            setDeleting(false);
            Toast.show({
              type: 'error',
              text1: err?.response?.data?.message ?? 'Delete failed',
            });
          }
        },
      },
    ]);
  }, [id, v]);

  const isActive = v ? vendorStatus(v) === 'Active' : false;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        title="Vendor"
        badge="ERP"
        right={
          v ? (
            <>
              <HeaderAction icon="refresh-cw" onPress={() => load(true)} />
              <HeaderAction
                icon="edit-2"
                onPress={() =>
                  router.push({ pathname: '/vendor/edit/[id]', params: { id: v._id } })
                }
              />
              <HeaderAction icon="trash-2" color="#fecaca" disabled={deleting} onPress={confirmDelete} />
            </>
          ) : undefined
        }
      >
        {v ? (
          <View className="mt-4">
            <Text className="text-xl font-bold text-white" numberOfLines={1}>
              {v.name}
            </Text>
            <View className="mt-2 flex-row">
              <View
                className={`rounded-full px-2.5 py-1 ${isActive ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}
              >
                <Text className={`text-xs font-medium ${isActive ? 'text-emerald-200' : 'text-amber-200'}`}>
                  {isActive ? 'Active' : 'Pending Setup'}
                </Text>
              </View>
            </View>
          </View>
        ) : null}
      </EnterpriseHeader>

      {loading && !v ? (
        <LoadingState label="Loading vendor…" />
      ) : error || !v ? (
        <MessageState
          icon="alert-triangle"
          tone="error"
          title="Couldn't load vendor"
          message="This vendor may have been removed."
          actionLabel="Retry"
          onAction={() => load(true)}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <Section title="Contact">
            <DetailRow
              icon="phone"
              label="Phone"
              value={v.phone}
              onPress={v.phone ? () => Linking.openURL(`tel:${v.phone}`) : undefined}
            />
            <DetailRow
              icon="mail"
              label="Email"
              value={v.email}
              onPress={v.email ? () => Linking.openURL(`mailto:${v.email}`) : undefined}
            />
            <DetailRow icon="map-pin" label="Address" value={v.address} />
          </Section>

          <Section title="Record">
            <DetailRow icon="calendar" label="Created" value={formatDate(v.createdAt)} />
            <DetailRow icon="clock" label="Updated" value={formatDate(v.updatedAt)} />
          </Section>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
