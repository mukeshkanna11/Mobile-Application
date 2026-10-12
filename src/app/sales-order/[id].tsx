import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { DetailRow, Section } from '@/components/ui/DetailSection';
import EnterpriseHeader, { HeaderAction } from '@/components/ui/EnterpriseHeader';
import PrimaryButton from '@/components/ui/PrimaryButton';
import SearchablePicker from '@/components/ui/SearchablePicker';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import { money } from '@/services/invoices';
import {
  approveSalesOrder,
  cancelSalesOrder,
  canApprove,
  canCancel,
  canDelete,
  canDeliver,
  canEdit,
  customerName,
  deleteSalesOrder,
  deliverSalesOrder,
  fetchSalesOrder,
  lineTotal,
  productName,
  reservedWarehouseId,
  soTotal,
  STATUS_LABEL,
  userName,
  type SalesOrder,
} from '@/services/salesOrders';
import {
  defaultWarehouseId,
  fetchWarehouses,
  warehousePickerOptions,
  type Warehouse,
} from '@/services/warehouses';
import { goBackOr } from '@/utils/nav';

/** Sentinel for "approve without reserving stock" (backend warehouse is optional). */
const NO_RESERVATION = '__none__';

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : undefined;

const HEADER_PILL: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: 'bg-amber-500/20', text: 'text-amber-200' },
  APPROVED: { bg: 'bg-indigo-500/30', text: 'text-indigo-100' },
  DELIVERED: { bg: 'bg-emerald-500/20', text: 'text-emerald-200' },
  CANCELLED: { bg: 'bg-white/10', text: 'text-slate-200' },
};

