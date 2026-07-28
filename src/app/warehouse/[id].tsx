import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, Text, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { DetailRow, Section } from '@/components/ui/DetailSection';
import EnterpriseHeader, { HeaderAction } from '@/components/ui/EnterpriseHeader';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  deleteWarehouse,
  fetchWarehouse,
  type Warehouse,
} from '@/services/warehouses';

const joinAddr = (parts: (string | undefined)[]) => parts.filter(Boolean).join(', ');

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <Text className="text-xs text-slate-500">{label}</Text>
      <Text className="mt-1 text-lg font-bold text-slate-900" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function WarehouseDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [w, setW] = useState<Warehouse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(false);
      setLoading(true);
      setW(await fetchWarehouse(id));
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

  const confirmDelete = useCallback(() => {
    if (!id) return;
    Alert.alert('Delete warehouse', `Delete “${w?.name ?? 'this warehouse'}”?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleting(true);
            await deleteWarehouse(id);
            Toast.show({ type: 'success', text1: 'Warehouse deleted' });
            router.back();
          } catch (err: any) {
            setDeleting(false);
            Toast.show({
              type: 'error',
              text1: err?.response?.data?.message ?? 'Failed to delete warehouse',
            });
          }
        },
      },
    ]);
  }, [id, w]);

  const capacity = Number(w?.capacity || 0);
  const stock = Number(w?.currentStock || 0);
  const isActive = (w?.status || 'Active') === 'Active';

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        title="Warehouse"
        badge="ERP"
        right={
          w ? (
            <>
              <HeaderAction
                icon="edit-2"
                onPress={() =>
                  router.push({ pathname: '/warehouse/edit/[id]', params: { id: w._id } })
                }
              />
              <HeaderAction icon="trash-2" color="#fecaca" disabled={deleting} onPress={confirmDelete} />
            </>
          ) : undefined
        }
      >
        {w ? (
          <View className="mt-4">
            <View className="flex-row items-center gap-2">
              <Text className="text-xl font-bold text-white" numberOfLines={1}>
                {w.name}
              </Text>
              {w.isPrimary ? (
                <View className="rounded-full bg-white/15 px-2.5 py-1">
                  <Text className="text-xs font-medium text-white">Primary</Text>
                </View>
              ) : null}
            </View>
            <View className="mt-2 flex-row items-center gap-2">
              <View
                className={`rounded-full px-2.5 py-1 ${isActive ? 'bg-emerald-500/20' : 'bg-white/10'}`}
              >
                <Text className={`text-xs font-medium ${isActive ? 'text-emerald-200' : 'text-slate-200'}`}>
                  {w.status || 'Active'}
                </Text>
              </View>
              {w.code ? (
                <Text className="text-xs text-slate-300">Code: {w.code}</Text>
              ) : null}
            </View>
          </View>
        ) : null}
      </EnterpriseHeader>

      {loading ? (
        <LoadingState label="Loading warehouse…" />
      ) : error || !w ? (
        <MessageState
          icon="alert-triangle"
          tone="error"
          title="Couldn't load warehouse"
          message="This warehouse may have been removed."
          actionLabel="Retry"
          onAction={load}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row gap-3">
            <StatChip label="Capacity" value={`${capacity}`} />
            <StatChip label="Current Stock" value={`${stock}`} />
            <StatChip
              label="Utilisation"
              value={capacity > 0 ? `${Math.round((stock / capacity) * 100)}%` : '—'}
            />
          </View>

          <Section title="Overview">
            <DetailRow icon="hash" label="Code" value={w.code} />
            <DetailRow icon="activity" label="Status" value={w.status} />
            <DetailRow icon="star" label="Primary" value={w.isPrimary ? 'Yes' : 'No'} />
            <DetailRow icon="user" label="Manager" value={w.manager} />
          </Section>

          <Section title="Contact">
            <DetailRow
              icon="phone"
              label="Phone"
              value={w.phone}
              onPress={w.phone ? () => Linking.openURL(`tel:${w.phone}`) : undefined}
            />
            <DetailRow
              icon="mail"
              label="Email"
              value={w.email}
              onPress={w.email ? () => Linking.openURL(`mailto:${w.email}`) : undefined}
            />
          </Section>

          <Section title="Location">
            <DetailRow icon="map-pin" label="Location" value={w.location} />
            <DetailRow
              icon="map"
              label="Address"
              value={joinAddr([w.address, w.city, w.state, w.pincode, w.country])}
            />
          </Section>

          {w.description ? (
            <Section title="Description">
              <Text className="pb-4 pt-1 text-sm leading-relaxed text-slate-700">
                {w.description}
              </Text>
            </Section>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
