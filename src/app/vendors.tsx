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
import VendorCard from '@/components/ui/VendorCard';
import {
  fetchVendors,
  filterVendors,
  STATUS_FILTER_OPTIONS,
  vendorStats,
  type Vendor,
  type VendorFilters,
} from '@/services/vendors';

const PAGE_SIZE = 10;

export default function VendorsScreen() {
  const [rows, setRows] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<VendorFilters['status']>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const load = useCallback(async (opts: { refreshing?: boolean } = {}) => {
    if (!opts.refreshing) setLoading(true);
    setError(false);
    try {
      setRows(await fetchVendors());
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

  const stats = useMemo(() => vendorStats(rows), [rows]);
  const filtered = useMemo(
    () => filterVendors(rows, { search, status }),
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
        icon="truck"
        title="Vendors"
        badge="ERP"
        subtitle="Suppliers & purchasing partners"
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
            <KpiCard title="Total Vendors" value={stats.total} icon="truck" accent="indigo" badge="All" />
          </View>
          <View style={{ width: 150 }}>
            <KpiCard title="Active" value={stats.active} icon="check-circle" accent="green" badge="Live" />
          </View>
          <View style={{ width: 150 }}>
            <KpiCard title="Pending Setup" value={stats.pending} icon="alert-circle" accent="amber" badge="Setup" />
          </View>
          <View style={{ width: 150 }}>
            <KpiCard title="With Email" value={stats.withEmail} icon="mail" accent="indigo" badge="Reach" />
          </View>
        </ScrollView>
      </EnterpriseHeader>

      <View className="px-5 pt-3">
        <View className="flex-row items-center rounded-2xl border border-slate-200 bg-white px-3">
          <Feather name="search" size={18} color="#94a3b8" />
          <TextInput
            className="flex-1 py-2.5 pl-2 text-base text-slate-800"
            placeholder="Search name, email, phone, address…"
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
                Vendor Filters
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
        <LoadingState label="Loading vendors…" />
      ) : error ? (
        <MessageState
          icon="wifi-off"
          tone="error"
          title="Failed to fetch vendors"
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
            <VendorCard
              vendor={item}
              onPress={() =>
                router.push({ pathname: '/vendor/[id]', params: { id: item._id } })
              }
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <MessageState
              icon={filtersActive ? 'search' : 'truck'}
              title={filtersActive ? 'No vendors match' : 'No vendors yet'}
              message={
                filtersActive
                  ? 'Try adjusting or clearing your filters.'
                  : 'Tap + to add your first vendor.'
              }
            />
          }
          ListFooterComponent={hasMore ? <ActivityIndicator className="py-4" color="#4f46e5" /> : null}
        />
      )}

      <Pressable
        onPress={() => router.push('/vendor/new')}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-indigo-600 shadow-lg active:opacity-90"
      >
        <Feather name="plus" size={26} color="#ffffff" />
      </Pressable>
    </SafeAreaView>
  );
}
