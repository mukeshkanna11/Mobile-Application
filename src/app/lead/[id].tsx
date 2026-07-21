import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { DetailRow, Section } from '@/components/ui/DetailSection';
import EnterpriseHeader, { HeaderAction } from '@/components/ui/EnterpriseHeader';
import PriorityChip from '@/components/ui/PriorityChip';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  deleteLead,
  fetchLead,
  priorityOf,
  type Lead,
} from '@/services/leads';

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <Text className="text-xs text-slate-500">{label}</Text>
      <Text className="mt-1 text-lg font-bold text-slate-900" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function LeadDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(false);
      setLoading(true);
      setLead(await fetchLead(id));
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
    Alert.alert('Delete lead', `Delete “${lead?.name ?? 'this lead'}”?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleting(true);
            await deleteLead(id);
            Toast.show({ type: 'success', text1: 'Lead deleted' });
            router.back();
          } catch (err: any) {
            setDeleting(false);
            Toast.show({
              type: 'error',
              text1: 'Delete failed',
              text2: err?.response?.data?.message ?? 'Please try again.',
            });
          }
        },
      },
    ]);
  }, [id, lead]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        title="Lead Profile"
        badge="ReadyTech Solutions"
        right={
          lead ? (
            <>
              <HeaderAction
                icon="edit-2"
                onPress={() =>
                  router.push({
                    pathname: '/lead/edit/[id]',
                    params: { id: lead._id },
                  })
                }
              />
              <HeaderAction
                icon="trash-2"
                color="#fecaca"
                disabled={deleting}
                onPress={confirmDelete}
              />
            </>
          ) : undefined
        }
      >
        {lead ? (
          <View className="mt-4 flex-row items-center gap-4">
            <View className="h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10">
              <Text className="text-2xl font-black text-white">
                {(lead.name || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-white" numberOfLines={1}>
                {lead.name}
              </Text>
              <Text className="text-xs text-slate-300" numberOfLines={1}>
                {lead.designation || 'Lead'}
                {lead.company ? ` · ${lead.company}` : ''}
              </Text>
              <View className="mt-2 flex-row flex-wrap gap-2">
                <View className="rounded-full bg-white/10 px-2.5 py-1">
                  <Text className="text-xs font-medium text-white">
                    {lead.status}
                  </Text>
                </View>
                <View className="rounded-full bg-indigo-500/20 px-2.5 py-1">
                  <Text className="text-xs font-medium text-indigo-100">
                    {lead.source || 'Website'}
                  </Text>
                </View>
                <View className="rounded-full bg-white/10 px-2.5 py-1">
                  <Text className="text-xs font-medium text-white">
                    RTS-{lead._id?.slice(-6)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}
      </EnterpriseHeader>

      {loading ? (
        <LoadingState label="Loading lead…" />
      ) : error || !lead ? (
        <MessageState
          icon="alert-triangle"
          tone="error"
          title="Couldn't load lead"
          message="This lead may have been removed."
          actionLabel="Retry"
          onAction={load}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick stats (mirrors web) */}
          <View className="flex-row gap-3">
            <StatChip label="Lead Score" value={String(lead.leadScore ?? 82)} />
            <StatChip
              label="Expected Deal"
              value={`₹${lead.expectedValue ?? 0}`}
            />
            <StatChip
              label="Follow-up"
              value={lead.followUpDate || 'Not set'}
            />
          </View>

          <View className="mt-4 flex-row items-center gap-2">
            <Text className="text-xs text-slate-500">Derived priority:</Text>
            <PriorityChip priority={priorityOf(lead.status)} />
          </View>

          <Section title="Contact Information">
            <DetailRow
              icon="mail"
              label="Email"
              value={lead.email}
              onPress={
                lead.email
                  ? () => Linking.openURL(`mailto:${lead.email}`)
                  : undefined
              }
            />
            <DetailRow
              icon="phone"
              label="Phone"
              value={lead.phone}
              onPress={
                lead.phone
                  ? () => Linking.openURL(`tel:${lead.phone}`)
                  : undefined
              }
            />
            <DetailRow icon="briefcase" label="Company" value={lead.company} />
            <DetailRow
              icon="globe"
              label="Website"
              value={lead.website}
              onPress={
                lead.website
                  ? () =>
                      Linking.openURL(
                        lead.website!.startsWith('http')
                          ? lead.website!
                          : `https://${lead.website}`
                      )
                  : undefined
              }
            />
            <DetailRow icon="layers" label="Industry" value={lead.industry} />
            <DetailRow
              icon="calendar"
              label="Created"
              value={
                lead.createdAt
                  ? new Date(lead.createdAt).toLocaleString()
                  : undefined
              }
            />
          </Section>

          <Section title="Sales Information">
            <DetailRow icon="target" label="Lead Status" value={lead.status} />
            <DetailRow
              icon="flag"
              label="Priority"
              value={lead.priority || 'Medium'}
            />
            <DetailRow
              icon="user"
              label="Assigned To"
              value={lead.assignedTo || 'Not Assigned'}
            />
            <DetailRow
              icon="dollar-sign"
              label="Expected Deal"
              value={`₹${lead.expectedValue ?? 0}`}
            />
          </Section>

          <Section title="Notes">
            <Text className="pb-4 pt-1 text-sm leading-relaxed text-slate-700">
              {lead.notes || 'No notes have been added for this lead yet.'}
            </Text>
          </Section>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
