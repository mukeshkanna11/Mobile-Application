import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import FormField from '@/components/ui/FormField';
import { ActionButton, Banner, Card, Rows, StatusChip, fmtDate } from '@/components/ui/IntegrationUI';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import { apiMessage, connectWhatsApp, disconnectWhatsApp } from '@/services/integrations';
import { fetchMetaStatus, syncWhatsAppAccount, type MetaStatus } from '@/services/meta';

type Busy = '' | 'connect' | 'sync' | 'disconnect';
const EMPTY = { phoneNumberId: '', wabaId: '', accessToken: '' };

/** WhatsApp — mobile port of web WhatsAppIntegration + WhatsAppConnection (workspace connection). */
export default function WhatsAppIntegrationScreen() {
  const [status, setStatus] = useState<MetaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<Busy>('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    try {
      setStatus(await fetchMetaStatus());
      setError('');
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

  // State changes only after the backend confirms, then the real status is re-read
  const run = async (key: Busy, action: () => Promise<unknown>, ok: string, fallback: string) => {
    try {
      setBusy(key);
      await action();
      Alert.alert('WhatsApp', ok);
    } catch (err) {
      Alert.alert('WhatsApp', apiMessage(err, fallback));
    } finally {
      await load();
      setBusy('');
    }
  };

  const connect = () => {
    const input = { phoneNumberId: form.phoneNumberId.trim(), wabaId: form.wabaId.trim(), accessToken: form.accessToken.trim() };
    if (!input.phoneNumberId || !input.wabaId || !input.accessToken) {
      Alert.alert('WhatsApp', 'Enter the Phone Number ID, WhatsApp Business Account ID and System User token.');
      return;
    }
    run(
      'connect',
      async () => {
        await connectWhatsApp(input);
        setForm(EMPTY); // the token is never kept on the device
        setShowForm(false);
      },
      'WhatsApp connected',
      'Could not connect WhatsApp. Check the IDs and token.'
    );
  };

  const disconnect = () =>
    Alert.alert('Disconnect WhatsApp', "Disconnect this workspace's WhatsApp number? Chats and leads are kept.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: () => run('disconnect', disconnectWhatsApp, 'WhatsApp disconnected', "Couldn't disconnect WhatsApp.") },
    ]);

  const wa = status?.whatsapp;
  const configured = !!wa?.phoneNumberId;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader onBack icon="message-circle" title="WhatsApp" subtitle="This workspace's WhatsApp Business number." />
      {loading ? (
        <LoadingState label="Loading WhatsApp…" />
      ) : error && !status ? (
        <MessageState icon="wifi-off" tone="error" title="Couldn't load WhatsApp" message={error} actionLabel="Retry" onAction={() => { setLoading(true); load(); }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        >
          {wa?.lastError ? <Banner tone="error" icon="x-circle">{wa.lastError}</Banner> : null}

          <Card title="WhatsApp Business" right={<StatusChip on={wa?.connected} label={wa?.connected ? 'Connected' : configured ? 'Needs attention' : 'Not connected'} />}>
            <Rows
              rows={[
                ['Number', wa?.displayPhoneNumber],
                ['Business name', wa?.verifiedName],
                ['Phone Number ID', wa?.phoneNumberId],
                ['WABA ID', wa?.wabaId],
                ['Quality', wa?.qualityRating],
                ['Webhook', configured ? (wa?.webhookSubscribed ? 'Subscribed' : 'Not subscribed') : null],
                ['Last message', fmtDate(wa?.lastInboundAt)],
                ['Last synced', fmtDate(wa?.lastSyncedAt)],
              ]}
            />
            <View className="mt-4 flex-row flex-wrap gap-2">
              {configured ? (
                <>
                  <ActionButton icon="inbox" label="Open inbox" tone="primary" disabled={!!busy} onPress={() => router.push({ pathname: '/whatsapp', params: { channel: 'whatsapp' } })} />
                  <ActionButton icon="refresh-cw" label="Sync" busy={busy === 'sync'} disabled={!!busy} onPress={() => run('sync', syncWhatsAppAccount, 'WhatsApp account synced', 'Could not sync the WhatsApp account.')} />
                  <ActionButton icon="repeat" label={showForm ? 'Cancel change' : 'Change number'} disabled={!!busy} onPress={() => setShowForm((v) => !v)} />
                  <ActionButton icon="link-2" label="Disconnect" tone="danger" busy={busy === 'disconnect'} disabled={!!busy} onPress={disconnect} />
                </>
              ) : (
                <ActionButton icon="link" label={showForm ? 'Hide form' : 'Connect WhatsApp'} tone="primary" disabled={!!busy} onPress={() => setShowForm((v) => !v)} />
              )}
            </View>
          </Card>

          {showForm ? (
            <Card title={configured ? 'Reconnect with a System User token' : 'Connect with a System User token'}>
              <Text className="mb-3 mt-1 text-xs text-slate-500">
                From Meta Business Settings → WhatsApp Accounts. The token is sent to the server once and stored there securely.
              </Text>
              <FormField label="Phone Number ID" required value={form.phoneNumberId} onChangeText={(v) => setForm((f) => ({ ...f, phoneNumberId: v }))} autoCapitalize="none" keyboardType="number-pad" />
              <FormField label="WhatsApp Business Account ID" required value={form.wabaId} onChangeText={(v) => setForm((f) => ({ ...f, wabaId: v }))} autoCapitalize="none" keyboardType="number-pad" />
              <FormField label="System User access token" required value={form.accessToken} onChangeText={(v) => setForm((f) => ({ ...f, accessToken: v }))} autoCapitalize="none" autoCorrect={false} secureTextEntry />
              <ActionButton icon="check" label="Save connection" tone="primary" busy={busy === 'connect'} disabled={!!busy} onPress={connect} />
            </Card>
          ) : null}

          <Banner tone="info" icon="info">
            One-tap Meta Embedded Signup (including WhatsApp Business app coexistence) runs on the website, because it needs Meta&apos;s web SDK. The connection then appears here automatically.
          </Banner>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
