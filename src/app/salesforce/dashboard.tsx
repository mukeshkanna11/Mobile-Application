import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EnterpriseHeader, { HeaderAction } from '@/components/ui/EnterpriseHeader';
import KpiCard from '@/components/ui/KpiCard';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import type { Activity } from '@/services/dashboard';
import type { Lead } from '@/services/leads';
import { formatMoney, type Opportunity } from '@/services/opportunities';
import {
  fetchSalesforceSnapshot,
  leadStatusBreakdown,
  recentActivityFeed,
  salesforceMetrics,
  STAGE_COLORS,
  STATUS_COLORS,
  stageBreakdown,
  type Slice,
} from '@/services/salesforce';

type FeatherName = keyof typeof Feather.glyphMap;

/** Feed icon per activity type — mirrors the web ACTIVITY_ICONS map. */
const FEED_ICONS: Record<string, { icon: FeatherName; color: string }> = {
  Call: { icon: 'phone', color: '#3b82f6' },
  Email: { icon: 'mail', color: '#8b5cf6' },
  Meeting: { icon: 'calendar', color: '#22c55e' },
  'New Lead': { icon: 'user-plus', color: '#6366f1' },
};

function feedIcon(title: string) {
  return FEED_ICONS[title] ?? { icon: 'activity' as FeatherName, color: '#94a3b8' };
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN');
}

/** Card shell shared by both charts (mobile version of the web ChartCard). */
function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <Text className="text-base font-semibold text-slate-900">{title}</Text>
      <Text className="mt-0.5 text-xs text-slate-500">{subtitle}</Text>
      <View className="mt-4">{children}</View>
    </View>
  );
}

/**
 * Proportional bar row. Replaces the web's Recharts pie/bar with a native
 * layout so the module adds no charting dependency.
 */
function BarRow({
  label,
  value,
  display,
  max,
  color,
}: {
  label: string;
  value: number;
  display: string;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 4 : 0) : 0;

  return (
    <View className="mb-3.5">
      <View className="mb-1.5 flex-row items-center justify-between">
        <View className="min-w-0 flex-1 flex-row items-center">
          <View
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          <Text
            className="ml-2 text-xs font-medium text-slate-600"
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
        <Text className="ml-3 shrink-0 text-xs font-semibold text-slate-900">
          {display}
        </Text>
      </View>

      <View className="h-2 overflow-hidden rounded-full bg-slate-100">
        <View
          style={{ width: `${pct}%`, backgroundColor: color }}
          className="h-full rounded-full"
        />
      </View>
    </View>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <View className="items-center py-10">
      <Feather name="bar-chart-2" size={22} color="#cbd5e1" />
      <Text className="mt-2 text-sm text-slate-400">{label}</Text>
    </View>
  );
}

