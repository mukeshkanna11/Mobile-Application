import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import OpportunityCard from '@/components/ui/OpportunityCard';
import Segmented from '@/components/ui/Segmented';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  fetchOpportunities,
  fetchOpportunityStats,
  FILTER_STAGES,
  formatMoney,
  type Opportunity,
  type OpportunityStats,
} from '@/services/opportunities';

const LIMIT = 10;
const STAGE_OPTIONS = ['All', ...FILTER_STAGES] as const;

export default function OpportunitiesScreen() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [stats, setStats] = useState<OpportunityStats | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [search, setSearch] = useState('');
  const [stage, setStage] = useState<(typeof STAGE_OPTIONS)[number]>('All');

  const didInit = useRef(false);

  const query = useCallback(
    (p: number) => ({
      page: p,
      limit: LIMIT,
      search: search.trim() || undefined,
      stage: stage === 'All' ? undefined : stage,
    }),
    [search, stage]
  );

  const loadFirst = useCallback(
    async (opts: { refreshing?: boolean } = {}) => {
      if (!opts.refreshing) setLoading(true);
      setError(false);
      try {
        const [res, s] = await Promise.all([
          fetchOpportunities(query(1)),
          fetchOpportunityStats().catch(() => null),
        ]);
        setItems(res.data);
        setPage(res.pagination.page);
        setTotalPages(res.pagination.totalPages);
        if (s) setStats(s);
      } catch {
        setError(true);
        setItems([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [query]
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    try {
      const res = await fetchOpportunities(query(page + 1));
      setItems((prev) => [...prev, ...res.data]);
      setPage(res.pagination.page);
      setTotalPages(res.pagination.totalPages);
    } catch {
      /* keep existing items on pagination error */
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, page, totalPages, query]);

  // Debounced reload on search / stage change (and initial mount).
  useEffect(() => {
    const t = setTimeout(() => loadFirst(), didInit.current ? 350 : 0);
    didInit.current = true;
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, stage]);

  // Refresh when returning from create/edit/details (skip first focus).
  const focusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedOnce.current) loadFirst({ refreshing: true });
      else focusedOnce.current = true;
    }, [loadFirst])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadFirst({ refreshing: true });
  };

  const filtersActive = search !== '' || stage !== 'All';

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        icon="briefcase"
        title="Opportunities"
        badge="Salesforce"
        subtitle="Track deals and forecast revenue"
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
            <KpiCard title="Total" value={stats?.total ?? 0} icon="briefcase" accent="indigo" badge="Pipeline" />
          </View>
          <View style={{ width: 175 }}>
            <KpiCard title="Won Revenue" value={formatMoney(stats?.revenue)} icon="trending-up" accent="green" badge="Closed" />
          </View>
          <View style={{ width: 150 }}>
            <KpiCard title="Closed Won" value={stats?.won ?? 0} icon="check-circle" accent="green" badge="Won" />
          </View>
          <View style={{ width: 150 }}>
            <KpiCard
              title="Win Rate"
              value={`${stats && stats.total ? Math.round((stats.won / stats.total) * 100) : 0}%`}
              icon="target"
              accent="amber"
              badge="Rate"
            />
          </View>
        </ScrollView>
      </EnterpriseHeader>

      <View className="px-5 pt-3">
        <View className="flex-row items-center rounded-2xl border border-slate-200 bg-white px-3">
          <Feather name="search" size={18} color="#94a3b8" />
          <TextInput
            className="flex-1 py-2.5 pl-2 text-base text-slate-800"
            placeholder="Search opportunities…"
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
          <Segmented options={STAGE_OPTIONS} value={stage} onChange={setStage} scroll />
        </View>

        <Text className="mt-2 text-xs text-slate-500">
          {loading
            ? 'Loading…'
            : `${items.length}${totalPages > 1 ? '+' : ''} of ${stats?.total ?? items.length} opportunities`}
        </Text>
      </View>

      {loading ? (
        <LoadingState label="Loading opportunities…" />
      ) : error ? (
        <MessageState
          icon="wifi-off"
          tone="error"
          title="Failed to fetch opportunities"
          message="Check your connection and try again."
          actionLabel="Retry"
          onAction={() => loadFirst()}
        />
      ) : (
        <FlatList
          data={items}
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
            <OpportunityCard
              opportunity={item}
              onPress={() =>
                router.push({
                  pathname: '/opportunity/[id]',
                  params: { id: item._id },
                })
              }
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <MessageState
              icon={filtersActive ? 'search' : 'briefcase'}
              title={filtersActive ? 'No opportunities match' : 'No opportunities yet'}
              message={
                filtersActive
                  ? 'Try adjusting your search or stage filter.'
                  : 'Tap + to add your first opportunity.'
              }
            />
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator className="py-4" color="#4f46e5" /> : null
          }
        />
      )}

      <Pressable
        onPress={() => router.push('/opportunity/new')}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-indigo-600 shadow-lg active:opacity-90"
      >
        <Feather name="plus" size={26} color="#ffffff" />
      </Pressable>
    </SafeAreaView>
  );
}
