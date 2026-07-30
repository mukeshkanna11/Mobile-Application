import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ActivityRow from '@/components/ui/ActivityRow';
import EnterpriseHeader, { HeaderAction } from '@/components/ui/EnterpriseHeader';
import KpiCard from '@/components/ui/KpiCard';
import Segmented from '@/components/ui/Segmented';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import type { Activity } from '@/services/dashboard';
import { fetchActivities } from '@/services/salesforce';

const STATUS_FILTERS = ['All', 'Pending', 'Completed'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

/**
 * Salesforce → Activities. Read-only feed over the existing `GET /activities`
 * endpoint, reusing the shared ActivityRow from the Dashboard module. No
 * create/edit/delete here — activity CRUD is not part of this module.
 */
export default function SalesforceActivitiesScreen() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('All');
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      setActivities(await fetchActivities(100));
    } catch {
      setError(true);
      setActivities([]);
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
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activities.filter((a) => {
      const textMatch = q
        ? `${a.type ?? ''} ${a.notes ?? ''} ${a.assignedTo?.name ?? ''}`
            .toLowerCase()
            .includes(q)
        : true;
      const statusMatch =
        status === 'All'
          ? true
          : status === 'Completed'
            ? a.done === true
            : a.done !== true;
      return textMatch && statusMatch;
    });
  }, [activities, search, status]);

  const stats = useMemo(() => {
    const total = activities.length;
    const completed = activities.filter((a) => a.done === true).length;
    return { total, completed, pending: total - completed };
  }, [activities]);

  const filtersActive = search !== '' || status !== 'All';

  const clearFilters = () => {
    setSearch('');
    setStatus('All');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        title="Activities"
        badge="Enterprise CRM"
        subtitle="Calls, emails and meetings across your CRM"
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
        <View className="mt-4 flex-row" style={{ gap: 12 }}>
          <View className="flex-1">
            <KpiCard
              title="Total"
              value={stats.total}
              icon="activity"
              accent="indigo"
              badge="All"
            />
          </View>
          <View className="flex-1">
            <KpiCard
              title="Pending"
              value={stats.pending}
              icon="clock"
              accent="amber"
              badge="Open"
            />
          </View>
          <View className="flex-1">
            <KpiCard
              title="Completed"
              value={stats.completed}
              icon="check-circle"
              accent="green"
              badge="Done"
            />
          </View>
        </View>
      </EnterpriseHeader>

      <View className="px-5 pt-3">
        <View className="flex-row items-center rounded-2xl border border-slate-200 bg-white px-3">
          <Feather name="search" size={18} color="#94a3b8" />
          <TextInput
            className="flex-1 py-2.5 pl-2 text-base text-slate-800"
            placeholder="Search activities…"
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

        {showFilters && (
          <View className="mt-3 rounded-2xl border border-slate-100 bg-white p-4">
            <View className="mb-2 flex-row items-center gap-2">
              <Feather name="filter" size={14} color="#4f46e5" />
              <Text className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                Activity Filters
              </Text>
            </View>
            <Segmented
              label="Status"
              options={STATUS_FILTERS}
              value={status}
              onChange={setStatus}
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

        <Text className="mt-3 text-xs text-slate-500">
          {loading
            ? 'Loading…'
            : `Showing ${filtered.length} of ${activities.length} activities`}
        </Text>
      </View>

      {loading ? (
        <LoadingState label="Loading activities…" />
      ) : error ? (
        <MessageState
          icon="wifi-off"
          tone="error"
          title="Couldn't load activities"
          message="Check your connection and try again."
          actionLabel="Retry"
          onAction={() => {
            setLoading(true);
            load();
          }}
        />
      ) : (
        <FlatList
          data={filtered}
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
          renderItem={({ item, index }) => (
            <View
              className={`rounded-2xl bg-white ${
                index === 0 ? 'mt-0' : 'mt-2'
              } border border-slate-100`}
            >
              <ActivityRow activity={item} />
            </View>
          )}
          ListEmptyComponent={
            <MessageState
              icon={filtersActive ? 'search' : 'activity'}
              title={
                filtersActive
                  ? 'No activities match your filters'
                  : 'No activities yet'
              }
              message={
                filtersActive
                  ? 'Try adjusting or clearing your filters.'
                  : 'Calls, emails and meetings will appear here.'
              }
              actionLabel={filtersActive ? 'Clear filters' : undefined}
              onAction={filtersActive ? clearFilters : undefined}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
