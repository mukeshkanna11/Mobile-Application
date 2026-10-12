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
import PurchaseOrderCard from '@/components/ui/PurchaseOrderCard';
import { money } from '@/services/invoices';
import {
  fetchPurchaseOrders,
  filterPurchaseOrders,
  STATUS_FILTER_OPTIONS,
  purchaseOrderStats,
  type PurchaseOrder,
  type POFilters,
} from '@/services/purchaseOrders';

const PAGE_SIZE = 10;

export default function PurchaseOrdersScreen() {
  const [rows, setRows] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<POFilters['status']>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const load = useCallback(async (opts: { refreshing?: boolean } = {}) => {
    if (!opts.refreshing) setLoading(true);
    setError(false);
    try {
      setRows(await fetchPurchaseOrders());
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

  const stats = useMemo(() => purchaseOrderStats(rows), [rows]);
  const filtered = useMemo(
    () => filterPurchaseOrders(rows, { search, status }),
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
        icon="shopping-cart"
        title="Purchase Orders"
        badge="ERP"
        subtitle="Vendor purchases & stock receipts"
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
            <KpiCard title="Total POs" value={stats.total} icon="shopping-cart" accent="indigo" badge="All" />
          </View>
          <View style={{ width: 150 }}>
            <KpiCard title="Draft" value={stats.draft} icon="edit-3" accent="amber" badge="Open" />
          </View>
          <View style={{ width: 150 }}>
            <KpiCard title="Received" value={stats.received} icon="check-circle" accent="green" badge="Stocked" />
          </View>
          <View style={{ width: 150 }}>
            <KpiCard title="Total Value" value={money(stats.totalValue)} icon="trending-up" accent="indigo" badge="Spend" />
          </View>
          <View style={{ width: 150 }}>
            <KpiCard title="Avg PO Value" value={money(stats.avgValue)} icon="bar-chart-2" accent="green" badge="Avg" />
          </View>
        </ScrollView>
      </EnterpriseHeader>

      <View className="px-5 pt-3">
        <View className="flex-row items-center rounded-2xl border border-slate-200 bg-white px-3">
          <Feather name="search" size={18} color="#94a3b8" />
          <TextInput
            className="flex-1 py-2.5 pl-2 text-base text-slate-800"
            placeholder="Search PO number, vendor, product…"
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
                Purchase Order Filters
              </Text>
            </View>
            <Segmented
              label="Status"
              options={STATUS_FILTER_OPTIONS}
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
        <LoadingState label="Loading purchase orders…" />
      ) : error ? (
        <MessageState
          icon="wifi-off"
          tone="error"
          title="Failed to fetch purchase orders"
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
            <PurchaseOrderCard
              po={item}
              onPress={() =>
                router.push({ pathname: '/purchase-order/[id]', params: { id: item._id } })
              }
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <MessageState
              icon={filtersActive ? 'search' : 'shopping-cart'}
              title={filtersActive ? 'No purchase orders match' : 'No purchase orders yet'}
              message={
                filtersActive
                  ? 'Try adjusting or clearing your filters.'
                  : 'Tap + to add your first purchase order.'
              }
            />
          }
          ListFooterComponent={hasMore ? <ActivityIndicator className="py-4" color="#4f46e5" /> : null}
        />
      )}

      <Pressable
        onPress={() => router.push('/purchase-order/new')}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-indigo-600 shadow-lg active:opacity-90"
      >
        <Feather name="plus" size={26} color="#ffffff" />
      </Pressable>
    </SafeAreaView>
  );
}
