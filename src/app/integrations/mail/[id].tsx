import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import { ActionButton, Card, Rows, fmtDate } from '@/components/ui/IntegrationUI';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import { apiMessage } from '@/services/integrations';
import { deleteMail, fetchMailMessage, mailBodyText, updateMailFlags, type MailMessage } from '@/services/mailbox';

/** One email — web MailWorkspace message view (flags, delete, reply). */
export default function MailMessageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [m, setM] = useState<MailMessage | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      const msg = await fetchMailMessage(id);
      setM(msg);
      if (msg.direction === 'inbound' && !msg.read) {
        updateMailFlags(id, { read: true }).catch(() => {}); // opening marks it read, as on the web
      }
    } catch (err) {
      setError(apiMessage(err, 'Could not open this email.'));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const flag = async (key: string, patch: Parameters<typeof updateMailFlags>[1], done?: string, leave = false) => {
    try {
      setBusy(key);
      await updateMailFlags(id, patch);
      if (leave) return router.back();
      setM((x) => (x ? { ...x, ...patch } : x));
      if (done) Alert.alert('Mailbox', done);
    } catch (err) {
      Alert.alert('Mailbox', apiMessage(err, 'Could not update this email.'));
    } finally {
      setBusy('');
    }
  };

  const remove = () =>
    Alert.alert('Delete email', "Delete this email permanently? This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy('del');
            await deleteMail(id);
            router.back();
          } catch (err) {
            Alert.alert('Mailbox', apiMessage(err, 'Could not delete this email.'));
          } finally {
            setBusy('');
          }
        },
      },
    ]);

  const reply = () =>
    m &&
    router.push({
      pathname: '/integrations/mail/compose',
      params: {
        to: m.direction === 'inbound' ? m.from || '' : (m.to ?? []).join(', '),
        subject: /^re:/i.test(m.subject || '') ? m.subject : `Re: ${m.subject || ''}`,
        accountId: m.account || '',
      },
    });

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader onBack icon="mail" title={m?.subject || 'Email'} subtitle={m?.accountEmail || undefined} />
      {error ? (
        <MessageState icon="alert-circle" tone="error" title="Couldn't open email" message={error} actionLabel="Retry" onAction={() => { setError(''); load(); }} />
      ) : !m ? (
        <LoadingState label="Opening email…" />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <Card title={m.subject || '(no subject)'}>
            <Rows
              rows={[
                ['From', m.fromName ? `${m.fromName} <${m.from}>` : m.from],
                ['To', (m.to ?? []).join(', ')],
                ['Cc', (m.cc ?? []).join(', ')],
                ['Bcc', (m.bcc ?? []).join(', ')],
                ['Date', fmtDate(m.date)],
                ['Attachments', m.attachments?.length ? m.attachments.map((a) => a.filename).join(', ') : null],
              ]}
            />
          </Card>
          <View className="mb-4 rounded-3xl border border-slate-200 bg-white p-4">
            <Text selectable className="text-sm leading-6 text-slate-800">{mailBodyText(m) || '(empty message)'}</Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {!m.trashed ? <ActionButton icon="corner-up-left" label="Reply" tone="primary" disabled={!!busy} onPress={reply} /> : null}
            <ActionButton icon="star" label={m.starred ? 'Unstar' : 'Star'} busy={busy === 'star'} disabled={!!busy} onPress={() => flag('star', { starred: !m.starred })} />
            {m.direction === 'inbound' ? (
              <ActionButton icon="eye-off" label="Mark unread" busy={busy === 'read'} disabled={!!busy} onPress={() => flag('read', { read: false }, undefined, true)} />
            ) : null}
            {!m.trashed ? (
              <ActionButton icon="archive" label={m.archived ? 'Unarchive' : 'Archive'} busy={busy === 'arch'} disabled={!!busy} onPress={() => flag('arch', { archived: !m.archived }, undefined, true)} />
            ) : null}
            {m.trashed ? (
              <>
                <ActionButton icon="rotate-ccw" label="Restore" busy={busy === 'trash'} disabled={!!busy} onPress={() => flag('trash', { trashed: false }, undefined, true)} />
                <ActionButton icon="trash-2" label="Delete forever" tone="danger" busy={busy === 'del'} disabled={!!busy} onPress={remove} />
              </>
            ) : (
              <ActionButton icon="trash-2" label="Move to trash" tone="danger" busy={busy === 'trash'} disabled={!!busy} onPress={() => flag('trash', { trashed: true }, undefined, true)} />
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
