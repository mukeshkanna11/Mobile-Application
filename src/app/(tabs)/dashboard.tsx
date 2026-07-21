import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ActivityRow from '@/components/ui/ActivityRow';
import QuickAction from '@/components/ui/QuickAction';
import StatCard from '@/components/ui/StatCard';
import { logout, type AuthUser } from '@/services/auth';
import { fetchDashboard, type DashboardData } from '@/services/dashboard';
import { getObject, StorageKeys } from '@/services/storage';

const QUICK_ACTIONS = [
  { label: 'Add Client', icon: 'user-plus' as const, color: '#4f46e5' },
  { label: 'New Invoice', icon: 'file-plus' as const, color: '#9333ea' },
  { label: 'Add Product', icon: 'package' as const, color: '#0ea5e9' },
  { label: 'Stock In', icon: 'download' as const, color: '#16a34a' },
];

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
}

export default function DashboardScreen() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await fetchDashboard();
      setData(result);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    getObject<AuthUser>(StorageKeys.user).then(setUser);
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-sm text-slate-500">Welcome back</Text>
            <Text className="text-2xl font-bold text-slate-900">
              {user?.name ?? user?.email ?? 'Admin'}
            </Text>
          </View>

          <Pressable
            onPress={handleLogout}
            className="flex-row items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm active:opacity-80"
          >
            <Feather name="log-out" size={16} color="#4f46e5" />
            <Text className="font-medium text-indigo-600">Logout</Text>
          </Pressable>
        </View>

        {/* Revenue banner */}
        <View className="mt-6 rounded-3xl bg-indigo-600 p-6">
          <Text className="text-indigo-200">Collected Revenue</Text>
          {loading ? (
            <ActivityIndicator className="mt-2 self-start" color="#ffffff" />
          ) : (
            <Text className="mt-1 text-3xl font-black text-white">
              {formatCurrency(data?.revenue ?? 0)}
            </Text>
          )}
          <Text className="mt-1 text-xs text-indigo-200">
            Across {data?.invoices ?? 0} invoices
          </Text>
        </View>

        {/* Stat cards */}
        <View className="mt-6 gap-4">
          <View className="flex-row gap-4">
            <StatCard
              label="Clients"
              value={data?.clients ?? 0}
              icon="users"
              tint="bg-indigo-100"
              iconColor="#4f46e5"
              loading={loading}
            />
            <StatCard
              label="Products"
              value={data?.products ?? 0}
              icon="box"
              tint="bg-sky-100"
              iconColor="#0ea5e9"
              loading={loading}
            />
          </View>
          <View className="flex-row gap-4">
            <StatCard
              label="Inventory"
              value={data?.inventory ?? 0}
              icon="layers"
              tint="bg-amber-100"
              iconColor="#d97706"
              loading={loading}
            />
            <StatCard
              label="Invoices"
              value={data?.invoices ?? 0}
              icon="file-text"
              tint="bg-purple-100"
              iconColor="#9333ea"
              loading={loading}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <Text className="mb-3 mt-8 text-lg font-bold text-slate-900">
          Quick Actions
        </Text>
        <View className="flex-row gap-3">
          {QUICK_ACTIONS.map((action) => (
            <QuickAction key={action.label} {...action} />
          ))}
        </View>

        {/* Recent Activities */}
        <Text className="mb-1 mt-8 text-lg font-bold text-slate-900">
          Recent Activities
        </Text>
        <View className="mt-2 rounded-2xl border border-slate-100 bg-white px-4 shadow-sm">
          {loading ? (
            <ActivityIndicator className="my-8" color="#4f46e5" />
          ) : data && data.activities.length > 0 ? (
            data.activities.map((activity, index) => (
              <View
                key={activity._id}
                className={
                  index > 0 ? 'border-t border-slate-100' : undefined
                }
              >
                <ActivityRow activity={activity} />
              </View>
            ))
          ) : (
            <Text className="py-8 text-center text-sm text-slate-400">
              No recent activities
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
