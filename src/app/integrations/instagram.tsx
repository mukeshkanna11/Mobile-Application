import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import { ActionButton, Banner, Card, Rows, StatusChip, fmtDate } from '@/components/ui/IntegrationUI';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  apiMessage,
  disconnectInstagram,
  fetchInstagramStatus,
  instagramOAuthUrl,
  openOAuth,
  reconnectInstagramPage,
  refreshInstagram,
  subscribeInstagram,
  type InstagramStatus,
} from '@/services/integrations';

type Busy = '' | 'connect' | 'check' | 'sub' | 'disc';

const STATE_TEXT = {
  ok: 'Connected',
  expired: 'Instagram token expired or revoked — reconnect',
  unverified: 'Instagram connection not verified — check or reconnect',
  none: 'Instagram is not connected for this workspace',
} as const;

/** Instagram — mobile port of web pages/Integrations/InstagramInbox.jsx (connection + DM inbox). */
export default function InstagramIntegrationScreen() {
  const [ig, setIg] = useState<InstagramStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState<Busy>('');

  const load = useCallback(async () => {
    try {
      const s = await fetchInstagramStatus();
      setIg(s ?? {});
      setLoadError('');
      return s;
    } catch (err) {
      setLoadError(apiMessage(err, 'Could not load Instagram status'));
      return null;
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

  // mustConnect: success only when the backend status confirms it (same rule as the web page)
  const run = async (key: Busy, fn: () => Promise<InstagramStatus | void>, ok: string, mustConnect = false) => {
    try {
      setBusy(key);
      setError('');
      const data = await fn();
      if (data) setIg(data);
      if (mustConnect && data && !data.connected) setError(data.lastError || 'Instagram is still not connected for this workspace');
      else if (ok) Alert.alert('Instagram', ok);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status ?? 0;
      setError(status >= 500 ? 'Instagram connection is temporarily unavailable. Please try again or contact support.' : apiMessage(err, 'Request failed'));
      load();
    } finally {
      setBusy('');
    }
  };

  // Page already linked → server-side reconnect; otherwise Facebook Login for Instagram (returns to the app)
  const connect = () =>
    ig?.pageReconnectable
      ? run('connect', reconnectInstagramPage, 'Instagram reconnected', true)
      : run('connect', async () => {
          const url = await instagramOAuthUrl();
          if (!url) throw new Error('No OAuth URL');
          await openOAuth(url);
          const s = await load();
          if (s?.connected) Alert.alert('Instagram', 'Instagram account connected');
          else if (s) setError(s.lastError || 'Instagram is not connected yet. Make sure you granted access to your Page and its Instagram account.');
        }, '');

  const disconnect = () =>
    Alert.alert('Disconnect Instagram', "Disconnect this workspace's Instagram account? Message history is kept.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: () => run('disc', disconnectInstagram, 'Instagram disconnected') },
    ]);

  const state = ig?.connected ? 'ok' : ig?.expired ? 'expired' : ig?.source ? 'unverified' : 'none';

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader onBack icon="instagram" title="Instagram" subtitle="Instagram direct messages for this workspace." />
      {loading ? (
        <LoadingState label="Loading Instagram…" />
      ) : loadError && !ig ? (
        <MessageState icon="wifi-off" tone="error" title="Couldn't load Instagram" message={loadError} actionLabel="Retry" onAction={() => { setLoading(true); load(); }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        >
          {error ? <Banner tone="error" icon="alert-circle">{error}</Banner> : null}
          {ig?.lastError && !error ? <Banner tone="warn" icon="alert-triangle">{ig.lastError}</Banner> : null}

          <Card title={ig?.username ? `@${ig.username}` : 'Instagram account'} right={<StatusChip on={state === 'ok'} label={state === 'ok' ? 'Connected' : state === 'expired' ? 'Expired' : state === 'unverified' ? 'Unverified' : 'Not connected'} />}>
            <Text className="mt-2 text-sm text-slate-600">{STATE_TEXT[state]}</Text>
            <Rows
              rows={[
                ['Connected via', ig?.method === 'facebook_page' ? 'Facebook Page' : ig?.method === 'instagram_login' ? 'Instagram Login' : null],
                ['Webhook', ig?.connected ? (!ig.webhookVerifiable ? 'Not verifiable' : ig.webhookSubscribed ? 'Subscribed' : 'Not subscribed') : null],
                ['Last DM', ig?.connected ? fmtDate(ig.lastInboundAt) || 'No messages yet' : null],
              ]}
            />
            <View className="mt-4 flex-row flex-wrap gap-2">
              {ig?.connected ? (
                <ActionButton icon="inbox" label="Open inbox" tone="primary" disabled={!!busy} onPress={() => router.push({ pathname: '/whatsapp', params: { channel: 'instagram' } })} />
              ) : null}
              {state !== 'ok' ? (
                <ActionButton icon="instagram" label={state === 'none' ? 'Connect Instagram' : 'Reconnect'} tone="primary" busy={busy === 'connect'} disabled={!!busy} onPress={connect} />
              ) : null}
              <ActionButton icon="check-circle" label="Check status" busy={busy === 'check'} disabled={!!busy} onPress={() => run('check', refreshInstagram, 'Instagram status verified', true)} />
              {ig?.connected && !ig.webhookSubscribed && ig.webhookVerifiable ? (
                <ActionButton icon="bell" label="Subscribe webhook" busy={busy === 'sub'} disabled={!!busy} onPress={() => run('sub', subscribeInstagram, 'Webhook subscribed')} />
              ) : null}
              {ig?.connected || ig?.source ? (
                <ActionButton icon="link-2" label="Disconnect" tone="danger" busy={busy === 'disc'} disabled={!!busy} onPress={disconnect} />
              ) : null}
            </View>
          </Card>

          {state === 'none' ? (
            <Banner tone="info" icon="info">
              Sign in with the Facebook account that manages your Page, then choose the Page and its linked Instagram professional account.
            </Banner>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
