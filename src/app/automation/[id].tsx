import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { DetailRow, Section } from '@/components/ui/DetailSection';
import EnterpriseHeader, { HeaderAction } from '@/components/ui/EnterpriseHeader';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  actionSummary,
  activateAutomation,
  automationError,
  crmModuleMeta,
  deleteAutomation,
  duplicateAutomation,
  fetchAutomation,
  fetchAutomationExecutions,
  testAutomation,
  pauseAutomation,
  STATUS_META,
  type Automation,
  type AutomationExecution,
} from '@/services/automations';

const EXECUTION_STYLE: Record<string, { icon: keyof typeof Feather.glyphMap; color: string }> = {
  success: { icon: 'check-circle', color: '#059669' },
  failed: { icon: 'x-circle', color: '#dc2626' },
  skipped: { icon: 'skip-forward', color: '#64748b' },
  running: { icon: 'loader', color: '#4f46e5' },
};

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <View className="flex-1 items-center rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
      <Text className="text-[11px] text-slate-500">{label}</Text>
      <Text className="mt-1 text-lg font-bold text-slate-900">{value}</Text>
    </View>
  );
}

/** Web AutomationDetails: overview, trigger, conditions, actions, executions. */
export default function AutomationDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [automation, setAutomation] = useState<Automation | null>(null);
  const [executions, setExecutions] = useState<AutomationExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError('');
      const [a, ex] = await Promise.all([fetchAutomation(id), fetchAutomationExecutions(id)]);
      setAutomation(a);
      setExecutions(ex);
    } catch (err) {
      setError(automationError(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const act = async (fn: () => Promise<unknown>, success: string, after?: () => void) => {
    try {
      setBusy(true);
      await fn();
      Toast.show({ type: 'success', text1: success });
      if (after) after();
      else await load();
    } catch (err) {
      Toast.show({ type: 'error', text1: automationError(err) });
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = () =>
    automation?.status === 'active'
      ? act(() => pauseAutomation(id!), 'Automation paused')
      : act(() => activateAutomation(id!), 'Automation activated');

  /** Backend /test fires this module+event for every ACTIVE automation — real actions run. */
  const confirmTest = () => {
    if (!automation) return;
    const event = automation.trigger?.event ?? 'event';
    Alert.alert(
      'Run test',
      `This fires the "${event}" event for ALL active ${automation.module} automations with an empty test record. ` +
        'Their actions really run (emails, tasks, notifications).' +
        (automation.status !== 'active' ? '\n\nThis automation is not active, so it will not be included.' : ''),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run test',
          onPress: async () => {
            try {
              setBusy(true);
              const r = await testAutomation(id!);
              if (r.error) throw new Error(r.error);
              Toast.show({ type: 'success', text1: 'Test completed', text2: `${r.matched} matched · ${r.executed} executed` });
              await load(); // refresh run history
            } catch (err) {
              Toast.show({ type: 'error', text1: 'Test failed', text2: automationError(err) });
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const confirmDelete = () =>
    Alert.alert('Delete automation', 'Delete this automation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => act(() => deleteAutomation(id!), 'Automation deleted', () => router.back()),
      },
    ]);

  const meta = crmModuleMeta(automation?.module);
  const status = STATUS_META[automation?.status ?? 'draft'] ?? STATUS_META.draft;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        icon={meta?.icon ?? 'zap'}
        title={automation?.name ?? 'Automation'}
        badge="CRM Automation"
        subtitle={automation?.description || 'No description added'}
        right={
          automation ? (
            <>
              <HeaderAction
                icon="edit-2"
                disabled={busy}
                onPress={() => router.push({ pathname: '/automation/edit/[id]', params: { id: id! } })}
              />
              <HeaderAction icon="play" disabled={busy} onPress={confirmTest} />
              <HeaderAction
                icon="copy"
                disabled={busy}
                onPress={() => act(() => duplicateAutomation(id!), 'Automation duplicated', () => router.back())}
              />
              <HeaderAction icon="trash-2" color="#fecaca" disabled={busy} onPress={confirmDelete} />
            </>
          ) : undefined
        }
      />

      {loading ? (
        <LoadingState label="Loading automation…" />
      ) : error ? (
        <MessageState icon="alert-triangle" tone="error" title="Couldn't load automation" message={error} actionLabel="Retry" onAction={load} />
      ) : !automation ? (
        <MessageState icon="search" title="Automation not found." />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View className="flex-row items-center justify-between">
            <View className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${status.badge}`}>
              <View className={`h-2 w-2 rounded-full ${status.dot}`} />
              <Text className={`text-xs font-semibold ${status.text}`}>{status.label}</Text>
            </View>
            <Pressable
              onPress={toggleStatus}
              disabled={busy}
              className={`flex-row items-center gap-2 rounded-2xl px-4 py-2.5 ${
                automation.status === 'active' ? 'bg-amber-500' : 'bg-emerald-600'
              } ${busy ? 'opacity-60' : 'active:opacity-90'}`}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name={automation.status === 'active' ? 'pause' : 'play'} size={15} color="#fff" />
              )}
              <Text className="text-sm font-semibold text-white">
                {automation.status === 'active' ? 'Pause' : 'Activate'}
              </Text>
            </Pressable>
          </View>

          <View className="mt-4 flex-row gap-3">
            <Stat label="Executions" value={automation.executionCount || 0} />
            <Stat label="Successful" value={automation.successCount || 0} />
            <Stat label="Failed" value={automation.failureCount || 0} />
          </View>

          <Section title="Trigger">
            <DetailRow icon="layers" label="Module" value={meta?.label.replace(' Automations', '') ?? automation.module} />
            <DetailRow icon="zap" label="Event" value={automation.trigger?.event || '—'} />
          </Section>

          <Section title="Conditions">
            {automation.conditions?.length ? (
              <View className="pb-3">
                {automation.conditions.map((c, i) => (
                  <Text key={i} className="py-1 text-sm text-slate-700">
                    {i > 0 ? `${automation.conditionLogic || 'AND'} ` : ''}
                    <Text className="font-semibold">{c.field}</Text> {c.operator} {String(c.value ?? '')}
                  </Text>
                ))}
              </View>
            ) : (
              <Text className="pb-4 pt-1 text-sm text-slate-500">Runs for every matching event (no conditions).</Text>
            )}
          </Section>

          <Section title="Actions">
            {automation.actions?.length ? (
              automation.actions.map((a, i) => (
                <DetailRow key={i} icon="star" label={a.type} value={actionSummary(a)} />
              ))
            ) : (
              <Text className="pb-4 pt-1 text-sm text-slate-500">No actions configured.</Text>
            )}
          </Section>

          <Section title="Workflow Summary">
            <DetailRow icon="hash" label="Version" value={`v${automation.version ?? 1}`} />
            <DetailRow icon="user" label="Created By" value={automation.createdBy?.name || '—'} />
            <DetailRow
              icon="calendar"
              label="Created"
              value={automation.createdAt ? new Date(automation.createdAt).toLocaleString() : '—'}
            />
          </Section>

          <Section title="Recent Executions">
            {executions.length === 0 ? (
              <Text className="pb-4 pt-1 text-sm text-slate-500">This automation hasn&apos;t run yet.</Text>
            ) : (
              executions.map((e) => {
                const st = EXECUTION_STYLE[e.status] ?? EXECUTION_STYLE.skipped;
                return (
                  <View key={e._id} className="flex-row items-start gap-3 border-t border-slate-100 py-3">
                    <Feather name={st.icon} size={16} color={st.color} />
                    <View className="flex-1">
                      <Text className="text-sm font-semibold capitalize text-slate-800">{e.status}</Text>
                      {typeof e.error === 'string' && e.error ? (
                        <Text className="mt-0.5 text-xs text-red-600">{e.error}</Text>
                      ) : null}
                    </View>
                    <Text className="text-[11px] text-slate-400">
                      {e.createdAt ? new Date(e.createdAt).toLocaleString() : ''}
                    </Text>
                  </View>
                );
              })
            )}
          </Section>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