export default function SalesforceDashboardScreen() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const snapshot = await fetchSalesforceSnapshot();
      setLeads(snapshot.leads);
      setOpportunities(snapshot.opportunities);
      setActivities(snapshot.activities);
      if (snapshot.allFailed) setError(true);
    } catch {
      setError(true);
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

  const metrics = useMemo(
    () => salesforceMetrics(leads, opportunities),
    [leads, opportunities]
  );
  const statusData = useMemo(() => leadStatusBreakdown(leads), [leads]);
  const stageData = useMemo(() => stageBreakdown(opportunities), [opportunities]);
  const feed = useMemo(() => recentActivityFeed(activities, leads), [activities, leads]);

  const statusMax = useMemo(
    () => statusData.reduce((m: number, d: Slice) => Math.max(m, d.value), 0),
    [statusData]
  );
  const stageMax = useMemo(
    () => stageData.reduce((m: number, d: Slice) => Math.max(m, d.value), 0),
    [stageData]
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        title="CRM Dashboard"
        badge="Enterprise CRM"
        subtitle="Leads, pipeline and performance at a glance"
        right={
          <HeaderAction
            icon="refresh-cw"
            onPress={onRefresh}
            color={refreshing ? '#a5b4fc' : '#ffffff'}
          />
        }
      />

      {loading ? (
        <LoadingState label="Loading CRM dashboard…" />
      ) : error ? (
        <MessageState
          icon="wifi-off"
          tone="error"
          title="Couldn't load dashboard"
          message="Check your connection and try again."
          actionLabel="Retry"
          onAction={() => {
            setLoading(true);
            load();
          }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* ===== SUMMARY CARDS ===== */}
          <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Summary
          </Text>

          <View className="flex-row" style={{ gap: 12 }}>
            <View className="flex-1">
              <KpiCard
                title={`${metrics.qualifiedLeads} qualified`}
                value={metrics.totalLeads}
                icon="users"
                accent="indigo"
                badge="Leads"
              />
            </View>
            <View className="flex-1">
              <KpiCard
                title={`${metrics.wonDeals} won`}
                value={metrics.openOpps}
                icon="target"
                accent="indigo"
                badge="Open Opps"
              />
            </View>
          </View>

          <View className="mt-3 flex-row" style={{ gap: 12 }}>
            <View className="flex-1">
              <KpiCard
                title="Active deals"
                value={formatMoney(metrics.pipelineValue)}
                icon="briefcase"
                accent="amber"
                badge="Pipeline"
              />
            </View>
            <View className="flex-1">
              <KpiCard
                title={`${metrics.winRate}% win rate`}
                value={formatMoney(metrics.wonRevenue)}
                icon="award"
                accent="green"
                badge="Won"
              />
            </View>
          </View>

          {/* ===== CHARTS ===== */}
          <ChartCard
            title="Lead Status Distribution"
            subtitle="Where your leads sit in the funnel"
          >
            {statusData.length ? (
              statusData.map((d: Slice) => (
                <BarRow
                  key={d.name}
                  label={d.name}
                  value={d.value}
                  display={String(d.value)}
                  max={statusMax}
                  color={STATUS_COLORS[d.name] ?? '#94a3b8'}
                />
              ))
            ) : (
              <EmptyChart label="No lead data yet" />
            )}
          </ChartCard>

          <ChartCard
            title="Pipeline by Stage"
            subtitle="Deal value across each opportunity stage"
          >
            {opportunities.length ? (
              stageData.map((d: Slice, i: number) => (
                <BarRow
                  key={d.name}
                  label={d.name}
                  value={d.value}
                  display={formatMoney(d.value)}
                  max={stageMax}
                  color={STAGE_COLORS[i % STAGE_COLORS.length]}
                />
              ))
            ) : (
              <EmptyChart label="No opportunity data yet" />
            )}
          </ChartCard>

          {/* ===== RECENT ACTIVITY ===== */}
          <View className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <View className="flex-row items-center justify-between border-b border-slate-100 px-5 py-4">
              <View className="min-w-0 flex-1">
                <Text className="text-base font-semibold text-slate-900">
                  Recent Activity
                </Text>
                <Text className="mt-0.5 text-xs text-slate-500">
                  Latest interactions across your CRM
                </Text>
              </View>
              <Pressable
                hitSlop={8}
                onPress={() => router.push('/salesforce/activities')}
                className="ml-3 flex-row items-center gap-1 rounded-full bg-indigo-50 px-3 py-1.5 active:opacity-80"
              >
                <Text className="text-xs font-semibold text-indigo-600">
                  View all
                </Text>
                <Feather name="arrow-up-right" size={13} color="#4f46e5" />
              </Pressable>
            </View>

            {feed.length ? (
              feed.map((item, index) => {
                const { icon, color } = feedIcon(item.title);
                return (
                  <View
                    key={item.id}
                    className={`flex-row items-center px-5 py-3.5 ${
                      index !== feed.length - 1
                        ? 'border-b border-slate-100'
                        : ''
                    }`}
                  >
                    <View
                      className="h-9 w-9 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${color}1A` }}
                    >
                      <Feather name={icon} size={15} color={color} />
                    </View>

                    <View className="ml-3 min-w-0 flex-1">
                      <Text
                        className="text-sm font-semibold text-slate-800"
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text
                        className="mt-0.5 text-xs text-slate-500"
                        numberOfLines={1}
                      >
                        {item.desc}
                      </Text>
                    </View>

                    <Text className="ml-3 shrink-0 text-[11px] font-medium text-slate-400">
                      {formatDate(item.time)}
                    </Text>
                  </View>
                );
              })
            ) : (
              <View className="items-center px-8 py-12">
                <View className="h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <Feather name="activity" size={24} color="#94a3b8" />
                </View>
                <Text className="mt-3 text-sm text-slate-400">
                  No recent activity
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
