import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
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
import KpiCard from '@/components/ui/KpiCard';
import Segmented from '@/components/ui/Segmented';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import UserCard from '@/components/ui/UserCard';
import {
  deleteUser,
  fetchUsers,
  filterUsers,
  USER_ROLES,
  userMetrics,
  type User,
  type UserFilters,
} from '@/services/users';

const PAGE_SIZE = 8;

const ROLE_FILTERS = ['All', ...USER_ROLES] as const;
const STATUS_FILTERS = ['All', 'Active', 'Inactive'] as const;

export default function UsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [role, setRole] = useState<UserFilters['role']>('All');
  const [status, setStatus] = useState<UserFilters['status']>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      setError(false);
      const data = await fetchUsers();
      setUsers(data);
    } catch {
      setError(true);
      setUsers([]);
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

  /* ===== Delete (web removeUser + window.confirm) ===== */
  const removeUser = useCallback(
    (user: User) => {
      Alert.alert('Remove this user?', `Remove “${user.name}” permanently?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUser(user._id);
              Toast.show({ type: 'success', text1: 'User removed' });
              load();
            } catch {
              Toast.show({ type: 'error', text1: 'Delete failed' });
            }
          },
        },
      ]);
    },
    [load]
  );

  const filtered = useMemo(
    () => filterUsers(users, { search, role, status }),
    [users, search, role, status]
  );

  const visible = useMemo(
    () => filtered.slice(0, page * PAGE_SIZE),
    [filtered, page]
  );
  const hasMore = visible.length < filtered.length;
  const loadMore = useCallback(() => {
    if (hasMore) setPage((p) => p + 1);
  }, [hasMore]);

  /* ===== Metrics (identical formulas to web) ===== */
  const metrics = useMemo(() => userMetrics(users), [users]);

  const filtersActive = search !== '' || role !== 'All' || status !== 'All';

  const clearFilters = () => {
    setSearch('');
    setRole('All');
    setStatus('All');
    resetPage();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* Enterprise gradient header + KPIs */}
      <EnterpriseHeader
        icon="users"
        title="User & Access Management"
        badge="ReadyTech Solutions"
        subtitle="Manage roles, permissions and access controls"
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
              title="Total Users"
              value={metrics.total}
              icon="users"
              accent="indigo"
              badge="All Users"
            />
          </View>
          <View style={{ width: 150 }}>
            <KpiCard
              title="Active Users"
              value={metrics.active}
              icon="user-check"
              accent="green"
              badge="Live"
            />
          </View>
          <View style={{ width: 150 }}>
            <KpiCard
              title="Administrators"
              value={metrics.admins}
              icon="shield"
              accent="amber"
              badge="Secure"
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
            placeholder="Search name, email, role, department…"
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
                User Filters
              </Text>
            </View>
            <Segmented
              label="Role"
              options={ROLE_FILTERS}
              value={role as (typeof ROLE_FILTERS)[number]}
              onChange={(v) => {
                setRole(v);
                resetPage();
              }}
              scroll
            />
            <Segmented
              label="Status"
              options={STATUS_FILTERS}
              value={status as (typeof STATUS_FILTERS)[number]}
              onChange={(v) => {
                setStatus(v as UserFilters['status']);
                resetPage();
              }}
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
              : `Showing ${visible.length} of ${filtered.length} users`}
          </Text>
          <View className="flex-row items-center gap-1.5">
            <View className="h-2 w-2 rounded-full bg-emerald-500" />
            <Text className="text-xs font-medium text-indigo-600">
              User Directory
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <LoadingState label="Loading users…" />
      ) : error ? (
        <MessageState
          icon="wifi-off"
          tone="error"
          title="Couldn't load users"
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
            <UserCard
              user={item}
              onPress={() =>
                router.push({ pathname: '/user/[id]', params: { id: item._id } })
              }
              onEdit={() =>
                router.push({
                  pathname: '/user/edit/[id]',
                  params: { id: item._id },
                })
              }
              onDelete={() => removeUser(item)}
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
              title={filtersActive ? 'No users match your filters' : 'No users yet'}
              message={
                filtersActive
                  ? 'Try adjusting or clearing your filters.'
                  : 'Tap + to add your first user.'
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
        onPress={() => router.push('/user/new')}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-indigo-600 shadow-lg active:opacity-90"
      >
        <Feather name="plus" size={26} color="#ffffff" />
      </Pressable>
    </SafeAreaView>
  );
}
