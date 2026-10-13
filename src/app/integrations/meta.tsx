import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  disconnectMeta,
  fetchMetaOAuthUrl,
  fetchMetaStatus,
  formatMetaDate,
  metaErrorMessage,
  refreshMeta,
  syncWhatsAppAccount,
  type MetaStatus,
} from '@/services/meta';

type FeatherName = keyof typeof Feather.glyphMap;
type Busy = '' | 'connect' | 'refresh' | 'disconnect' | 'wa-sync';

/** Meta Integration — mobile port of web pages/Integrations/MetaIntegration.jsx. */
export default function MetaIntegrationScreen() {
  const [status, setStatus] = useState<MetaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<Busy>('');

  const load = useCallback(async () => {
    try {
      setStatus(await fetchMetaStatus());
      setError('');
    } catch (err) {
      setError(metaErrorMessage(err, 'Check your connection and try again.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Also re-reads status when returning from the OAuth browser.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const run = async (key: Busy, action: () => Promise<void>, fallback: string) => {
    try {
      setBusy(key);
      await action();
    } catch (err) {
      Alert.alert('Meta Integration', metaErrorMessage(err, fallback));
      load();
    } finally {
      setBusy('');
    }
  };

  // OAuth finishes on the web app (backend CLIENT_URL), so re-read status on return.
  const connect = () =>
    run(
      'connect',
      async () => {
        const url = await fetchMetaOAuthUrl();
        if (!url) throw new Error('No OAuth URL');
        await WebBrowser.openBrowserAsync(url);
        await load();
      },
      'Could not start the Meta connection.'
    );

  const refresh = () =>
    run(
      'refresh',
      async () => {
        setStatus(await refreshMeta());
        Alert.alert('Meta Integration', 'Connection refreshed');
      },
      'Could not refresh the connection.'
    );

  const syncWa = () =>
    run(
      'wa-sync',
      async () => {
        await syncWhatsAppAccount();
        await load();
        Alert.alert('Meta Integration', 'WhatsApp account synced');
      },
      'Could not sync the WhatsApp account.'
    );

  const disconnect = () =>
    Alert.alert('Disconnect Meta', 'Disconnect Meta for CRM, ERP and AI Content?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: () =>
          run(
            'disconnect',
            async () => {
              setStatus(await disconnectMeta());
              Alert.alert('Meta Integration', 'Meta disconnected');
            },
            'Could not disconnect Meta.'
          ),
      },
    ]);

  const connected = !!status?.connected;
  const config = status?.config || { configured: true, missingEnv: [] };
  const wa = status?.whatsapp;
  const waConnected = !!wa?.connected;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        icon="link"
        title="Meta Integration"
        subtitle="One centralized Meta connection shared by CRM, ERP and AI Content."
      />

      {loading ? (
        <LoadingState label="Loading Meta integration…" />
      ) : error && !status ? (
        <MessageState
          icon="wifi-off"
          tone="error"
          title="Couldn't load Meta status"
          message={error}
          actionLabel="Retry"
          onAction={() => {
            setLoading(true);
            load();
          }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
        >
          {/* Status + actions */}
          <View className="mb-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-slate-900">Connection</Text>
              <StatusPill connected={connected} status={status?.status} />
            </View>
            <View className="mt-4 flex-row gap-2">
              {connected ? (
                <>
                  <ActionButton icon="refresh-cw" label="Refresh" busy={busy === 'refresh'} disabled={!!busy} onPress={refresh} />
                  <ActionButton icon="link-2" label="Disconnect" tone="danger" busy={busy === 'disconnect'} disabled={!!busy} onPress={disconnect} />
                </>
              ) : (
                <ActionButton
                  icon="link"
                  label={busy === 'connect' ? 'Opening…' : 'Connect Meta'}
                  tone="primary"
                  busy={busy === 'connect'}
                  disabled={!!busy || !config.configured}
                  onPress={connect}
                />
              )}
            </View>
          </View>

          {!config.configured && (
            <Banner tone="warn" icon="alert-triangle" title="Meta app not fully configured">
              Missing backend environment variables: {config.missingEnv?.join(', ') || 'unknown'}
            </Banner>
          )}
          {status?.lastError ? <Banner tone="error" icon="x-circle">{status.lastError}</Banner> : null}

          <AssetCard
            icon="globe"
            color="#2563eb"
            tint="bg-blue-50"
            title="Facebook Page"
            active={status?.facebookPage?.connected}
            primary={status?.facebookPage?.name || 'Not linked'}
            rows={[
              ['Page ID', status?.facebookPage?.id || '—'],
              ['Page token', status?.facebookPage?.tokenPresent ? 'Stored securely' : '—'],
            ]}
          />
          <AssetCard
            icon="at-sign"
            color="#db2777"
            tint="bg-pink-50"
            title="Instagram Business"
            active={status?.instagram?.connected}
            primary={status?.instagram?.username ? `@${status.instagram.username}` : 'Not linked'}
            rows={[
              ['Account name', status?.instagram?.name || '—'],
              ['Instagram ID', status?.instagram?.id || '—'],
            ]}
          />

          {/* WhatsApp Business */}
          <View className="mb-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <View className="flex-row items-center">
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50">
                <Feather name="message-square" size={20} color="#059669" />
              </View>
              <View className="ml-3 min-w-0 flex-1">
                <Text className="text-sm font-semibold text-slate-900">WhatsApp Business</Text>
                <Text className="text-xs text-slate-500" numberOfLines={1}>
                  {wa?.displayPhoneNumber || 'No number connected'}
                </Text>
              </View>
              <Chip on={waConnected} label={waConnected ? 'Connected' : 'Not connected'} />
            </View>

            {!wa?.phoneNumberId && !waConnected ? (
              <Text className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                Set WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN, WHATSAPP_WABA_ID and WHATSAPP_VERIFY_TOKEN on the
                server, then press Sync.
              </Text>
            ) : (
              <Rows
                rows={[
                  ['Business name', wa?.verifiedName || '—'],
                  ['Phone Number ID', wa?.phoneNumberId || '—'],
                  ['WABA ID', wa?.wabaId || '—'],
                  ['Quality rating', wa?.qualityRating || '—'],
                  ['Webhook', wa?.webhookSubscribed ? 'Connected' : 'Not connected'],
                  ['Last inbound', formatMetaDate(wa?.lastInboundAt) || '—'],
                  ['Last synced', formatMetaDate(wa?.lastSyncedAt) || '—'],
                ]}
              />
            )}
            {wa?.lastError ? (
              <Text className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                {wa.lastError}
              </Text>
            ) : null}
            <View className="mt-4 flex-row">
              <ActionButton icon="refresh-cw" label="Sync" busy={busy === 'wa-sync'} disabled={!!busy} onPress={syncWa} />
            </View>
          </View>

          {/* Connection details */}
          <View className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <View className="flex-row items-center">
              <Feather name="shield" size={18} color="#059669" />
              <Text className="ml-2 text-sm font-semibold text-slate-900">Connection details</Text>
            </View>
            <Rows
              rows={[
                ['Business Portfolio ID', status?.businessPortfolioId || config.businessPortfolioId || '—'],
                ['Graph API version', config.apiVersion || '—'],
                ['OAuth redirect URI', config.redirectUri || 'Not set (META_REDIRECT_URI)'],
                [
                  'Access token',
                  status?.token?.present
                    ? status.token.expired
                      ? 'Expired — reconnect required'
                      : 'Stored securely (encrypted)'
                    : 'Not stored',
                ],
                ['Token expires', formatMetaDate(status?.token?.expiresAt) || 'Never'],
                ['Connected at', formatMetaDate(status?.connectedAt) || '—'],
                ['Last synced', formatMetaDate(status?.lastSyncedAt) || '—'],
              ]}
            />
            <Text className="mt-4 text-xs leading-5 text-slate-500">
              Facebook and Instagram are already linked inside the Meta Business Portfolio. This module only reads that
              linkage — it never re-links or merges accounts. Tokens stay on the server and are never exposed to the app.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function StatusPill({ connected, status }: { connected: boolean; status?: string }) {
  const isError = !connected && status === 'error';
  const cls = connected
    ? 'border-emerald-200 bg-emerald-50'
    : isError
      ? 'border-rose-200 bg-rose-50'
      : 'border-slate-200 bg-slate-100';
  const color = connected ? '#047857' : isError ? '#be123c' : '#475569';
  return (
    <View className={`flex-row items-center rounded-full border px-3 py-1.5 ${cls}`}>
      <Feather name={connected ? 'check-circle' : 'x-circle'} size={13} color={color} />
      <Text className="ml-1.5 text-xs font-semibold" style={{ color }}>
        {connected ? 'Connected' : isError ? 'Error' : 'Disconnected'}
      </Text>
    </View>
  );
}

function Chip({ on, label }: { on?: boolean; label: string }) {
  return (
    <View className={`rounded-full px-2.5 py-1 ${on ? 'bg-emerald-50' : 'bg-slate-100'}`}>
      <Text className={`text-[11px] font-semibold ${on ? 'text-emerald-700' : 'text-slate-500'}`}>{label}</Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  busy,
  disabled,
  tone = 'neutral',
}: {
  icon: FeatherName;
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  tone?: 'neutral' | 'primary' | 'danger';
}) {
  const cls =
    tone === 'primary' ? 'bg-indigo-600' : tone === 'danger' ? 'bg-rose-600' : 'border border-slate-200 bg-white';
  const color = tone === 'neutral' ? '#334155' : '#ffffff';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-1 flex-row items-center justify-center rounded-2xl px-4 py-3 active:opacity-80 ${cls} ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      {busy ? <ActivityIndicator size="small" color={color} /> : <Feather name={icon} size={16} color={color} />}
      <Text className="ml-2 text-sm font-semibold" style={{ color }}>
        {label}
      </Text>
    </Pressable>
  );
}

function Banner({
  tone,
  icon,
  title,
  children,
}: {
  tone: 'warn' | 'error';
  icon: FeatherName;
  title?: string;
  children: React.ReactNode;
}) {
  const warn = tone === 'warn';
  return (
    <View
      className={`mb-4 flex-row rounded-2xl border p-4 ${warn ? 'border-amber-200 bg-amber-50' : 'border-rose-200 bg-rose-50'}`}
    >
      <Feather name={icon} size={18} color={warn ? '#92400e' : '#be123c'} />
      <View className="ml-3 flex-1">
        {title ? <Text className="text-sm font-semibold text-amber-800">{title}</Text> : null}
        <Text className={`text-sm ${title ? 'mt-1' : ''} ${warn ? 'text-amber-800' : 'text-rose-700'}`}>{children}</Text>
      </View>
    </View>
  );
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <View className="mt-4 border-t border-slate-100 pt-3">
      {rows.map(([label, value]) => (
        <View key={label} className="flex-row justify-between gap-4 py-1.5">
          <Text className="text-xs text-slate-500">{label}</Text>
          <Text className="flex-1 text-right text-xs font-medium text-slate-800" selectable>
            {value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function AssetCard({
  icon,
  color,
  tint,
  title,
  active,
  primary,
  rows,
}: {
  icon: FeatherName;
  color: string;
  tint: string;
  title: string;
  active?: boolean;
  primary: string;
  rows: [string, string][];
}) {
  return (
    <View className="mb-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <View className="flex-row items-center">
        <View className={`h-11 w-11 items-center justify-center rounded-2xl ${tint}`}>
          <Feather name={icon} size={20} color={color} />
        </View>
        <View className="ml-3 min-w-0 flex-1">
          <Text className="text-sm font-semibold text-slate-900">{title}</Text>
          <Text className="text-xs text-slate-500" numberOfLines={1}>
            {primary}
          </Text>
        </View>
        <Chip on={active} label={active ? 'Active' : 'Inactive'} />
      </View>
      <Rows rows={rows} />
    </View>
  );
}
