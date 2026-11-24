import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EnterpriseHeader, { HeaderAction } from '@/components/ui/EnterpriseHeader';
import { Banner } from '@/components/ui/IntegrationUI';
import Segmented from '@/components/ui/Segmented';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import { apiMessage } from '@/services/integrations';
import { MAIL_FOLDERS, fetchMail, fetchMailSummary, syncMailbox, updateMailFlags, type MailFolder, type MailItem, type MailSummary } from '@/services/mailbox';

const LABEL: Record<MailFolder, string> = { inbox: 'Inbox', sent: 'Sent', drafts: 'Drafts', starred: 'Starred', archived: 'Archived', trash: 'Trash' };
const FOLDER_BY_LABEL = Object.fromEntries(MAIL_FOLDERS.map((f) => [LABEL[f], f])) as Record<string, MailFolder>;

/** Mailbox — mobile port of the web Mail workspace (pages/Integrations/mail/MailWorkspace.jsx). */
export default function MailboxScreen() {
  const [summary, setSummary] = useState<MailSummary | null>(null);
  const [folder, setFolder] = useState<MailFolder>('inbox');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<MailItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    try {
      const [s, list] = await Promise.all([fetchMailSummary(), fetchMail({ folder, q: query, page: 1 })]);
      setSummary(s);
      setItems(list.items);
      setTotal(list.total ?? list.items.length);
      setPage(1);
      setError('');
    } catch (err) {
      setError(apiMessage(err, 'Could not load the mailbox.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [folder, query]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const loadMore = async () => {
    if (more || items.length >= total) return;
    setMore(true);
    try {
      const list = await fetchMail({ folder, q: query, page: page + 1 });
      setItems((prev) => [...prev, ...list.items.filter((m) => !prev.some((p) => p.id === m.id))]);
      setPage((p) => p + 1);
    } catch {
      /* next scroll retries */
    } finally {
      setMore(false);
    }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      await syncMailbox();
      await load();
    } catch (err) {
      Alert.alert('Mailbox', apiMessage(err, 'Could not check for new email.'));
    } finally {
      setSyncing(false);
    }
  };

  const star = async (m: MailItem) => {
    setItems((prev) => prev.map((x) => (x.id === m.id ? { ...x, starred: !m.starred } : x)));
    try {
      await updateMailFlags(m.id, { starred: !m.starred });
    } catch (err) {
      setItems((prev) => prev.map((x) => (x.id === m.id ? { ...x, starred: m.starred } : x)));
      Alert.alert('Mailbox', apiMessage(err, 'Could not update this email.'));
    }
  };

  const counts = summary?.counts ?? {};
  const noMailbox = summary && !(summary.accounts ?? []).length;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        icon="inbox"
        title="Mailbox"
        subtitle={counts.inboxUnread ? `${counts.inboxUnread} unread` : 'Email for this workspace'}
        right={
          <View className="flex-row gap-3">
            {syncing ? <ActivityIndicator color="#fff" /> : <HeaderAction icon="refresh-cw" onPress={sync} />}
            <HeaderAction icon="edit" disabled={!!noMailbox} onPress={() => router.push('/integrations/mail/compose')} />
          </View>
        }
      >
        <View className="mt-3 flex-row items-center rounded-2xl bg-white/10 px-3">
          <Feather name="search" size={16} color="#cbd5e1" />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search mail" placeholderTextColor="#94a3b8" className="ml-2 flex-1 py-2.5 text-white" />
        </View>
      </EnterpriseHeader>

      <View className="px-4 pt-3">
        <Segmented scroll options={MAIL_FOLDERS.map((f) => LABEL[f])} value={LABEL[folder]} onChange={(l) => { setLoading(true); setFolder(FOLDER_BY_LABEL[l]); }} />
      </View>

      {loading ? (
        <LoadingState label="Loading mail…" />
      ) : error ? (
        <MessageState icon="wifi-off" tone="error" title="Couldn't load mail" message={error} actionLabel="Retry" onAction={() => { setLoading(true); load(); }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          ListHeaderComponent={
            noMailbox ? (
              <Banner tone="info" icon="info">Connect a mailbox in Email settings to send and receive here.</Banner>
            ) : folder === 'inbox' && summary?.inbox && !summary.inbox.available && summary.inbox.reason ? (
              <Banner tone="info" icon="info">{summary.inbox.reason}</Banner>
            ) : null
          }
          ListEmptyComponent={<MessageState icon="mail" title={query ? 'No emails match' : `No emails in ${LABEL[folder]}`} />}
          ListFooterComponent={more ? <ActivityIndicator className="mt-3" /> : null}
          renderItem={({ item: m }) => {
            const who = m.direction === 'outbound' ? `To: ${(m.to ?? []).join(', ')}` : m.fromName || m.from || '';
            const unread = m.direction === 'inbound' && !m.read;
            return (
              <Pressable
                onPress={() =>
                  m.status === 'draft' || m.status === 'failed'
                    ? router.push({ pathname: '/integrations/mail/compose', params: { draftId: m.id } })
                    : router.push({ pathname: '/integrations/mail/[id]', params: { id: m.id } })
                }
                className="mb-2 flex-row rounded-2xl border border-slate-200 bg-white p-3 active:opacity-80"
              >
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className={`flex-1 text-sm ${unread ? 'font-bold text-slate-900' : 'text-slate-700'}`} numberOfLines={1}>{who || '(no sender)'}</Text>
                    <Text className="ml-2 text-[11px] text-slate-400">{m.date ? new Date(m.date).toLocaleDateString() : ''}</Text>
                  </View>
                  <Text className={`mt-0.5 text-sm ${unread ? 'font-semibold text-slate-900' : 'text-slate-800'}`} numberOfLines={1}>{m.subject || '(no subject)'}</Text>
                  <Text className="mt-0.5 text-xs text-slate-500" numberOfLines={2}>{m.status === 'failed' ? `Failed: ${m.error || 'not sent'}` : m.snippet}</Text>
                </View>
                <Pressable hitSlop={10} onPress={() => star(m)} className="ml-2 justify-center">
                  <Feather name="star" size={16} color={m.starred ? '#f59e0b' : '#cbd5e1'} />
                </Pressable>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
