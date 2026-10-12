import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EnterpriseHeader, { HeaderAction } from '@/components/ui/EnterpriseHeader';
import KpiCard from '@/components/ui/KpiCard';
import Segmented from '@/components/ui/Segmented';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import SalesOrderCard from '@/components/ui/SalesOrderCard';
import { money } from '@/services/invoices';
import {
  fetchSalesOrders,
  filterSalesOrders,
  STATUS_FILTER_OPTIONS,
  salesOrderStats,
  type SalesOrder,
  type SOFilters,
} from '@/services/salesOrders';

const PAGE_SIZE = 10;

export default function SalesOrdersScreen() {
  const [rows, setRows] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SOFilters['status']>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const load = useCallback(async (opts: { refreshing?: boolean } = {}) => {
    if (!opts.refreshing) setLoading(true);
    setError(false);
    try {
      setRows(await fetchSalesOrders());
    } catch {
      setError(true);
      setRows([]);
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

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    load({ refreshing: true });
  };
  const resetPage = () => setPage(1);

  const stats = useMemo(() => salesOrderStats(rows), [rows]);
  const filtered = useMemo(
    () => filterSalesOrders(rows, { search, status }),
    [rows, search, status]
  );
  const visible = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);
  const hasMore = visible.length < filtered.length;
  const loadMore = useCallback(() => {
    if (hasMore) setPage((p) => p + 1);
  }, [hasMore]);

  const filtersActive = search !== '' || status !== 'All';

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        icon="file-text"
        title="Sales Orders"
        badge="ERP"
        subtitle="Customer orders & fulfilment"
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingTop: 16, paddingRight: 4 }}
        >
          <View style={{ width: 150 }}>
            <KpiCard title="Total Orders" value={stats.total} icon="file-text" accent="indigo" badge="All" />
          </View>
          <View style={{ width: 150 }}>
            <KpiCard title="Pending Approval" value={stats.draft} icon="clock" accent="amber" badge="Draft" />
          </View>
          <View style={{ width: 150 }}>
            <KpiCard title="Approved" value={stats.approved} icon="check-circle" accent="indigo" badge="Ready" />
          </View>
          <View style={{ width: 150 }}>
            <KpiCard title="Delivered" value={stats.delivered} icon="truck" accent="green" badge="Done" />
          </View>
          <View style={{ width: 150 }}>
            <KpiCard title="Revenue" value={money(stats.revenue)} icon="trending-up" accent="green" badge="Sales" />
          </View>
          <View style={{ width: 150 }}>
            <KpiCard title="Average Order" value={money(stats.avgOrder)} icon="bar-chart-2" accent="indigo" badge="Avg" />
          </View>
          <View style={{ width: 150 }}>
            <KpiCard title="Customers" value={stats.customers} icon="users" accent="amber" badge="Unique" />
          </View>
        </ScrollView>
      </EnterpriseHeader>

      <View className="px-5 pt-3">
        <View className="flex-row items-center rounded-2xl border border-slate-200 bg-white px-3">
          <Feather name="search" size={18} color="#94a3b8" />
          <TextInput
            className="flex-1 py-2.5 pl-2 text-base text-slate-800"
            placeholder="Search SO number, customer, product…"
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
            <Pressable hitSlop={10} onPress={() => { setSearch(''); resetPage(); }}>
              <Feather name="x" size={18} color="#94a3b8" />
            </Pressable>
          )}
        </View>

        {showFilters && (
          <View className="mt-3 rounded-2xl border border-slate-100 bg-white p-4">
            <View className="mb-2 flex-row items-center gap-2">
              <Feather name="filter" size={14} color="#4f46e5" />
              <Text className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                Sales Order Filters
              </Text>
            </View>
            <Segmented
              label="Status"
              options={STATUS_FILTER_OPTIONS}
              scroll
              value={status}
              onChange={(v) => { setStatus(v); resetPage(); }}
            />
            {filtersActive && (
              <Pressable
                onPress={() => { setSearch(''); setStatus('All'); resetPage(); }}
                className="mt-1 flex-row items-center gap-1.5 self-start rounded-lg bg-red-50 px-3 py-2"
              >
                <Feather name="x" size={14} color="#dc2626" />
                <Text className="text-sm font-medium text-red-600">Clear all filters</Text>
              </Pressable>
            )}
          </View>
        )}

        <Text className="mt-3 text-xs text-slate-500">
          {loading ? 'Loading…' : `Showing ${visible.length} of ${filtered.length} · ${rows.length} total`}
        </Text>
      </View>

      {loading ? (
        <LoadingState label="Loading sales orders…" />
      ) : error ? (
        <MessageState
          icon="wifi-off"
          tone="error"
          title="Failed to fetch sales orders"
          message="Check your connection and try again."
          actionLabel="Retry"
          onAction={() => load()}
        />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 96, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <SalesOrderCard
              so={item}
              onPress={() =>
                router.push({ pathname: '/sales-order/[id]', params: { id: item._id } })
              }
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <MessageState
              icon={filtersActive ? 'search' : 'file-text'}
              title={filtersActive ? 'No sales orders match' : 'No sales orders yet'}
              message={
                filtersActive
                  ? 'Try adjusting or clearing your filters.'
                  : 'Tap + to add your first sales order.'
              }
            />
          }
          ListFooterComponent={hasMore ? <ActivityIndicator className="py-4" color="#4f46e5" /> : null}
        />
      )}

      <Pressable
        onPress={() => router.push('/sales-order/new')}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-indigo-600 shadow-lg active:opacity-90"
      >
        <Feather name="plus" size={26} color="#ffffff" />
      </Pressable>
    </SafeAreaView>
  );
}
