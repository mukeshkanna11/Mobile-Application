import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  apiError,
  getNotifications,
  markNotificationsRead,
  timeAgo,
  type AppNotification,
} from '@/services/profile';

type FeatherName = keyof typeof Feather.glyphMap;

const TYPE_ICON: Record<string, FeatherName> = {
  lead: 'user-plus',
  opportunity: 'target',
  invoice: 'file-text',
  sales_order: 'shopping-bag',
  purchase_order: 'shopping-cart',
  automation: 'zap',
  password: 'lock',
  security: 'shield',
};

export default function NotificationsScreen() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [disabled, setDisabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const feed = await getNotifications();
      setItems(feed.items || []);
      setUnread(feed.unread || 0);
      setDisabled(!!feed.disabled);
    } catch (e) {
      setError(apiError(e, 'Could not load notifications.'));
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

  const markAllRead = async () => {
    try {
      setMarking(true);
      await markNotificationsRead();
      setItems((list) => list.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch (e) {
      setError(apiError(e, 'Could not mark notifications as read.'));
    } finally {
      setMarking(false);
    }
  };

  const renderItem = ({ item }: { item: AppNotification }) => (
    <View
      className={`mb-3 flex-row rounded-3xl border p-4 shadow-sm ${
        item.read ? 'border-slate-200 bg-white' : 'border-indigo-200 bg-indigo-50/60'
      }`}
    >
      <View className="h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white">
        <Feather name={TYPE_ICON[item.type] ?? 'bell'} size={18} color={item.read ? '#64748b' : '#4f46e5'} />
      </View>
      <View className="ml-3 min-w-0 flex-1">
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 text-sm font-semibold text-slate-900" numberOfLines={1}>
            {item.title}
          </Text>
          {!item.read ? <View className="ml-2 h-2 w-2 rounded-full bg-indigo-600" /> : null}
        </View>
        {item.name ? (
          <Text className="mt-0.5 text-sm text-slate-700" numberOfLines={2}>
            {item.name}
          </Text>
        ) : null}
        <Text className="mt-1 text-xs text-slate-500">
          {[item.meta, timeAgo(item.createdAt)].filter(Boolean).join(' · ')}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        icon="bell"
        title="Notifications"
        badge={unread ? `${unread} unread` : 'All caught up'}
        subtitle="Leads, deals, invoices, orders and alerts"
      />

      {loading ? (
        <LoadingState label="Loading notifications…" />
      ) : error && !items.length ? (
        <MessageState icon="alert-circle" title="Notifications unavailable" message={error} actionLabel="Retry" onAction={load} />
      ) : disabled ? (
        <MessageState
          icon="bell-off"
          title="Notifications are turned off"
          message="Your administrator has switched off push notifications for this workspace."
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20, paddingBottom: 40, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          ListHeaderComponent={
            <>
              {error ? <Text className="mb-3 text-sm text-rose-600">{error}</Text> : null}
              {unread > 0 ? (
                <Pressable
                  onPress={markAllRead}
                  disabled={marking}
                  className="mb-4 flex-row items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white py-2.5 active:bg-indigo-50"
                >
                  {marking ? (
                    <ActivityIndicator color="#4f46e5" />
                  ) : (
                    <>
                      <Feather name="check-square" size={15} color="#4f46e5" />
                      <Text className="text-sm font-semibold text-indigo-700">Mark all as read</Text>
                    </>
                  )}
                </Pressable>
              ) : null}
            </>
          }
          ListEmptyComponent={
            <MessageState icon="bell" title="No notifications yet" message="New leads, deals, invoices and alerts will appear here." />
          }
        />
      )}
    </SafeAreaView>
  );
}
