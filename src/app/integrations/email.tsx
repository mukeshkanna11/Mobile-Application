import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import FormField from '@/components/ui/FormField';
import { ActionButton, Banner, Card, Rows, StatusChip, fmtDate } from '@/components/ui/IntegrationUI';
import Segmented from '@/components/ui/Segmented';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  apiMessage,
  deleteEmailAccount,
  detectEmailProvider,
  emailOAuthUrl,
  emptySmtp,
  fetchEmailStatus,
  openOAuth,
  saveSmtpAccount,
  setDefaultEmail,
  smtpFormError,
  smtpFromSuggestion,
  testEmailAccount,
  type EmailAccount,
  type EmailStatus,
  type SmtpForm,
} from '@/services/integrations';
import { fetchMailSummary, type MailSummary } from '@/services/mailbox';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type SmtpDialog = { form: SmtpForm; accountId?: string; label?: string } | null;

/** Email — mobile port of web pages/Integrations/EmailIntegration.jsx (Gmail, Outlook, Zoho, SMTP/IMAP). */
export default function EmailIntegrationScreen() {
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [caps, setCaps] = useState<MailSummary['capabilities']>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [address, setAddress] = useState('');
  const [smtp, setSmtp] = useState<SmtpDialog>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await fetchEmailStatus());
      setError('');
      fetchMailSummary().then((s) => setCaps(s.capabilities ?? []), () => setCaps([]));
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
      if (ok) Alert.alert('Email', ok);
    } catch (err) {
      Alert.alert('Email', apiMessage(err, fallback));
    } finally {
      setBusy('');
      load();
    }
  };

  // OAuth: the server stores the mailbox (bound to this admin + workspace); we re-read status after returning
  const signIn = (provider: string, hint?: string, inbox?: boolean) =>
    run(inbox ? `inbox:${hint}` : provider, async () => {
      const url = await emailOAuthUrl(provider, { hint, inbox });
      if (!url) throw new Error('No sign-in URL');
      await openOAuth(url);
    }, 'Could not start the sign-in.');

  // Same flow as the web "Continue": detect the provider, then OAuth or SMTP
  const detect = () => {
    const value = address.trim();
    if (!EMAIL_RE.test(value)) return Alert.alert('Email', 'Please enter a valid email address.');
    run('detect', async () => {
      const { provider, available, settings } = await detectEmailProvider(value);
      if (provider === 'smtp' || provider === null) {
        setSmtp({ form: smtpFromSuggestion(value, settings), label: settings?.label });
        return;
      }
      if (available) return signIn(provider, value);
      return `${provider} sign-in isn't available yet. You can connect this mailbox with SMTP instead.`;
    }, 'Could not check this address.');
  };

  const saveSmtp = () => {
    if (!smtp) return;
    const editing = !!smtp.accountId;
    const problem = smtpFormError(smtp.form, editing);
    if (problem) return Alert.alert('SMTP', problem);
    run('smtp', async () => {
      await saveSmtpAccount(smtp.form, smtp.accountId);
      setSmtp(null);
      return editing ? 'Mailbox updated' : 'Mailbox connected';
    }, "We couldn't verify these SMTP settings. Please check them and try again.");
  };

  const disconnect = (a: EmailAccount) =>
    Alert.alert('Disconnect mailbox', `Disconnect ${a.email}? Emails already sent stay in the CRM.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: () => run(`del:${a.id}`, async () => { await deleteEmailAccount(a.id); return 'Mailbox disconnected'; }, 'Could not disconnect this mailbox.') },
    ]);

  const enableInbox = (a: EmailAccount) =>
    a.provider === 'smtp' ? setSmtp({ form: { ...emptySmtp(a), imapEnabled: true }, accountId: a.id }) : signIn(a.provider, a.email, true);

  const setField = <K extends keyof SmtpForm>(k: K, v: SmtpForm[K]) => setSmtp((d) => (d ? { ...d, form: { ...d.form, [k]: v } } : d));

  const providers = status?.providers ?? [];
  const accounts = status?.accounts ?? [];

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        icon="mail"
        title="Email"
        subtitle="Send and receive from your own mailbox."
      />
      {loading ? (
        <LoadingState label="Loading email…" />
      ) : error && !status ? (
        <MessageState icon="wifi-off" tone="error" title="Couldn't load email" message={error} actionLabel="Retry" onAction={() => { setLoading(true); load(); }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        >
          {accounts.length ? (
            <ActionButton icon="inbox" label="Open mailbox" tone="primary" onPress={() => router.push('/integrations/mailbox')} />
          ) : null}
          <View className="h-4" />

          {smtp ? (
            <Card title={smtp.accountId ? (smtp.form.imapEnabled ? 'Mailbox settings (IMAP)' : 'Edit SMTP mailbox') : 'Connect with SMTP'}>
              {smtp.label ? <Text className="mb-2 mt-1 text-xs text-indigo-700">Detected {smtp.label} — server settings are filled in.</Text> : <View className="h-3" />}
              <FormField label="Email address" required value={smtp.form.email} onChangeText={(v) => setField('email', v)} autoCapitalize="none" keyboardType="email-address" editable={!smtp.accountId} />
              <FormField label="Display name" value={smtp.form.displayName} onChangeText={(v) => setField('displayName', v)} />
              <FormField label="SMTP host" required value={smtp.form.host} onChangeText={(v) => setField('host', v)} autoCapitalize="none" />
              <FormField label="SMTP port" value={smtp.form.port} onChangeText={(v) => setField('port', v.replace(/\D/g, ''))} keyboardType="number-pad" />
              <Segmented label="Security" options={['ssl', 'starttls'] as const} value={smtp.form.security} onChange={(v) => setField('security', v)} />
              <FormField label="Username" value={smtp.form.username} onChangeText={(v) => setField('username', v)} autoCapitalize="none" placeholder="Defaults to the email address" />
              <FormField label={smtp.accountId ? 'Password (leave blank to keep)' : 'Password'} required={!smtp.accountId} value={smtp.form.password} onChangeText={(v) => setField('password', v)} secureTextEntry autoCapitalize="none" />
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-sm font-medium text-slate-700">Receive email (IMAP)</Text>
                <Switch value={smtp.form.imapEnabled} onValueChange={(v) => setField('imapEnabled', v)} />
              </View>
              {smtp.form.imapEnabled ? (
                <>
                  <FormField label="IMAP host" required value={smtp.form.imapHost} onChangeText={(v) => setField('imapHost', v)} autoCapitalize="none" />
                  <FormField label="IMAP port" value={smtp.form.imapPort} onChangeText={(v) => setField('imapPort', v.replace(/\D/g, ''))} keyboardType="number-pad" />
                  <Segmented label="IMAP security" options={['ssl', 'starttls'] as const} value={smtp.form.imapSecurity} onChange={(v) => setField('imapSecurity', v)} />
                </>
              ) : null}
              <View className="mt-2 flex-row flex-wrap gap-2">
                <ActionButton icon="x" label="Cancel" disabled={busy === 'smtp'} onPress={() => setSmtp(null)} />
                <ActionButton icon="check" label="Save" tone="primary" busy={busy === 'smtp'} disabled={!!busy} onPress={saveSmtp} />
              </View>
            </Card>
          ) : (
            <Card title="Connect a mailbox">
              <View className="mt-3" />
              <FormField label="Work email" value={address} onChangeText={setAddress} autoCapitalize="none" keyboardType="email-address" placeholder="you@company.com" />
              <ActionButton icon="arrow-right" label="Continue" tone="primary" busy={busy === 'detect'} disabled={!!busy} onPress={detect} />
              <Text className="mb-2 mt-4 text-xs text-slate-500">Or choose your provider</Text>
              <View className="flex-row flex-wrap gap-2">
                {providers.map((p) => (
                  <ActionButton
                    key={p.id}
                    icon={p.kind === 'smtp' ? 'server' : 'log-in'}
                    label={p.available ? p.name : `${p.name} (unavailable)`}
                    busy={busy === p.id}
                    disabled={!!busy || !p.available}
                    onPress={() => (p.kind === 'smtp' ? setSmtp({ form: emptySmtp() }) : signIn(p.id, address.trim() || undefined))}
                  />
                ))}
              </View>
            </Card>
          )}

          {accounts.length === 0 ? (
            <Banner tone="info" icon="info">No mailbox connected. Emails are sent from the ReadyTech default sender until you connect one.</Banner>
          ) : (
            accounts.map((a) => {
              const cap = caps?.find((c) => c.accountId === a.id);
              const st = cap?.sync;
              const inbox = cap?.inbox && st
                ? st.status === 'syncing' ? 'Syncing…' : st.status === 'error' ? 'Retrying' : st.status === 'needs_permission' ? 'Read access removed' : `On${st.lastSuccessAt ? ` · ${fmtDate(st.lastSuccessAt)}` : ''}`
                : st?.canEnable && a.status === 'connected' ? 'Off' : 'Not available yet';
              return (
                <Card
                  key={a.id}
                  title={a.email}
                  right={<StatusChip on={a.status === 'connected'} label={a.isDefault ? 'Default' : a.status === 'connected' ? 'Connected' : a.status || 'Unknown'} />}
                >
                  {a.lastError ? <Text className="mt-2 text-xs text-rose-600">{a.lastError}</Text> : null}
                  <Rows
                    rows={[
                      ['Provider', a.providerName],
                      ['Name', a.displayName],
                      ['SMTP', a.smtp?.host ? `${a.smtp.host}:${a.smtp.port}` : null],
                      ['Inbox sync', inbox],
                      ['Last used', fmtDate(a.lastUsedAt)],
                      ['Last tested', fmtDate(a.lastTestedAt)],
                    ]}
                  />
                  <View className="mt-4 flex-row flex-wrap gap-2">
                    <ActionButton icon="send" label="Send test" busy={busy === `test:${a.id}`} disabled={!!busy} onPress={() => run(`test:${a.id}`, async () => (await testEmailAccount(a.id)) || 'Test email sent', 'Test email failed.')} />
                    {!a.isDefault ? (
                      <ActionButton icon="star" label="Make default" busy={busy === `def:${a.id}`} disabled={!!busy} onPress={() => run(`def:${a.id}`, async () => { await setDefaultEmail(a.id); return 'Default mailbox updated'; }, 'Could not set the default mailbox.')} />
                    ) : null}
                    {st?.canEnable && !cap?.inbox && a.status === 'connected' ? (
                      <ActionButton icon="download" label={a.provider === 'smtp' ? 'Add IMAP' : 'Enable inbox sync'} busy={busy === `inbox:${a.email}`} disabled={!!busy} onPress={() => enableInbox(a)} />
                    ) : null}
                    {a.provider === 'smtp' ? (
                      <ActionButton icon="edit-2" label="Edit" disabled={!!busy} onPress={() => setSmtp({ form: emptySmtp(a), accountId: a.id })} />
                    ) : a.status !== 'connected' ? (
                      <ActionButton icon="refresh-cw" label="Reconnect" busy={busy === a.provider} disabled={!!busy} onPress={() => signIn(a.provider, a.email)} />
                    ) : null}
                    <ActionButton icon="link-2" label="Disconnect" tone="danger" busy={busy === `del:${a.id}`} disabled={!!busy} onPress={() => disconnect(a)} />
                  </View>
                </Card>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
