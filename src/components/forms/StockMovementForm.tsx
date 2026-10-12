import { Feather } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import FormField from '@/components/ui/FormField';
import PrimaryButton from '@/components/ui/PrimaryButton';
import SearchablePicker from '@/components/ui/SearchablePicker';
import Segmented from '@/components/ui/Segmented';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  adjustStock,
  availableFor,
  loadStockFormData,
  transferStock,
  validateAdjust,
  validateTransfer,
  type AdjustDirection,
  type AdjustInput,
  type StockFormData,
  type TransferInput,
} from '@/services/inventory';

const DIRECTIONS: readonly AdjustDirection[] = ['Increase', 'Decrease'];
const num = (t: string) => t.replace(/[^0-9]/g, '');

const emptyAdjust: AdjustInput = { product: '', warehouse: '', direction: 'Increase', quantity: '', reason: '' };
const emptyTransfer: TransferInput = { product: '', fromWarehouse: '', toWarehouse: '', quantity: '', reason: '' };

function Hint({ icon, tone, children }: { icon: 'info' | 'lock'; tone: 'indigo' | 'amber'; children: string }) {
  const c = tone === 'amber'
    ? ['border-amber-200 bg-amber-50', 'text-amber-800', '#b45309']
    : ['border-indigo-100 bg-indigo-50', 'text-indigo-700', '#4f46e5'];
  return (
    <View className={`mb-4 flex-row items-start gap-2 rounded-xl border p-3 ${c[0]}`}>
      <Feather name={icon} size={14} color={c[2]} />
      <Text className={`flex-1 text-xs leading-5 ${c[1]}`}>{children}</Text>
    </View>
  );
}

/**
 * Stock Adjustment (`mode="adjust"`) and Warehouse Transfer (`mode="transfer"`)
 * — mobile versions of the web ERP forms, sharing data loading, the web's
 * available-stock checks, duplicate-tap guard and post-save refresh.
 */
export default function StockMovementForm({ mode }: { mode: 'adjust' | 'transfer' }) {
  const isAdjust = mode === 'adjust';
  const [data, setData] = useState<StockFormData | null>(null);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [adjust, setAdjust] = useState<AdjustInput>(emptyAdjust);
  const [transfer, setTransfer] = useState<TransferInput>(emptyTransfer);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    loadStockFormData()
      .then((d) => {
        setData(d);
        setError(false);
      })
      .catch(() => setError(true));
  }, [reloadKey]);

  const product = isAdjust ? adjust.product : transfer.product;
  const sourceWh = isAdjust ? adjust.warehouse : transfer.fromWarehouse;
  const available = data ? availableFor(data.summary, product, sourceWh) : null;

  const submit = async () => {
    if (savingRef.current || !data) return;
    const err = isAdjust ? validateAdjust(adjust, available) : validateTransfer(transfer, available);
    if (err) {
      Toast.show({ type: 'error', text1: err });
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      if (isAdjust) await adjustStock(adjust);
      else await transferStock(transfer);
      Toast.show({ type: 'success', text1: isAdjust ? 'Stock adjusted successfully' : 'Stock transferred successfully' });
      // Keep the selections (like the web), clear the amounts, refresh availability.
      if (isAdjust) setAdjust((f) => ({ ...f, quantity: '', reason: '' }));
      else setTransfer((f) => ({ ...f, quantity: '', reason: '' }));
      setReloadKey((k) => k + 1);
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: isAdjust ? 'Adjustment failed' : 'Transfer failed',
        text2: e?.response?.data?.message ?? 'Please try again.',
      });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (error && !data)
    return (
      <MessageState
        icon="wifi-off"
        tone="error"
        title="Couldn't load products / warehouses"
        actionLabel="Retry"
        onAction={() => {
          setError(false);
          setReloadKey((k) => k + 1);
        }}
      />
    );
  if (!data) return <LoadingState label="Loading stock data…" />;

  const destOptions = data.warehouses.filter((w) => w.value !== transfer.fromWarehouse);

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {data.productsRestricted ? (
          <Hint icon="lock" tone="amber">
            The full product list is admin-only. Showing products that already have stock.
          </Hint>
        ) : null}

        <SearchablePicker
          label="Product"
          required
          placeholder={data.products.length ? 'Select product' : 'No products'}
          searchPlaceholder="Search products…"
          value={product}
          options={data.products}
          onSelect={(v) => (isAdjust ? setAdjust((f) => ({ ...f, product: v })) : setTransfer((f) => ({ ...f, product: v })))}
        />

        {isAdjust ? (
          <SearchablePicker
            label="Warehouse"
            required
            placeholder={data.warehouses.length ? 'Select warehouse' : 'No active warehouses'}
            searchPlaceholder="Search warehouses…"
            value={adjust.warehouse}
            options={data.warehouses}
            onSelect={(v) => setAdjust((f) => ({ ...f, warehouse: v }))}
          />
        ) : (
          <>
            <SearchablePicker
              label="From Warehouse"
              required
              placeholder="Select source"
              searchPlaceholder="Search warehouses…"
              value={transfer.fromWarehouse}
              options={data.warehouses}
              onSelect={(v) =>
                setTransfer((f) => ({ ...f, fromWarehouse: v, toWarehouse: f.toWarehouse === v ? '' : f.toWarehouse }))
              }
            />
            <SearchablePicker
              label="To Warehouse"
              required
              placeholder={transfer.fromWarehouse ? 'Select destination' : 'Pick a source first'}
              searchPlaceholder="Search warehouses…"
              value={transfer.toWarehouse}
              options={destOptions}
              onSelect={(v) => setTransfer((f) => ({ ...f, toWarehouse: v }))}
            />
          </>
        )}

        {available !== null ? (
          <Hint icon="info" tone="indigo">{`Current available: ${available} units`}</Hint>
        ) : null}

        {isAdjust ? (
          <Segmented<AdjustDirection>
            label="Adjustment"
            options={DIRECTIONS}
            value={adjust.direction}
            onChange={(v) => setAdjust((f) => ({ ...f, direction: v }))}
          />
        ) : null}

        <FormField
          label="Quantity"
          required
          value={isAdjust ? adjust.quantity : transfer.quantity}
          onChangeText={(t) =>
            isAdjust ? setAdjust((f) => ({ ...f, quantity: num(t) })) : setTransfer((f) => ({ ...f, quantity: num(t) }))
          }
          keyboardType="number-pad"
          placeholder="e.g. 10"
        />
        <FormField
          label={isAdjust ? 'Reason' : 'Reason (optional)'}
          required={isAdjust}
          value={isAdjust ? adjust.reason : transfer.reason}
          onChangeText={(t) =>
            isAdjust ? setAdjust((f) => ({ ...f, reason: t })) : setTransfer((f) => ({ ...f, reason: t }))
          }
          placeholder={isAdjust ? 'e.g. Damaged goods, cycle count correction…' : 'e.g. Rebalancing stock'}
          multiline
        />

        <View className="mt-2">
          <PrimaryButton
            label={isAdjust ? 'Apply Adjustment' : 'Transfer Stock'}
            loadingLabel="Saving…"
            loading={saving}
            onPress={submit}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
