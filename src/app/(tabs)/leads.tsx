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
import Toast from 'react-native-toast-message';

import EnterpriseHeader, { HeaderAction } from '@/components/ui/EnterpriseHeader';
import KpiCard from '@/components/ui/KpiCard';
import LeadCard from '@/components/ui/LeadCard';
import Segmented from '@/components/ui/Segmented';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  fetchLeads,
  filterLeads,
  updateLead,
  type Lead,
  type LeadFilters,
} from '@/services/leads';

const PAGE_SIZE = 8;

export default function LeadsScreen() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<LeadFilters['status']>('All');
  const [source, setSource] = useState<LeadFilters['source']>('All');
  const [priority, setPriority] = useState<LeadFilters['priority']>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      setError(false);
      const data = await fetchLeads();
      setLeads(data);
    } catch {
      setError(true);
      setLeads([]);
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

  /* ===== Inline optimistic status update (matches web updateLeadStatus) ===== */
  const changeStatus = useCallback(
    async (lead: Lead, next: string) => {
      if (lead.status === next) return;
      setLeads((prev) =>
        prev.map((l) => (l._id === lead._id ? { ...l, status: next } : l))
      );
      try {
        await updateLead(lead._id, { ...lead, status: next });
        Toast.show({ type: 'success', text1: `Moved to ${next}` });
      } catch {
        Toast.show({ type: 'error', text1: 'Status update failed' });
        load(); // revert to server truth
      }
    },
    [load]
  );

  /* ===== Dynamic source options (["All", ...unique sources]) ===== */
  const sourceOptions = useMemo(
    () => ['All', ...Array.from(new Set(leads.map((l) => l.source).filter(Boolean)))] as string[],
    [leads]
  );

  const filtered = useMemo(
    () => filterLeads(leads, { search, status, source, priority }),
    [leads, search, status, source, priority]
  );

  const visible = useMemo(
    () => filtered.slice(0, page * PAGE_SIZE),
    [filtered, page]
  );
  const hasMore = visible.length < filtered.length;
  const loadMore = useCallback(() => {
    if (hasMore) setPage((p) => p + 1);
  }, [hasMore]);

  /* ===== KPIs (identical formulas to web) ===== */
  const stats = useMemo(() => {
    const total = leads.length;
    const newLeads = leads.filter((l) => l.status === 'New').length;
    const qualified = leads.filter((l) => l.status === 'Qualified').length;
    const conversion = total ? Math.round((qualified / total) * 100) : 0;
    return { total, newLeads, qualified, conversion };
  }, [leads]);

  const filtersActive =
    search !== '' || status !== 'All' || source !== 'All' || priority !== 'All';

  const clearFilters = () => {
    setSearch('');
    setStatus('All');
    setSource('All');
    setPriority('All');
    resetPage();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* Enterprise gradient header + KPIs */}
      <EnterpriseHeader
        icon="users"
        title="Lead Management"
        badge="ReadyTech Solutions"
        subtitle="Track prospects from inquiry to close"
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
            <KpiCard
              title="Total Leads"
              value={stats.total}
              icon="users"
              accent="indigo"
              badge="CRM"
            />
          </View>
          <View style={{ width: 150 }}>
            <KpiCard
              title="New Leads"
              value={stats.newLeads}
              icon="trending-up"
              accent="indigo"
              badge="New"
            />
          </View>
          <View style={{ width: 150 }}>
            <KpiCard
              title="Qualified"
              value={stats.qualified}
              icon="check-circle"
              accent="green"
              badge="Ready"
            />
          </View>
          <View style={{ width: 150 }}>
            <KpiCard
              title="Conversion"
              value={`${stats.conversion}%`}
              icon="target"
              accent="amber"
              badge="Rate"
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
            placeholder="Search name, email, phone, company…"
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
                Lead Filters
              </Text>
            </View>
            <Segmented
              label="Status"
              options={['All', 'New', 'Contacted', 'Qualified', 'Closed']}
              value={status}
              onChange={(v) => {
                setStatus(v);
                resetPage();
              }}
              scroll
            />
            <Segmented
              label="Priority"
              options={['All', 'High', 'Medium', 'Low']}
              value={priority}
              onChange={(v) => {
                setPriority(v as LeadFilters['priority']);
                resetPage();
              }}
            />
            <Segmented
              label="Source"
              options={sourceOptions}
              value={source}
              onChange={(v) => {
                setSource(v);
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
              : `Showing ${visible.length} of ${filtered.length} leads`}
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
        <LoadingState label="Loading leads…" />
      ) : error ? (
        <MessageState
          icon="wifi-off"
          tone="error"
          title="Couldn't load leads"
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
            <LeadCard
              lead={item}
              onPress={() =>
                router.push({ pathname: '/lead/[id]', params: { id: item._id } })
              }
              onChangeStatus={(s) => changeStatus(item, s)}
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
              title={filtersActive ? 'No leads match your filters' : 'No leads yet'}
              message={
                filtersActive
                  ? 'Try adjusting or clearing your filters.'
                  : 'Tap + to add your first lead.'
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
        onPress={() => router.push('/lead/new')}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-indigo-600 shadow-lg active:opacity-90"
      >
        <Feather name="plus" size={26} color="#ffffff" />
      </Pressable>
    </SafeAreaView>
  );
}