export default function SalesOrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [so, setSo] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Once data is on screen, a failed refresh keeps it and toasts instead of blanking the view.
  const loadedRef = useRef(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouse, setWarehouse] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(false);
      setLoading(true);
      const order = await fetchSalesOrder(id);
      setSo(order);
      loadedRef.current = true;
      // Warehouses are needed to approve (optional reservation) or deliver (if none reserved).
      if (canApprove(order.status) || (canDeliver(order.status) && !reservedWarehouseId(order))) {
        const rows = await fetchWarehouses().catch(() => [] as Warehouse[]);
        setWarehouses(rows);
        setWarehouse((cur) => cur || defaultWarehouseId(rows));
      }
    } catch (err: any) {
      if (loadedRef.current) {
        Toast.show({
          type: 'error',
          text1: "Couldn't refresh sales order",
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

  const reservedId = so ? reservedWarehouseId(so) : '';
  const approving = so ? canApprove(so.status) : false;
  const delivering = so ? canDeliver(so.status) : false;

  const warehouseOpts = useMemo(() => {
    const opts = warehousePickerOptions(warehouses);
    return approving
      ? [{ label: 'No reservation', sublabel: 'Approve without reserving stock', value: NO_RESERVATION }, ...opts]
      : opts;
  }, [warehouses, approving]);

  const whName = (wid: string) => warehouses.find((w) => w._id === wid)?.name ?? 'the selected warehouse';

  /** Confirm, run a workflow call, toast the result, then reload (or leave). */
  const confirmAction = (
    title: string,
    message: string,
    label: string,
    run: () => Promise<void>,
    success: string,
    opts: { destructive?: boolean; leave?: boolean } = {}
  ) =>
    Alert.alert(title, message, [
      { text: 'Back', style: 'cancel' },
      {
        text: label,
        style: opts.destructive ? 'destructive' : 'default',
        onPress: async () => {
          try {
            setBusy(true);
            await run();
            Toast.show({ type: 'success', text1: success });
            if (opts.leave) goBackOr('/sales-orders');
            else await load();
          } catch (err: any) {
            Toast.show({ type: 'error', text1: err?.response?.data?.message ?? `${label} failed` });
          } finally {
            setBusy(false);
          }
        },
      },
    ]);

  const onApprove = () => {
    if (!id || !so) return;
    const wh = warehouse && warehouse !== NO_RESERVATION ? warehouse : undefined;
    confirmAction(
      'Approve sales order',
      wh
        ? `Approve ${so.soNumber} and reserve stock in ${whName(wh)}?`
        : `Approve ${so.soNumber} without reserving stock?`,
      'Approve',
      () => approveSalesOrder(id, wh),
      'Sales order approved successfully'
    );
  };

  const onDeliver = () => {
    if (!id || !so) return;
    if (!reservedId && !warehouse) {
      Toast.show({ type: 'error', text1: 'Warehouse is required' });
      return;
    }
    confirmAction(
      'Deliver sales order',
      `Mark ${so.soNumber} as delivered and deduct stock${reservedId ? ' from the reserved warehouse' : ` from ${whName(warehouse)}`}? This cannot be undone.`,
      'Deliver',
      () => deliverSalesOrder(id, reservedId ? undefined : warehouse),
      'Sales order delivered successfully'
    );
  };

  const onCancel = () => {
    if (!id || !so) return;
    confirmAction(
      'Cancel sales order',
      `Cancel ${so.soNumber}?${so.status === 'APPROVED' && reservedId ? ' Reserved stock will be released.' : ''}`,
      'Cancel Order',
      () => cancelSalesOrder(id),
      'Sales order cancelled successfully',
      { destructive: true }
    );
  };

  const onDelete = () => {
    if (!id || !so) return;
    confirmAction(
      'Delete sales order',
      `Delete ${so.soNumber}? This cannot be undone.`,
      'Delete',
      () => deleteSalesOrder(id),
      'Sales order deleted successfully',
      { destructive: true, leave: true }
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        title="Sales Order"
        badge="ERP"
        right={
          so ? (
            <>
              <HeaderAction icon="refresh-cw" onPress={load} />
              {canEdit(so.status) ? (
                <HeaderAction
                  icon="edit-2"
                  onPress={() => router.push({ pathname: '/sales-order/edit/[id]', params: { id: so._id } })}
                />
              ) : null}
              {canDelete(so.status) ? (
                <HeaderAction icon="trash-2" color="#fecaca" disabled={busy} onPress={onDelete} />
              ) : null}
            </>
          ) : undefined
        }
      >
        {so ? (
          <View className="mt-4">
            <Text className="text-xl font-bold text-white" numberOfLines={1}>
              {so.soNumber}
            </Text>
            <View className="mt-2 flex-row items-center gap-2">
              <View className={`rounded-full px-2.5 py-1 ${HEADER_PILL[so.status]?.bg ?? ''}`}>
                <Text className={`text-xs font-medium ${HEADER_PILL[so.status]?.text ?? 'text-white'}`}>
                  {STATUS_LABEL[so.status] ?? so.status}
                </Text>
              </View>
              <Text className="text-xs text-slate-300" numberOfLines={1}>
                {customerName(so.customer)}
              </Text>
            </View>
          </View>
        ) : null}
      </EnterpriseHeader>

      {loading && !so ? (
        <LoadingState label="Loading sales order…" />
      ) : error || !so ? (
        <MessageState
          icon="alert-triangle"
          tone="error"
          title="Couldn't load sales order"
          message="This sales order may have been removed."
          actionLabel="Retry"
          onAction={load}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Section title="Overview">
            <DetailRow icon="briefcase" label="Customer" value={customerName(so.customer)} />
            <DetailRow icon="activity" label="Status" value={STATUS_LABEL[so.status] ?? so.status} />
            <DetailRow icon="home" label="Stock" value={reservedId ? 'Reserved in warehouse' : 'Not reserved'} />
            <DetailRow icon="user" label="Created By" value={userName(so.createdBy)} />
            <DetailRow icon="calendar" label="Created" value={formatDate(so.createdAt)} />
            {so.approvedAt ? (
              <DetailRow
                icon="check-circle"
                label="Approved"
                value={[formatDate(so.approvedAt), userName(so.approvedBy)].filter(Boolean).join(' · ')}
              />
            ) : null}
            {so.deliveredAt ? (
              <DetailRow
                icon="truck"
                label="Delivered"
                value={[formatDate(so.deliveredAt), userName(so.deliveredBy)].filter(Boolean).join(' · ')}
              />
            ) : null}
            {so.cancelledAt ? (
              <DetailRow icon="x-circle" label="Cancelled" value={formatDate(so.cancelledAt)} />
            ) : null}
          </Section>

          <Section title={`Items (${so.items.length})`}>
            {so.items.map((item, i) => (
              <View
                key={i}
                className={`flex-row items-center py-3 ${i > 0 ? 'border-t border-slate-100' : ''}`}
              >
                <View className="flex-1 pr-3">
                  <Text className="text-sm font-medium text-slate-900" numberOfLines={1}>
                    {productName(item.product)}
                  </Text>
                  <Text className="text-xs text-slate-500">
                    {item.qty} × {money(item.price)}
                  </Text>
                </View>
                <Text className="text-sm font-semibold text-slate-900">{money(lineTotal(item))}</Text>
              </View>
            ))}
            <View className="flex-row items-center justify-between border-t border-slate-200 py-3">
              <Text className="text-sm font-semibold text-slate-700">Total</Text>
              <Text className="text-lg font-bold text-slate-900">{money(soTotal(so))}</Text>
            </View>
          </Section>

          {so.notes ? (
            <Section title="Notes">
              <Text className="pb-4 pt-1 text-sm leading-relaxed text-slate-700">{so.notes}</Text>
            </Section>
          ) : null}

          {approving || delivering || canCancel(so.status) ? (
            <Section title="Actions">
              <View className="pb-4 pt-2">
                {approving || (delivering && !reservedId) ? (
                  <SearchablePicker
                    label={approving ? 'Reserve stock in' : 'Deliver from warehouse'}
                    required={delivering}
                    placeholder={warehouseOpts.length ? 'Select warehouse' : 'No active warehouses'}
                    value={warehouse}
                    options={warehouseOpts}
                    onSelect={setWarehouse}
                    searchPlaceholder="Search warehouses…"
                  />
                ) : null}

                {approving ? (
                  <PrimaryButton label="Approve Order" loadingLabel="Working…" loading={busy} onPress={onApprove} />
                ) : null}
                {delivering ? (
                  <PrimaryButton
                    label="Mark as Delivered"
                    loadingLabel="Working…"
                    loading={busy}
                    disabled={!reservedId && !warehouse}
                    onPress={onDeliver}
                  />
                ) : null}

                {canCancel(so.status) ? (
                  <Pressable
                    onPress={onCancel}
                    disabled={busy}
                    className="mt-3 flex-row items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 py-3 active:opacity-80"
                  >
                    <Feather name="x-circle" size={16} color="#dc2626" />
                    <Text className="text-sm font-semibold text-red-600">Cancel Order</Text>
                  </Pressable>
                ) : null}
              </View>
            </Section>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
