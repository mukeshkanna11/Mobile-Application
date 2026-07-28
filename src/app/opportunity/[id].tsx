import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Text, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { DetailRow, Section } from '@/components/ui/DetailSection';
import EnterpriseHeader, { HeaderAction } from '@/components/ui/EnterpriseHeader';
import StageBadge from '@/components/ui/StageBadge';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  deleteOpportunity,
  fetchOpportunity,
  formatMoney,
  leadName,
  type Opportunity,
} from '@/services/opportunities';

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString() : undefined);

function StatChip({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View className="flex-1 items-center rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <Text className="text-xs text-slate-500">{label}</Text>
      <Text className={`mt-1 text-lg font-bold ${tone ?? 'text-slate-900'}`} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function OpportunityDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [op, setOp] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(false);
      setLoading(true);
      setOp(await fetchOpportunity(id));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const confirmDelete = useCallback(() => {
    if (!id) return;
    Alert.alert('Delete opportunity', `Delete “${op?.title ?? 'this opportunity'}”?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleting(true);
            await deleteOpportunity(id);
            Toast.show({ type: 'success', text1: 'Opportunity deleted' });
            router.back();
          } catch {
            setDeleting(false);
            Toast.show({ type: 'error', text1: 'Delete failed' });
          }
        },
      },
    ]);
  }, [id, op]);

  const probability = Number(op?.probability) || 0;
  const assignedName =
    op?.assignedTo && typeof op.assignedTo === 'object' ? op.assignedTo.name : undefined;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        title="Opportunity"
        badge="Salesforce"
        right={
          op ? (
            <>
              <HeaderAction
                icon="edit-2"
                onPress={() =>
                  router.push({
                    pathname: '/opportunity/edit/[id]',
                    params: { id: op._id },
                  })
                }
              />
              <HeaderAction icon="trash-2" color="#fecaca" disabled={deleting} onPress={confirmDelete} />
            </>
          ) : undefined
        }
      >
        {op ? (
          <View className="mt-4">
            <Text className="text-xl font-bold text-white" numberOfLines={2}>
              {op.title}
            </Text>
            <View className="mt-2 flex-row items-center gap-2">
              <StageBadge stage={op.stage} />
              <Text className="text-xs text-slate-300">{leadName(op.lead)}</Text>
            </View>
          </View>
        ) : null}
      </EnterpriseHeader>

      {loading ? (
        <LoadingState label="Loading opportunity…" />
      ) : error || !op ? (
        <MessageState
          icon="alert-triangle"
          tone="error"
          title="Couldn't load opportunity"
          message="This opportunity may have been removed."
          actionLabel="Retry"
          onAction={load}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row gap-3">
            <StatChip label="Deal Value" value={formatMoney(op.value)} tone="text-emerald-600" />
            <StatChip label="Probability" value={`${probability}%`} tone="text-indigo-600" />
          </View>

          <View className="mt-4">
            <View className="h-2 overflow-hidden rounded-full bg-slate-200">
              <View
                className="h-full rounded-full bg-indigo-600"
                style={{ width: `${Math.min(Math.max(probability, 0), 100)}%` }}
              />
            </View>
          </View>

          <Section title="Details">
            <DetailRow icon="tag" label="Title" value={op.title} />
            <DetailRow icon="activity" label="Stage" value={op.stage} />
            <DetailRow icon="user" label="Lead" value={leadName(op.lead)} />
            <DetailRow icon="dollar-sign" label="Value" value={formatMoney(op.value)} />
            <DetailRow icon="percent" label="Probability" value={`${probability}%`} />
            <DetailRow icon="calendar" label="Expected Close" value={fmtDate(op.expectedCloseDate)} />
            <DetailRow icon="briefcase" label="Department" value={op.department} />
            <DetailRow icon="user-check" label="Assigned To" value={assignedName} />
            <DetailRow icon="clock" label="Created" value={fmtDate(op.createdAt)} />
          </Section>

          <Section title="Notes">
            <Text className="pb-4 pt-1 text-sm leading-relaxed text-slate-700">
              {op.notes || 'No notes added for this opportunity yet.'}
            </Text>
          </Section>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
