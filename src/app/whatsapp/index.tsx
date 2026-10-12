import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EnterpriseHeader, { HeaderAction } from '@/components/ui/EnterpriseHeader';
import Segmented from '@/components/ui/Segmented';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import { isForbidden } from '@/services/products';
import {
  conversationName,
  fetchConversations,
  shortTime,
  type Conversation,
  type Pagination,
} from '@/services/whatsapp';

const PAGE_SIZE = 20;
/** Same safety-net poll as the web inbox; real updates arrive via webhook. */
const LIST_REFRESH_MS = 30000;
const FILTERS = ['All', 'Unread'] as const;

function ConversationRow({ c, onPress }: { c: Conversation; onPress: () => void }) {
  const unread = c.unreadCount > 0;
  const name = conversationName(c);
  return (
    <Pressable
      onPress={onPress}
      className="mb-2 flex-row items-center rounded-2xl border border-slate-100 bg-white p-3.5 active:bg-slate-50"
    >
      <View className="h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100">
        <Text className="text-base font-bold text-emerald-700">
          {name.replace(/[^A-Za-z0-9]/g, '').charAt(0).toUpperCase() || '#'}
        </Text>
      </View>
      <View className="ml-3 min-w-0 flex-1">
        <View className="flex-row items-center">
          <Text
            className={`flex-1 text-sm text-slate-900 ${unread ? 'font-bold' : 'font-semibold'}`}
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text className={`ml-2 text-[11px] ${unread ? 'font-semibold text-emerald-600' : 'text-slate-400'}`}>
            {shortTime(c.lastMessageAt)}
          </Text>
        </View>
        <View className="mt-0.5 flex-row items-center">
          {c.lastMessageDirection === 'outbound' ? (
            <Feather name="corner-up-right" size={11} color="#94a3b8" style={{ marginRight: 3 }} />
          ) : null}
          <Text
            className={`flex-1 text-xs ${unread ? 'text-slate-700' : 'text-slate-500'}`}
            numberOfLines={1}
          >
            {c.lastMessagePreview || c.phoneNumber}
          </Text>
          {unread ? (
            <View className="ml-2 min-w-[20px] items-center rounded-full bg-emerald-500 px-1.5 py-0.5">
              <Text className="text-[10px] font-bold text-white">
                {c.unreadCount > 99 ? '99+' : c.unreadCount}
              </Text>
            </View>
          ) : null}
        </View>
        {c.lead || c.client ? (
          <Text className="mt-1 text-[11px] text-indigo-600" numberOfLines={1}>
            {c.lead ? `Lead · ${c.lead.name ?? ''}` : `Client · ${c.client?.companyName ?? ''}`}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function WhatsAppInboxScreen() {
  const [items, setItems] = useState<Conversation[]>([]);
  const [pagination, setPagination] = useState<Pagination | undefined>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');

  // Loaded count, read by the poller so a silent refresh keeps extra pages.
  const countRef = useRef(0);
  useEffect(() => {
    countRef.current = items.length;
  }, [items.length]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const unreadOnly = filter === 'Unread';

  /** Reloads from page 1; `silent` polls keep the list and ignore failures. */
  const reload = useCallback(
    async (silent = false) => {
      try {
        const limit = silent ? Math.min(50, Math.max(PAGE_SIZE, countRef.current)) : PAGE_SIZE;
        const res = await fetchConversations({ page: 1, limit, search: debounced, unread: unreadOnly });
        setItems(res.items);
        setPagination(res.pagination);
        setError(false);
      } catch (err) {
        if (!silent) {
          setForbidden(isForbidden(err));
          setError(true);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [debounced, unreadOnly]
  );

  // Loads on focus and whenever the filters change; polls only while focused.
  useFocusEffect(
    useCallback(() => {
      reload();
      const id = setInterval(() => reload(true), LIST_REFRESH_MS);
      return () => clearInterval(id);
    }, [reload])
  );

  const hasMore = Boolean(pagination && items.length < pagination.total);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    try {
      const page = Math.floor(items.length / PAGE_SIZE) + 1;
      const res = await fetchConversations({ page, limit: PAGE_SIZE, search: debounced, unread: unreadOnly });
      setItems((prev) => {
        const seen = new Set(prev.map((c) => c._id));
        return [...prev, ...res.items.filter((c) => !seen.has(c._id))];
      });
      setPagination(res.pagination);
    } catch {
      /* next scroll retries */
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, loading, items.length, debounced, unreadOnly]);

  const onRefresh = () => {
    setRefreshing(true);
    reload();
  };

  const totalUnread = useMemo(() => items.reduce((n, c) => n + (c.unreadCount || 0), 0), [items]);
  const filtersActive = debounced.trim() !== '' || unreadOnly;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        icon="message-circle"
        title="WhatsApp Inbox"
        badge="CRM"
        subtitle={
          totalUnread > 0
            ? `${totalUnread} unread message${totalUnread === 1 ? '' : 's'}`
            : 'Customer conversations from WhatsApp'
        }
        right={
          <HeaderAction icon="refresh-cw" onPress={onRefresh} color={refreshing ? '#a5b4fc' : '#ffffff'} />
        }
      />

      <View className="px-5 pt-3">
        <View className="flex-row items-center rounded-2xl border border-slate-200 bg-white px-3">
          <Feather name="search" size={18} color="#94a3b8" />
          <TextInput
            className="flex-1 py-2.5 pl-2 text-base text-slate-800"
            placeholder="Search name or phone…"
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable hitSlop={10} onPress={() => setSearch('')}>
              <Feather name="x" size={18} color="#94a3b8" />
            </Pressable>
          )}
        </View>
        <View className="mt-3">
          <Segmented options={FILTERS} value={filter} onChange={setFilter} />
        </View>
        {!loading && pagination ? (
          <Text className="text-xs text-slate-500">
            Showing {items.length} of {pagination.total}
          </Text>
        ) : null}
      </View>

      {loading ? (
        <LoadingState label="Loading conversations…" />
      ) : error && forbidden ? (
        <MessageState
          icon="lock"
          title="Access restricted"
          message="Your account can't view the WhatsApp inbox. Ask an administrator for access."
        />
      ) : error ? (
        <MessageState
          icon="wifi-off"
          tone="error"
          title="Couldn't load conversations"
          message="Check your connection and try again."
          actionLabel="Retry"
          onAction={() => {
            setLoading(true);
            reload();
          }}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(c) => c._id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          renderItem={({ item }) => (
            <ConversationRow
              c={item}
              onPress={() => router.push({ pathname: '/whatsapp/[id]', params: { id: item._id } })}
            />
          )}
          ListEmptyComponent={
            <MessageState
              icon={filtersActive ? 'search' : 'message-circle'}
              title={filtersActive ? 'No conversations match' : 'No conversations yet'}
              message={
                filtersActive
                  ? 'Try a different search or show all conversations.'
                  : 'Incoming WhatsApp messages will appear here.'
              }
            />
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator className="py-4" color="#059669" /> : null}
        />
      )}
    </SafeAreaView>
  );
}
