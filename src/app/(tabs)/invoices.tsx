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
import InvoiceCard from '@/components/ui/InvoiceCard';
import KpiCard from '@/components/ui/KpiCard';
import Segmented from '@/components/ui/Segmented';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  calculateTotals,
  fetchInvoices,
  money,
  type ComputedStatus,
  type Invoice,
} from '@/services/invoices';

const PAGE_SIZE = 10;
const STATUS_OPTIONS = ['All', 'Paid', 'Pending', 'Overdue'] as const;

function customerName(invoice: Invoice): string {
  return (
    invoice?.customer?.companyName ||
    invoice?.customer?.contactPerson ||
    invoice?.customerName ||
    'N/A'
  );
}

export default function InvoicesScreen() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_OPTIONS)[number]>('All');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      setError(false);
      setInvoices(await fetchInvoices());
    } catch {
      setError(true);
      setInvoices([]);
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

  /* ===== Enriched + filtered (matches web) ===== */
  const enriched = useMemo(
    () =>
      invoices.map((invoice) => ({
        invoice,
        ...calculateTotals(invoice),
        name: customerName(invoice),
      })),
    [invoices]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((e) => {
      const matchesSearch =
        !q ||
        `${e.invoice?.invoiceNumber || ''} ${e.name}`.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === 'All' || e.computedStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [enriched, search, statusFilter]);

  const visible = useMemo(
    () => filtered.slice(0, page * PAGE_SIZE),
    [filtered, page]
  );
  const hasMore = visible.length < filtered.length;
  const loadMore = useCallback(() => {
    if (hasMore) setPage((p) => p + 1);
  }, [hasMore]);

  /* ===== Summary cards (identical reduce to web) ===== */
  const summary = useMemo(
    () =>
      enriched.reduce(
        (a, e) => {
          a.total += 1;
          a.billed += e.grandTotal;
          a.outstanding += e.balance;
          if (e.computedStatus === ('Paid' as ComputedStatus)) a.paid += 1;
          return a;
        },
        { total: 0, billed: 0, outstanding: 0, paid: 0 }
      ),
    [enriched]
  );

  const filtersActive = search !== '' || statusFilter !== 'All';

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        icon="file-text"
        title="Invoice Management"
        badge="ReadyTech Solutions"
        subtitle="Manage, track and download invoices"
        right={
          <HeaderAction
            icon="refresh-cw"
            onPress={onRefresh}
            color={refreshing ? '#a5b4fc' : '#ffffff'}
          />
        }
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingTop: 16, paddingRight: 4 }}
        >
          <View style={{ width: 150 }}>
            <KpiCard title="Total Invoices" value={summary.total} icon="file-text" accent="indigo" badge="All" />
          </View>
          <View style={{ width: 175 }}>
            <KpiCard title="Total Billed" value={money(summary.billed)} icon="trending-up" accent="indigo" badge="Billed" />
          </View>
          <View style={{ width: 175 }}>
            <KpiCard title="Outstanding" value={money(summary.outstanding)} icon="credit-card" accent="amber" badge="Due" />
          </View>
          <View style={{ width: 150 }}>
            <KpiCard title="Paid" value={summary.paid} icon="check-circle" accent="green" badge="Cleared" />
          </View>
        </ScrollView>
      </EnterpriseHeader>

      <View className="px-5 pt-3">
        {/* Search */}
        <View className="flex-row items-center rounded-2xl border border-slate-200 bg-white px-3">
          <Feather name="search" size={18} color="#94a3b8" />
          <TextInput
            className="flex-1 py-2.5 pl-2 text-base text-slate-800"
            placeholder="Search by invoice number or customer…"
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

        {/* Status filter */}
        <View className="mt-3">
          <Segmented
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              resetPage();
            }}
            scroll
          />
        </View>

        <View className="mt-1 flex-row items-center justify-between">
          <Text className="text-xs text-slate-500">
            {loading
              ? 'Loading…'
              : `Showing ${visible.length} of ${filtered.length} invoices`}
          </Text>
          {filtersActive && (
            <Pressable
              hitSlop={8}
              onPress={() => {
                setSearch('');
                setStatusFilter('All');
                resetPage();
              }}
              className="flex-row items-center gap-1"
            >
              <Feather name="x" size={13} color="#dc2626" />
              <Text className="text-xs font-medium text-red-600">Clear</Text>
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <LoadingState label="Loading invoices…" />
      ) : error ? (
        <MessageState
          icon="wifi-off"
          tone="error"
          title="Failed to fetch invoices"
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
          keyExtractor={(item) => item.invoice._id}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 96,
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <InvoiceCard
              invoice={item.invoice}
              onPress={() =>
                router.push({
                  pathname: '/invoice/[id]',
                  params: { id: item.invoice._id },
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
              icon="file-text"
              title={filtersActive ? 'No invoices match your filters' : 'No invoices found'}
              message={
                filtersActive
                  ? 'Try adjusting or clearing your filters.'
                  : 'Create your first invoice to get started.'
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

      {/* Floating Create button */}
      <Pressable
        onPress={() => router.push('/invoice/create')}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-indigo-600 shadow-lg active:opacity-90"
      >
        <Feather name="plus" size={26} color="#ffffff" />
      </Pressable>
    </SafeAreaView>
  );
}
