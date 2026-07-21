import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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

import ClientCard from '@/components/ui/ClientCard';
import EnterpriseHeader, { HeaderAction } from '@/components/ui/EnterpriseHeader';
import KpiCard from '@/components/ui/KpiCard';
import Segmented from '@/components/ui/Segmented';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  fetchClients,
  filterClients,
  type Client,
  type ClientFilters,
} from '@/services/clients';

const PAGE_SIZE = 10;
const STATUS_OPTIONS = ['All', 'Active', 'Inactive'] as const;
const TYPE_OPTIONS = ['All', 'Customer', 'Prospect', 'Partner'] as const;

export default function ClientsScreen() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ClientFilters['status']>('All');
  const [type, setType] = useState<ClientFilters['type']>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      setError(false);
      const data = await fetchClients();
      setClients(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload whenever the tab regains focus (e.g. after add/edit/delete).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    load();
  }, [load]);

  const resetPage = () => setPage(1);

  const filtered = useMemo(
    () => filterClients(clients, { search, status, type }),
    [clients, search, status, type]
  );

  const visible = useMemo(
    () => filtered.slice(0, page * PAGE_SIZE),
    [filtered, page]
  );
  const hasMore = visible.length < filtered.length;

  const loadMore = useCallback(() => {
    if (hasMore) setPage((p) => p + 1);
  }, [hasMore]);

  const stats = useMemo(
    () => ({
      total: clients.length,
      active: clients.filter((c) => c.status === 'Active').length,
      customers: clients.filter((c) => c.clientType === 'Customer').length,
    }),
    [clients]
  );

  const filtersActive = search !== '' || status !== 'All' || type !== 'All';

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* Enterprise gradient header */}
      <EnterpriseHeader
        icon="users"
        title="Client Management"
        badge="ReadyTech Solutions"
        subtitle="Manage clients, relationships and activities"
        right={
          <>
            <HeaderAction
              icon="refresh-cw"
              onPress={onRefresh}
              color={refreshing ? '#a5b4fc' : '#ffffff'}
            />
            <HeaderAction
              icon="sliders"
              onPress={() => setShowFilters((v) => !v)}
              color={filtersActive ? '#c7d2fe' : '#ffffff'}
            />
          </>
        }
      >
        {/* KPI cards inside the gradient band */}
        <View className="mt-4 flex-row gap-3">
          <KpiCard
            title="Total Clients"
            value={stats.total}
            icon="users"
            accent="indigo"
            badge="CRM"
          />
          <KpiCard
            title="Active"
            value={stats.active}
            icon="check-circle"
            accent="green"
            badge="Live"
          />
          <KpiCard
            title="Customers"
            value={stats.customers}
            icon="briefcase"
            accent="amber"
            badge="Biz"
          />
        </View>
      </EnterpriseHeader>

      <View className="px-5 pt-3">
        {/* Search */}
        <View className="flex-row items-center rounded-2xl border border-slate-200 bg-white px-3">
          <Feather name="search" size={18} color="#94a3b8" />
          <TextInput
            className="flex-1 py-2.5 pl-2 text-base text-slate-800"
            placeholder="Search name, company, email or phone…"
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={(t) => {
              setSearch(t);
              resetPage();
            }}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable
              hitSlop={10}
              onPress={() => {
                setSearch('');
                resetPage();
              }}
            >
              <Feather name="x" size={18} color="#94a3b8" />
            </Pressable>
          )}
        </View>

        {/* Collapsible filters */}
        {showFilters && (
          <View className="mt-3 rounded-2xl border border-slate-100 bg-white p-4">
            <View className="mb-2 flex-row items-center gap-2">
              <Feather name="filter" size={14} color="#4f46e5" />
              <Text className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                Client Filters
              </Text>
            </View>
            <Segmented
              label="Status"
              options={STATUS_OPTIONS}
              value={status}
              onChange={(v) => {
                setStatus(v);
                resetPage();
              }}
            />
            <Segmented
              label="Type"
              options={TYPE_OPTIONS}
              value={type}
              onChange={(v) => {
                setType(v);
                resetPage();
              }}
            />
            {filtersActive && (
              <Pressable
                onPress={() => {
                  setSearch('');
                  setStatus('All');
                  setType('All');
                  resetPage();
                }}
                className="mt-1 flex-row items-center gap-1.5 self-start rounded-lg bg-red-50 px-3 py-2"
              >
                <Feather name="x" size={14} color="#dc2626" />
                <Text className="text-sm font-medium text-red-600">
                  Clear filters
                </Text>
              </Pressable>
            )}
          </View>
        )}

        <View className="mt-3 flex-row items-center justify-between">
          <Text className="text-xs text-slate-500">
            {loading
              ? 'Loading…'
              : `Showing ${visible.length} of ${filtered.length} clients`}
          </Text>
          <View className="flex-row items-center gap-1.5">
            <View className="h-2 w-2 rounded-full bg-green-500" />
            <Text className="text-xs font-medium text-indigo-600">
              CRM Live Sync
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <LoadingState label="Loading clients…" />
      ) : error ? (
        <MessageState
          icon="wifi-off"
          tone="error"
          title="Couldn't load clients"
          message="Check your connection and try again."
          actionLabel="Retry"
          onAction={() => {
            setLoading(true);
            load();
          }}
        />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 96,
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ClientCard
              client={item}
              onPress={() =>
                router.push({
                  pathname: '/client/[id]',
                  params: { id: item._id },
                })
              }
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <MessageState
              icon={filtersActive ? 'search' : 'users'}
              title={filtersActive ? 'No matches' : 'No clients yet'}
              message={
                filtersActive
                  ? 'Try adjusting your search or filters.'
                  : 'Tap + to add your first client.'
              }
            />
          }
          ListFooterComponent={
            hasMore ? (
              <ActivityIndicator className="py-4" color="#4f46e5" />
            ) : null
          }
        />
      )}

      {/* Add FAB */}
      <Pressable
        onPress={() => router.push('/client/new')}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-indigo-600 shadow-lg active:opacity-90"
      >
        <Feather name="plus" size={26} color="#ffffff" />
      </Pressable>
    </SafeAreaView>
  );
}
