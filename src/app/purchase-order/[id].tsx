import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { DetailRow, Section } from '@/components/ui/DetailSection';
import EnterpriseHeader, { HeaderAction } from '@/components/ui/EnterpriseHeader';
import PrimaryButton from '@/components/ui/PrimaryButton';
import SearchablePicker from '@/components/ui/SearchablePicker';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import { money } from '@/services/invoices';
import {
  fetchPurchaseOrder,
  lineTotal,
  poTotal,
  receivePurchaseOrder,
  refName,
  STATUS_LABEL,
  type PurchaseOrder,
} from '@/services/purchaseOrders';
import {
  defaultWarehouseId,
  fetchWarehouses,
  warehousePickerOptions,
  type Warehouse,
} from '@/services/warehouses';

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : undefined;

export default function PurchaseOrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Once data is on screen, a failed refresh keeps it and toasts instead of blanking the view.
  const loadedRef = useRef(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouse, setWarehouse] = useState('');
  const [receiving, setReceiving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(false);
      setLoading(true);
      const order = await fetchPurchaseOrder(id);
      setPo(order);
      loadedRef.current = true;
      if (order.status === 'DRAFT') {
        const rows = await fetchWarehouses().catch(() => [] as Warehouse[]);
        setWarehouses(rows);
        setWarehouse((cur) => cur || defaultWarehouseId(rows));
      }
    } catch (err: any) {
      if (loadedRef.current) {
        Toast.show({
          type: 'error',
          text1: "Couldn't refresh purchase order",
          text2: err?.response?.data?.message ?? 'Showing the last loaded data.',
        });
      } else {
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const warehouseOpts = useMemo(() => warehousePickerOptions(warehouses), [warehouses]);

  const confirmReceive = () => {
    if (!id || !po) return;
    if (!warehouse) {
      Toast.show({ type: 'error', text1: 'Warehouse is required' });
      return;
    }
    const name = warehouses.find((w) => w._id === warehouse)?.name ?? 'the selected warehouse';
    Alert.alert('Receive purchase order', `Add all ${po.items.length} item(s) of ${po.poNumber} to ${name}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Receive',
        onPress: async () => {
          try {
            setReceiving(true);
            await receivePurchaseOrder(id, warehouse);
            Toast.show({ type: 'success', text1: 'PO received & stock updated' });
            await load();
          } catch (err: any) {
            Toast.show({
              type: 'error',
              text1: err?.response?.data?.message ?? 'Failed to receive purchase order',
            });
          } finally {
            setReceiving(false);
          }
        },
      },
    ]);
  };

  const received = po?.status === 'RECEIVED';

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        title="Purchase Order"
        badge="ERP"
        right={po ? <HeaderAction icon="refresh-cw" onPress={load} /> : undefined}
      >
        {po ? (
          <View className="mt-4">
            <Text className="text-xl font-bold text-white" numberOfLines={1}>
              {po.poNumber}
            </Text>
            <View className="mt-2 flex-row items-center gap-2">
              <View className={`rounded-full px-2.5 py-1 ${received ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                <Text className={`text-xs font-medium ${received ? 'text-emerald-200' : 'text-amber-200'}`}>
                  {STATUS_LABEL[po.status] ?? po.status}
                </Text>
              </View>
              <Text className="text-xs text-slate-300">{refName(po.vendor, 'Unknown vendor')}</Text>
            </View>
          </View>
        ) : null}
      </EnterpriseHeader>

      {loading && !po ? (
        <LoadingState label="Loading purchase order…" />
      ) : error || !po ? (
        <MessageState
          icon="alert-triangle"
          tone="error"
          title="Couldn't load purchase order"
          message="This purchase order may have been removed."
          actionLabel="Retry"
          onAction={load}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Section title="Overview">
            <DetailRow icon="truck" label="Vendor" value={refName(po.vendor)} />
            <DetailRow icon="activity" label="Status" value={STATUS_LABEL[po.status] ?? po.status} />
            <DetailRow icon="calendar" label="Created" value={formatDate(po.createdAt)} />
            <DetailRow icon="clock" label="Updated" value={formatDate(po.updatedAt)} />
          </Section>

          <Section title={`Items (${po.items.length})`}>
            {po.items.map((item, i) => (
              <View
                key={item._id ?? i}
                className={`flex-row items-center py-3 ${i > 0 ? 'border-t border-slate-100' : ''}`}
              >
                <View className="flex-1 pr-3">
                  <Text className="text-sm font-medium text-slate-900" numberOfLines={1}>
                    {refName(item.product, 'Deleted product')}
                  </Text>
                  <Text className="text-xs text-slate-500">
                    {item.qty} × {money(item.cost)}
                  </Text>
                </View>
                <Text className="text-sm font-semibold text-slate-900">{money(lineTotal(item))}</Text>
              </View>
            ))}
            <View className="flex-row items-center justify-between border-t border-slate-200 py-3">
              <Text className="text-sm font-semibold text-slate-700">Total</Text>
              <Text className="text-lg font-bold text-slate-900">{money(poTotal(po))}</Text>
            </View>
          </Section>

          {!received ? (
            <Section title="Receive Stock">
              <View className="pt-2">
                <SearchablePicker
                  label="Warehouse"
                  required
                  placeholder={warehouseOpts.length ? 'Select warehouse' : 'No active warehouses'}
                  value={warehouse}
                  options={warehouseOpts}
                  onSelect={setWarehouse}
                  searchPlaceholder="Search warehouses…"
                />
                <View className="pb-4">
                  <PrimaryButton
                    label="Receive Purchase Order"
                    loadingLabel="Receiving…"
                    loading={receiving}
                    disabled={!warehouse}
                    onPress={confirmReceive}
                  />
                </View>
              </View>
            </Section>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
