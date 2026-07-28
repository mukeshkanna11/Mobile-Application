import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import EnterpriseHeader, { HeaderAction } from '@/components/ui/EnterpriseHeader';
import InventoryCard from '@/components/ui/InventoryCard';
import KpiCard from '@/components/ui/KpiCard';
import Segmented from '@/components/ui/Segmented';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  exportInventory,
  fetchInventory,
  filterInventory,
  formatMoney,
  inventoryStats,
  STATUS_FILTER_OPTIONS,
  stockIn,
  stockOut,
  warehouseOptions,
  type InventoryFilters,
  type StockRow,
} from '@/services/inventory';

const PAGE_SIZE = 10;

const rowKey = (s: StockRow) =>
  s._id || `${s.product?._id ?? '?'}-${s.warehouse?._id ?? '?'}`;

export default function InventoryScreen() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [warehouse, setWarehouse] = useState<InventoryFilters['warehouse']>('All');
  const [status, setStatus] = useState<InventoryFilters['status']>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async (opts: { refreshing?: boolean } = {}) => {
    if (!opts.refreshing) setLoading(true);
    setError(false);
    try {
      setRows(await fetchInventory());
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

  const warehouses = useMemo(() => warehouseOptions(rows), [rows]);
  const stats = useMemo(() => inventoryStats(rows), [rows]);

  const filtered = useMemo(
    () => filterInventory(rows, { search, warehouse, status }),
    [rows, search, warehouse, status]
  );
  const visible = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);
  const hasMore = visible.length < filtered.length;
  const loadMore = useCallback(() => {
    if (hasMore) setPage((p) => p + 1);
  }, [hasMore]);

  const filtersActive = search !== '' || warehouse !== 'All' || status !== 'All';

  /* ================= Stock-in / Stock-out (qty = 1, matches web) ================= */
  const move = async (row: StockRow, dir: 'in' | 'out') => {
    const product = row.product?._id;
    const wh = row.warehouse?._id;
    if (!product || !wh) return;
    setBusyKey(rowKey(row));
    try {
      const payload = { product, warehouse: wh, quantity: 1 };
      if (dir === 'in') await stockIn(payload);
      else await stockOut(payload);
      Toast.show({
        type: 'success',
        text1: dir === 'in' ? 'Stock increased by 1' : 'Stock reduced by 1',
      });
      await load({ refreshing: true });
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: dir === 'in' ? 'Stock-in failed' : 'Stock-out failed',
        text2: err?.response?.data?.message,
      });
    } finally {
      setBusyKey(null);
    }
  };

  const onExport = () => {
    Alert.alert('Export Inventory', 'Choose a format', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'CSV', onPress: () => runExport('csv') },
      { text: 'PDF', onPress: () => runExport('pdf') },
    ]);
  };
  const runExport = async (format: 'csv' | 'pdf') => {
    try {
      await exportInventory(format);
    } catch {
      Toast.show({ type: 'error', text1: 'Export failed' });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        icon="package"
        title="Inventory"
        badge="ERP"
        subtitle="Stock across warehouses"
        right={
          <>
            <HeaderAction icon="download" onPress={onExport} />
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
            <KpiCard title="Products" value={stats.totalProducts} icon="box" accent="indigo" badge="SKUs" />
          </View>
          <View style={{ width: 150 }}>
            <KpiCard title="Total Qty" value={stats.totalStockQty} icon="layers" accent="indigo" badge="On Hand" />
          </View>
          <View style={{ width: 150 }}>
            <KpiCard title="Low Stock" value={stats.lowStock} icon="alert-triangle" accent="amber" badge="Alert" />
          </View>
          <View style={{ width: 150 }}>
            <KpiCard title="Out of Stock" value={stats.outOfStock} icon="x-circle" accent="amber" badge="Empty" />
          </View>
          <View style={{ width: 150 }}>
            <KpiCard title="Warehouses" value={stats.warehouses} icon="home" accent="green" badge="Sites" />
          </View>
          <View style={{ width: 175 }}>
            <KpiCard title="Inventory Value" value={formatMoney(stats.inventoryValue)} icon="dollar-sign" accent="green" badge="Value" />
          </View>
        </ScrollView>
      </EnterpriseHeader>

      <View className="px-5 pt-3">
        {/* Search */}
        <View className="flex-row items-center rounded-2xl border border-slate-200 bg-white px-3">
          <Feather name="search" size={18} color="#94a3b8" />
          <TextInput
            className="flex-1 py-2.5 pl-2 text-base text-slate-800"
            placeholder="Search product, SKU or warehouse…"
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

        {/* Collapsible filters */}
        {showFilters && (
          <View className="mt-3 rounded-2xl border border-slate-100 bg-white p-4">
            <View className="mb-2 flex-row items-center gap-2">
              <Feather name="filter" size={14} color="#4f46e5" />
              <Text className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                Inventory Filters
              </Text>
            </View>
            <Segmented
              label="Warehouse"
              options={warehouses}
              value={warehouse}
              onChange={(v) => { setWarehouse(v); resetPage(); }}
              scroll
            />
            <Segmented
              label="Status"
              options={STATUS_FILTER_OPTIONS}
              value={status}
              onChange={(v) => { setStatus(v); resetPage(); }}
              scroll
            />
            {filtersActive && (
              <Pressable
                onPress={() => { setSearch(''); setWarehouse('All'); setStatus('All'); resetPage(); }}
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
        <LoadingState label="Loading inventory…" />
      ) : error ? (
        <MessageState
          icon="wifi-off"
          tone="error"
          title="Failed to load inventory data"
          message="Check your connection and try again."
          actionLabel="Retry"
          onAction={() => load()}
        />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={rowKey}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <InventoryCard
              row={item}
              busy={busyKey === rowKey(item)}
              onStockIn={() => move(item, 'in')}
              onStockOut={() => move(item, 'out')}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <MessageState
              icon={filtersActive ? 'search' : 'package'}
              title={filtersActive ? 'No stock matches your filters' : 'No inventory found'}
              message={
                filtersActive
                  ? 'Try adjusting or clearing your filters.'
                  : 'Stock records will appear here once available.'
              }
            />
          }
          ListFooterComponent={hasMore ? <ActivityIndicator className="py-4" color="#4f46e5" /> : null}
        />
      )}
    </SafeAreaView>
  );
}
