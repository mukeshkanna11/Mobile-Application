import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import EnterpriseHeader, { HeaderAction } from '@/components/ui/EnterpriseHeader';
import Segmented from '@/components/ui/Segmented';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  activateAutomation,
  automationError,
  crmModuleMeta,
  deleteAutomation,
  duplicateAutomation,
  fetchAutomations,
  pauseAutomation,
  relativeDate,
  STATUS_META,
  type Automation,
} from '@/services/automations';

const STATUS_FILTERS = ['all', 'active', 'paused', 'draft'] as const;

/** Automations for one CRM module (web Automations page filtered by `module`). */
export default function CrmAutomationListScreen() {
  const { module } = useLocalSearchParams<{ module: string }>();
  const meta = crmModuleMeta(module);

  const [items, setItems] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>('all');

  const load = useCallback(async () => {
    if (!meta) return;
    try {
      setError('');
      setItems(await fetchAutomations({ module: meta.module, status, search }));
    } catch (err) {
      setError(automationError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [meta, status, search]);

  // Runs on focus (refresh after details) and, debounced 250ms like the web
  // page, whenever search/status change.
  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(load, 250);
      return () => clearTimeout(t);
    }, [load])
  );

  const stats = useMemo(
    () => ({
      active: items.filter((a) => a.status === 'active').length,
      executions: items.reduce((s, a) => s + (a.executionCount || 0), 0),
      failures: items.reduce((s, a) => s + (a.failureCount || 0), 0),
    }),
    [items]
  );

  const run = async (fn: () => Promise<unknown>, success: string) => {
    try {
      await fn();
      Toast.show({ type: 'success', text1: success });
      load();
    } catch (err) {
      Toast.show({ type: 'error', text1: automationError(err) });
    }
  };

  const openActions = (a: Automation) =>
    Alert.alert(a.name, undefined, [
      a.status === 'active'
        ? { text: 'Pause', onPress: () => run(() => pauseAutomation(a._id), 'Automation paused') }
        : { text: 'Activate', onPress: () => run(() => activateAutomation(a._id), 'Automation activated') },
      { text: 'Duplicate', onPress: () => run(() => duplicateAutomation(a._id), 'Automation duplicated') },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete automation', 'Are you sure you want to delete this automation?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => run(() => deleteAutomation(a._id), 'Automation deleted'),
            },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);

  if (!meta) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
        <EnterpriseHeader onBack icon="zap" title="CRM Automations" />
        <MessageState icon="alert-triangle" tone="error" title="Unknown CRM module" message={String(module ?? '')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        icon={meta.icon}
        title={meta.label}
        badge="CRM Automation"
        subtitle={meta.description}
        right={
          <>
            <HeaderAction
              icon="layers"
              onPress={() => router.push({ pathname: '/automation/templates', params: { module: meta.module } })}
            />
            <HeaderAction
              icon="plus"
              onPress={() => router.push({ pathname: '/automation/new', params: { module: meta.module } })}
            />
            <HeaderAction
              icon="refresh-cw"
              onPress={() => {
                setRefreshing(true);
                load();
              }}
              color={refreshing ? '#a5b4fc' : '#ffffff'}
            />
          </>
        }
      >
        <View className="mt-4 flex-row gap-2">
          {[
            ['Total', items.length],
            ['Active', stats.active],
            ['Runs', stats.executions],
            ['Failures', stats.failures],
          ].map(([label, value]) => (
            <View key={label} className="flex-1 rounded-2xl border border-white/10 bg-white/10 p-3">
              <Text className="text-[11px] text-slate-300">{label}</Text>
              <Text className="mt-0.5 text-lg font-bold text-white">{value}</Text>
            </View>
          ))}
        </View>
      </EnterpriseHeader>

      <View className="px-5 pt-3">
        <View className="flex-row items-center rounded-2xl border border-slate-200 bg-white px-3">
          <Feather name="search" size={18} color="#94a3b8" />
          <TextInput
            className="flex-1 py-2.5 pl-2 text-base text-slate-800"
            placeholder="Search automations…"
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <View className="mt-3">
          <Segmented
            options={STATUS_FILTERS}
            value={status}
            onChange={setStatus}
            scroll
          />
        </View>
      </View>

      {loading ? (
        <LoadingState label="Loading automations…" />
      ) : error ? (
        <MessageState
          icon="wifi-off"
          tone="error"
          title="Couldn't load automations"
          message={error}
          actionLabel="Retry"
          onAction={() => {
            setLoading(true);
            load();
          }}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(a) => a._id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          renderItem={({ item: a }) => {
            const s = STATUS_META[a.status] ?? STATUS_META.draft;
            return (
              <Pressable
                onPress={() => router.push({ pathname: '/automation/[id]', params: { id: a._id } })}
                className="mb-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
              >
                <View className="flex-row items-center">
                  <View className={`h-10 w-10 items-center justify-center rounded-2xl ${meta.tint}`}>
                    <Feather name={meta.icon} size={18} color={meta.color} />
                  </View>
                  <View className="ml-3 min-w-0 flex-1">
                    <Text className="text-base font-semibold text-slate-900" numberOfLines={1}>
                      {a.name}
                    </Text>
                    <Text className="text-xs text-slate-500" numberOfLines={1}>
                      {a.trigger?.event || 'No trigger'}
                    </Text>
                  </View>
                  <Pressable onPress={() => openActions(a)} hitSlop={10} className="p-1">
                    <Feather name="more-vertical" size={18} color="#64748b" />
                  </Pressable>
                </View>
                <View className="mt-3 flex-row items-center gap-2">
                  <View className={`flex-row items-center gap-1.5 rounded-full px-2.5 py-1 ${s.badge}`}>
                    <View className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                    <Text className={`text-xs font-semibold ${s.text}`}>{s.label}</Text>
                  </View>
                  <Text className="flex-1 text-xs text-slate-500" numberOfLines={1}>
                    {a.executionCount || 0} runs · {a.failureCount || 0} failed
                  </Text>
                  <Text className="text-[11px] text-slate-400">{relativeDate(a.lastExecutedAt)}</Text>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <MessageState
              icon="zap"
              title="No automations found"
              message={
                search || status !== 'all'
                  ? 'Try adjusting your search or status filter.'
                  : `No ${meta.label.toLowerCase()} yet. Tap + to build one or start from a template.`
              }
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
