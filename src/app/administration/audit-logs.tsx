import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
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

import AuditLogCard from '@/components/ui/AuditLogCard';
import EnterpriseHeader, { HeaderAction } from '@/components/ui/EnterpriseHeader';
import KpiCard from '@/components/ui/KpiCard';
import Segmented from '@/components/ui/Segmented';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  auditActions,
  auditMetrics,
  fetchAuditLogs,
  filterAuditLogs,
  type AuditFilters,
  type AuditLog,
} from '@/services/audit';

const PAGE_SIZE = 12;

export default function AuditLogsScreen() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const [search, setSearch] = useState('');
  const [action, setAction] = useState<AuditFilters['action']>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      setError(false);
      setLogs(await fetchAuditLogs());
    } catch {
      setError(true);
      setLogs([]);
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

  /* ===== Action options built from the data (web uniqueActions) ===== */
  const actionOptions = useMemo(() => auditActions(logs), [logs]);

  const filtered = useMemo(
    () => filterAuditLogs(logs, { search, action }),
    [logs, search, action]
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
  const metrics = useMemo(() => auditMetrics(logs), [logs]);

  const filtersActive = search !== '' || action !== 'ALL';

  const clearFilters = () => {
    setSearch('');
    setAction('ALL');
    resetPage();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        icon="shield"
        title="Audit Logs"
        badge="Security Center"
        subtitle="User activity, authentication and compliance records"
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
              title="Total Events"
              value={metrics.total}
              icon="activity"
              accent="indigo"
              badge="All"
            />
          </View>
          <View style={{ width: 150 }}>
            <KpiCard
              title="Active Users"
              value={metrics.users}
              icon="users"
              accent="green"
              badge="Unique"
            />
          </View>
          <View style={{ width: 150 }}>
            <KpiCard
              title="Security Actions"
              value={metrics.security}
              icon="shield"
              accent="indigo"
              badge="Auth"
            />
          </View>
          <View style={{ width: 150 }}>
            <KpiCard
              title="Critical Changes"
              value={metrics.critical}
              icon="alert-triangle"
              accent="amber"
              badge="High"
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
            placeholder="Search by user, email or activity…"
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
                Audit Filters
              </Text>
            </View>
            <Segmented
              label="Action"
              options={actionOptions}
              value={action}
              onChange={(v) => {
                setAction(v);
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
              : `Showing ${visible.length} of ${filtered.length} audit events`}
          </Text>
          <View className="flex-row items-center gap-1.5">
            <View className="h-2 w-2 rounded-full bg-emerald-500" />
            <Text className="text-xs font-medium text-indigo-600">
              Live Monitoring
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <LoadingState label="Loading security logs…" />
      ) : error ? (
        <MessageState
          icon="wifi-off"
          tone="error"
          title="Failed to load audit logs"
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
            paddingBottom: 40,
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          renderItem={({ item }) => <AuditLogCard log={item} />}
          ListEmptyComponent={
            <MessageState
              icon={filtersActive ? 'search' : 'shield-off'}
              title="No Audit Records"
              message={
                filtersActive
                  ? 'No matching activity logs found.'
                  : 'User actions and security events will appear here.'
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
    </SafeAreaView>
  );
}
