import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import FormField from '@/components/ui/FormField';
import { ActionButton } from '@/components/ui/IntegrationUI';
import SearchablePicker from '@/components/ui/SearchablePicker';
import { LoadingState } from '@/components/ui/StateView';
import { apiMessage } from '@/services/integrations';
import { fetchMailMessage, fetchMailSummary, mailBodyText, newClientId, saveMailDraft, sendMail, type MailDraft, type MailSummary } from '@/services/mailbox';

/** Compose / reply / resume a draft — web MailComposer (sent through the workspace's connected mailbox). */
export default function ComposeMailScreen() {
  const params = useLocalSearchParams<{ draftId?: string; to?: string; subject?: string; accountId?: string }>();
  const [accounts, setAccounts] = useState<NonNullable<MailSummary['accounts']>>([]);
  const [draftId, setDraftId] = useState(params.draftId || '');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<'' | 'send' | 'draft'>('');
  const [f, setF] = useState<MailDraft>({ accountId: params.accountId || '', to: params.to || '', cc: '', bcc: '', subject: params.subject || '', body: '' });
  const clientId = useRef(newClientId()); // same id on retries → the server never sends twice

  useEffect(() => {
    (async () => {
      try {
        const s = await fetchMailSummary();
        const list = s.accounts ?? [];
        setAccounts(list);
        let next: Partial<MailDraft> = {};
        if (params.draftId) {
          const d = await fetchMailMessage(params.draftId);
          next = { accountId: d.account || '', to: (d.to ?? []).join(', '), cc: (d.cc ?? []).join(', '), bcc: (d.bcc ?? []).join(', '), subject: d.subject || '', body: mailBodyText(d) };
        }
        setF((x) => {
          const merged = { ...x, ...next };
          return { ...merged, accountId: merged.accountId || list.find((a) => a.isDefault)?.id || list[0]?.id || '' };
        });
      } catch (err) {
        Alert.alert('Compose', apiMessage(err, 'Could not load your mailboxes.'));
      } finally {
        setReady(true);
      }
    })();
  }, [params.draftId]);

  const set = (k: keyof MailDraft) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  const send = async () => {
    if (!f.to.trim()) return Alert.alert('Compose', 'Add at least one recipient.');
    try {
      setBusy('send');
      const msg = await sendMail(f, { draftId: draftId || undefined, clientId: clientId.current });
      Alert.alert('Mailbox', msg || 'Email sent');
      router.back();
    } catch (err) {
      Alert.alert('Compose', apiMessage(err, "The email couldn't be sent. Please try again."));
    } finally {
      setBusy('');
    }
  };

  const saveDraft = async () => {
    try {
      setBusy('draft');
      const d = await saveMailDraft(f, draftId || undefined);
      if (d?.id) setDraftId(d.id);
      Alert.alert('Mailbox', 'Draft saved');
    } catch (err) {
      Alert.alert('Compose', apiMessage(err, 'Could not save the draft.'));
    } finally {
      setBusy('');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader onBack icon="edit" title={draftId ? 'Edit draft' : 'New email'} subtitle="Sent from your connected mailbox." />
      {!ready ? (
        <LoadingState label="Preparing…" />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {accounts.length > 1 ? (
            <SearchablePicker
              label="From"
              value={f.accountId}
              options={accounts.map((a) => ({ label: a.email, sublabel: a.providerName, value: a.id }))}
              onSelect={set('accountId')}
            />
          ) : null}
          <FormField label="To" required value={f.to} onChangeText={set('to')} autoCapitalize="none" keyboardType="email-address" placeholder="name@company.com, …" />
          <FormField label="Cc" value={f.cc} onChangeText={set('cc')} autoCapitalize="none" keyboardType="email-address" />
          <FormField label="Bcc" value={f.bcc} onChangeText={set('bcc')} autoCapitalize="none" keyboardType="email-address" />
          <FormField label="Subject" value={f.subject} onChangeText={set('subject')} />
          <FormField label="Message" multiline value={f.body} onChangeText={set('body')} style={{ minHeight: 220, textAlignVertical: 'top' }} />
          <View className="flex-row flex-wrap gap-2">
            <ActionButton icon="save" label="Save draft" busy={busy === 'draft'} disabled={!!busy} onPress={saveDraft} />
            <ActionButton icon="send" label="Send" tone="primary" busy={busy === 'send'} disabled={!!busy || !accounts.length} onPress={send} />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
