import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import FormField from '@/components/ui/FormField';
import { ActionButton, Banner, Card, Rows, StatusChip, fmtDate } from '@/components/ui/IntegrationUI';
import SearchablePicker from '@/components/ui/SearchablePicker';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  apiMessage,
  disconnectShopify,
  fetchShopifyEvents,
  fetchShopifyLocations,
  fetchShopifyStatus,
  normalizeShopInput,
  openOAuth,
  previewShopifyInventory,
  registerShopifyWebhooks,
  retryShopifyEvent,
  saveShopifyInventory,
  shopifyMoney,
  shopifyOAuthUrl,
  syncShopifyInventory,
  type ShopifyEvent,
  type ShopifyStatus,
} from '@/services/integrations';
import { fetchWarehouses } from '@/services/warehouses';

const SHOP_HINT = "Enter your store's myshopify.com address (Shopify admin → Settings → Domains), e.g. your-store.myshopify.com";

/** Shopify — mobile port of web pages/Integrations/ShopifyIntegration.jsx (+ Inventory / Webhook cards). */
export default function ShopifyIntegrationScreen() {
  const [data, setData] = useState<ShopifyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [shop, setShop] = useState('');
  const [events, setEvents] = useState<ShopifyEvent[]>([]);
  const [options, setOptions] = useState<{ warehouses: { label: string; value: string }[]; locations: { label: string; value: string }[] } | null>(null);
  const [inv, setInv] = useState<{ enabled: boolean; warehouse: string; locationGid: string } | null>(null);
  const [totals, setTotals] = useState<Record<string, number> | null>(null);

  const load = useCallback(async () => {
    try {
      const s = await fetchShopifyStatus();
      setData(s);
      setError('');
      const saved = s.connection?.inventory;
      setInv({ enabled: !!saved?.enabled, warehouse: saved?.warehouse || '', locationGid: saved?.locationGid || '' });
      if (s.connection?.connected) {
        // Admin-only extras: a 403 simply leaves the section empty
        fetchShopifyEvents().then((e) => setEvents(e.items ?? []), () => setEvents([]));
        Promise.all([fetchWarehouses(), fetchShopifyLocations()]).then(
          ([w, l]) => setOptions({ warehouses: w.map((x) => ({ label: x.name, value: x._id })), locations: l.map((x) => ({ label: x.name, value: x.id })) }),
          () => setOptions(null)
        );
      }
    } catch (err) {
      setError(apiMessage(err, 'Check your connection and try again.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const run = async (key: string, fn: () => Promise<string | void>, fallback: string) => {
    try {
      setBusy(key);
      const ok = await fn();
      if (ok) Alert.alert('Shopify', ok);
    } catch (err) {
      Alert.alert('Shopify', apiMessage(err, fallback));
    } finally {
      setBusy('');
      load();
    }
  };

  // Server validates the shop again and binds the attempt to this admin + workspace
  const startOAuth = (key: string, input: string) =>
    run(key, async () => {
      const normalized = normalizeShopInput(input);
      if (!normalized) throw Object.assign(new Error('Invalid shop'), { response: { data: { message: SHOP_HINT } } });
      const url = await shopifyOAuthUrl(normalized);
      if (!url) throw new Error('No OAuth URL');
      await openOAuth(url);
    }, 'Could not start the Shopify connection.');

  const install = () =>
    run('install', async () => {
      if (data?.installUrl) await openOAuth(data.installUrl);
    }, 'Could not open Shopify.');

  const disconnect = () =>
    Alert.alert('Disconnect Shopify', 'Disconnect this store from the workspace? Imported orders stay in the ERP.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: () => run('disc', async () => { await disconnectShopify(); return 'Shopify disconnected'; }, 'Could not disconnect Shopify.') },
    ]);

  const saveInventory = () => {
    if (!inv) return;
    if (inv.enabled && (!inv.warehouse || !inv.locationGid)) return Alert.alert('Shopify', 'Choose an ERP warehouse and a Shopify location before turning sync on.');
    run('inv', async () => (await saveShopifyInventory({ enabled: inv.enabled, warehouse: inv.warehouse || null, locationGid: inv.locationGid || null })) || 'Inventory settings saved', 'Could not save inventory settings.');
  };

  // Fresh preview first, so the admin confirms the real quantities (as on the web)
  const sync = () =>
    run('preview', async () => {
      const p = await previewShopifyInventory();
      const t = p?.totals;
      if (!t) throw new Error("Couldn't calculate the stock to push.");
      setTotals(t);
      Alert.alert('Push stock to Shopify', `${t.willPush ?? 0} item(s) will be updated, ${t.unchanged ?? 0} unchanged${t.mismatched ? `, ${t.mismatched} need attention` : ''}.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sync now', onPress: () => run('sync', syncShopifyInventory, 'Inventory sync failed.') },
      ]);
    }, "Couldn't calculate the stock to push.");

  const conn = data?.connection;
  const connected = !!conn?.connected;
  const orders = data?.orders;
  const registered = conn?.webhooks?.registered ?? [];

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader onBack icon="shopping-bag" title="Shopify" subtitle="This workspace's own Shopify store." />
      {loading ? (
        <LoadingState label="Loading Shopify…" />
      ) : error && !data ? (
        <MessageState icon="wifi-off" tone="error" title="Couldn't load Shopify" message={error} actionLabel="Retry" onAction={() => { setLoading(true); load(); }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        >
          {data?.available === false ? (
            <Banner tone="warn" icon="alert-triangle">Shopify connection isn&apos;t available yet. Please try again later or contact support.</Banner>
          ) : null}
          {conn?.lastError ? <Banner tone="error" icon="x-circle">{conn.lastError}</Banner> : null}

          {!connected ? (
            <Card title="Connect your store">
              <Text className="mb-3 mt-1 text-xs text-slate-500">{SHOP_HINT}</Text>
              <FormField label="Store address" value={shop} onChangeText={setShop} autoCapitalize="none" autoCorrect={false} placeholder="your-store.myshopify.com" />
              <View className="flex-row flex-wrap gap-2">
                <ActionButton icon="link" label="Connect store" tone="primary" busy={busy === 'connect'} disabled={!!busy || data?.available === false} onPress={() => startOAuth('connect', shop)} />
                {data?.installUrl ? <ActionButton icon="shopping-bag" label="Install from Shopify" busy={busy === 'install'} disabled={!!busy} onPress={install} /> : null}
              </View>
              <Text className="mt-3 text-xs text-slate-400">After approving in Shopify, the result page opens in the browser — close it to come back. Pull to refresh if the status hasn&apos;t updated.</Text>
            </Card>
          ) : (
            <>
              <Card title={conn?.shop?.name || conn?.shopDomain || 'Store'} right={<StatusChip on label={conn?.status || 'Connected'} />}>
                <Rows
                  rows={[
                    ['Domain', conn?.shopDomain],
                    ['Plan', conn?.shop?.plan],
                    ['Email', conn?.shop?.email],
                    ['Connected', fmtDate(conn?.connectedAt)],
                    ['Missing permissions', conn?.missingScopes?.length ? conn.missingScopes.join(', ') : null],
                  ]}
                />
                <View className="mt-4 flex-row flex-wrap gap-2">
                  <ActionButton icon="refresh-cw" label="Reconnect" busy={busy === 'reconnect'} disabled={!!busy} onPress={() => startOAuth('reconnect', conn?.shopDomain || '')} />
                  <ActionButton icon="link-2" label="Disconnect" tone="danger" busy={busy === 'disc'} disabled={!!busy} onPress={disconnect} />
                </View>
              </Card>

              <Card title="Orders">
                <Text className="mt-1 text-xs text-slate-500">
                  Imported as draft ERP sales orders. Stock, delivery and invoices stay manual for now.
                  {orders?.needsAttention ? ` ${orders.needsAttention} need attention.` : ''}
                </Text>
                {(orders?.recent ?? []).map((o) => (
                  <View key={o._id} className="mt-3 border-t border-slate-100 pt-3">
                    <View className="flex-row justify-between">
                      <Text className="text-sm font-semibold text-slate-900">{o.orderName || '—'}{o.status === 'cancelled' ? ' · cancelled' : ''}</Text>
                      <Text className="text-sm text-slate-800">{o.financials ? shopifyMoney(o.financials.total, o.financials.digits, o.financials.currency) : '—'}</Text>
                    </View>
                    <Text className="text-xs text-slate-500">
                      {[o.salesOrder ? `${o.salesOrder.soNumber} · ${o.salesOrder.status}` : null, o.financialStatus].filter(Boolean).join(' · ') || '—'}
                    </Text>
                    {o.issues?.length ? <Text className="text-xs text-amber-700">{o.issues.join(' · ')}</Text> : null}
                  </View>
                ))}
                {!orders?.recent?.length ? <Text className="mt-3 text-xs text-slate-400">No Shopify orders imported yet.</Text> : null}
              </Card>

              {inv ? (
                <Card title="Inventory sync" right={<StatusChip on={conn?.inventory?.enabled} label={conn?.inventory?.enabled ? 'On' : 'Off'} />}>
                  <Text className="mb-3 mt-1 text-xs text-slate-500">Push ERP stock from one warehouse to one Shopify location.</Text>
                  <View className="mb-3 flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-slate-700">Sync enabled</Text>
                    <Switch value={inv.enabled} onValueChange={(v) => setInv((x) => (x ? { ...x, enabled: v } : x))} />
                  </View>
                  {options ? (
                    <>
                      <SearchablePicker label="ERP warehouse" value={inv.warehouse} options={options.warehouses} onSelect={(v) => setInv((x) => (x ? { ...x, warehouse: v } : x))} />
                      <SearchablePicker label="Shopify location" value={inv.locationGid} options={options.locations} onSelect={(v) => setInv((x) => (x ? { ...x, locationGid: v } : x))} />
                    </>
                  ) : (
                    <Text className="mb-3 text-xs text-slate-400">Warehouses and Shopify locations are visible to admins only.</Text>
                  )}
                  <Rows
                    rows={[
                      ['Last sync', fmtDate(conn?.inventory?.lastSyncAt)],
                      ['Last error', conn?.inventory?.lastError],
                      ['Last preview', totals ? `${totals.willPush ?? 0} to push · ${totals.unchanged ?? 0} unchanged` : null],
                    ]}
                  />
                  <View className="mt-4 flex-row flex-wrap gap-2">
                    <ActionButton icon="save" label="Save" busy={busy === 'inv'} disabled={!!busy} onPress={saveInventory} />
                    <ActionButton icon="upload-cloud" label="Sync now" tone="primary" busy={busy === 'preview' || busy === 'sync'} disabled={!!busy || !conn?.inventory?.enabled} onPress={sync} />
                  </View>
                </Card>
              ) : null}

              <Card title="Webhooks" right={<StatusChip on={registered.length > 0 && !conn?.webhooks?.lastError} label={`${registered.length} registered`} />}>
                {conn?.webhooks?.lastError ? <Text className="mt-2 text-xs text-rose-600">{conn.webhooks.lastError}</Text> : null}
                <View className="mt-3 flex-row">
                  <ActionButton icon="radio" label="Register webhooks" busy={busy === 'hooks'} disabled={!!busy} onPress={() => run('hooks', async () => (await registerShopifyWebhooks()) || 'Webhooks registered', 'Could not register webhooks.')} />
                </View>
                {events.map((e) => (
                  <View key={e._id} className="mt-3 flex-row items-center border-t border-slate-100 pt-3">
                    <View className="flex-1">
                      <Text className="text-sm text-slate-800">{e.topic}</Text>
                      <Text className="text-xs text-slate-500">{[e.status, e.attempts ? `${e.attempts} attempt(s)` : null, fmtDate(e.createdAt)].filter(Boolean).join(' · ')}</Text>
                      {e.lastError ? <Text className="text-xs text-rose-600" numberOfLines={2}>{e.lastError}</Text> : null}
                    </View>
                    {e.status === 'dead' ? (
                      <ActionButton icon="rotate-ccw" label="Retry" busy={busy === `retry-${e._id}`} disabled={!!busy} onPress={() => run(`retry-${e._id}`, async () => { await retryShopifyEvent(e._id); return 'Event queued for retry'; }, 'Could not retry this event.')} />
                    ) : null}
                  </View>
                ))}
              </Card>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
