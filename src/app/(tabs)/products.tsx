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
import ProductCard from '@/components/ui/ProductCard';
import Segmented from '@/components/ui/Segmented';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  fetchProducts,
  filterProducts,
  productStats,
  type Product,
  type ProductFilters,
} from '@/services/products';

const PAGE_SIZE = 10;
const STOCK_OPTIONS = ['All', 'In Stock', 'Low Stock', 'Out of Stock'] as const;
const STATUS_OPTIONS = ['All', 'Active', 'Inactive'] as const;

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ProductFilters['category']>('All');
  const [status, setStatus] = useState<ProductFilters['status']>('All');
  const [stock, setStock] = useState<ProductFilters['stock']>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      setError(false);
      setProducts(await fetchProducts());
    } catch {
      setError(true);
      setProducts([]);
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    load();
  }, [load]);

  const resetPage = () => setPage(1);

  const categoryOptions = useMemo(
    () =>
      ['All', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))] as string[],
    [products]
  );

  const filtered = useMemo(
    () => filterProducts(products, { search, category, status, stock }),
    [products, search, category, status, stock]
  );

  const visible = useMemo(
    () => filtered.slice(0, page * PAGE_SIZE),
    [filtered, page]
  );
  const hasMore = visible.length < filtered.length;
  const loadMore = useCallback(() => {
    if (hasMore) setPage((p) => p + 1);
  }, [hasMore]);

  const stats = useMemo(() => productStats(products), [products]);

  const filtersActive =
    search !== '' || category !== 'All' || status !== 'All' || stock !== 'All';

  const clearFilters = () => {
    setSearch('');
    setCategory('All');
    setStatus('All');
    setStock('All');
    resetPage();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        icon="package"
        title="CRM Products"
        badge="ReadyTech Solutions"
        subtitle="Catalog, pricing & inventory visibility"
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
            <KpiCard title="Total Products" value={stats.total} icon="package" accent="indigo" badge="Catalog" />
          </View>
          <View style={{ width: 150 }}>
            <KpiCard title="Active" value={stats.active} icon="layers" accent="green" badge="Available" />
          </View>
          <View style={{ width: 150 }}>
            <KpiCard title="Low Stock" value={stats.lowStock} icon="alert-triangle" accent="amber" badge="Alert" />
          </View>
          <View style={{ width: 170 }}>
            <KpiCard
              title="Inventory Value"
              value={`₹${stats.inventoryValue.toLocaleString()}`}
              icon="dollar-sign"
              accent="indigo"
              badge="Value"
            />
          </View>
        </ScrollView>
      </EnterpriseHeader>

      <View className="px-5 pt-3">
        {/* Search */}
        <View className="flex-row items-center rounded-2xl border border-slate-200 bg-white px-3">
          <Feather name="search" size={18} color="#94a3b8" />
          <TextInput
            className="flex-1 py-2.5 pl-2 text-base text-slate-800"
            placeholder="Search by name, SKU or category…"
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
                Product Filters
              </Text>
            </View>
            <Segmented
              label="Category"
              options={categoryOptions}
              value={category}
              onChange={(v) => {
                setCategory(v);
                resetPage();
              }}
              scroll
            />
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
              label="Stock"
              options={STOCK_OPTIONS}
              value={stock}
              onChange={(v) => {
                setStock(v as ProductFilters['stock']);
                resetPage();
              }}
              scroll
            />
            {filtersActive && (
              <Pressable
                onPress={clearFilters}
                className="mt-1 flex-row items-center gap-1.5 self-start rounded-lg bg-red-50 px-3 py-2"
              >
                <Feather name="x" size={14} color="#dc2626" />
                <Text className="text-sm font-medium text-red-600">
                  Clear all filters
                </Text>
              </Pressable>
            )}
          </View>
        )}

        <View className="mt-3 flex-row items-center justify-between">
          <Text className="text-xs text-slate-500">
            {loading
              ? 'Loading…'
              : `Showing ${visible.length} of ${filtered.length} products`}
          </Text>
          <View className="flex-row items-center gap-1.5">
            <View className="h-2 w-2 rounded-full bg-emerald-500" />
            <Text className="text-xs font-medium text-indigo-600">
              Live Search
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <LoadingState label="Loading products…" />
      ) : error ? (
        <MessageState
          icon="wifi-off"
          tone="error"
          title="Couldn't load products"
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
            <ProductCard
              product={item}
              onPress={() =>
                router.push({
                  pathname: '/product/[id]',
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
              icon={filtersActive ? 'search' : 'package'}
              title={filtersActive ? 'No products match your filters' : 'No products found'}
              message={
                filtersActive
                  ? 'Try adjusting or clearing your filters.'
                  : 'Tap + to add your first product.'
              }
              actionLabel={filtersActive ? 'Clear filters' : undefined}
              onAction={filtersActive ? clearFilters : undefined}
            />
          }
          ListFooterComponent={
            hasMore ? (
              <ActivityIndicator className="py-4" color="#4f46e5" />
            ) : null
          }
        />
      )}

      {/* Floating Add button */}
      <Pressable
        onPress={() => router.push('/product/new')}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-indigo-600 shadow-lg active:opacity-90"
      >
        <Feather name="plus" size={26} color="#ffffff" />
      </Pressable>
    </SafeAreaView>
  );
}
