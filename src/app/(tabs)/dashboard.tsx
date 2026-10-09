import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState, type ComponentProps, type ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import QuickAction from '@/components/ui/QuickAction';
import StatCard from '@/components/ui/StatCard';
import { LoadingState, MessageState } from '@/components/ui/StateView';

import { logout } from '@/services/auth';
import { fetchDashboard, type DashboardData } from '@/services/dashboard';

type FeatherName = ComponentProps<typeof Feather>['name'];

const inr = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const num = (n: number) => Number(n || 0).toLocaleString('en-IN');
const shortDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString() : '—');

const STATUS_COLORS: Record<string, string> = {
  New: '#3b82f6',
  Contacted: '#f59e0b',
  Qualified: '#22c55e',
  Closed: '#64748b',
};

const TONES = {
  indigo: { tint: 'bg-indigo-50', color: '#4f46e5' },
  emerald: { tint: 'bg-emerald-50', color: '#059669' },
  violet: { tint: 'bg-violet-50', color: '#7c3aed' },
  amber: { tint: 'bg-amber-50', color: '#d97706' },
  sky: { tint: 'bg-sky-50', color: '#0284c7' },
  red: { tint: 'bg-red-50', color: '#dc2626' },
};

const ACTIVITY_ICON: Record<string, { icon: FeatherName; color: string }> = {
  Call: { icon: 'phone', color: '#3b82f6' },
  Email: { icon: 'mail', color: '#8b5cf6' },
  Meeting: { icon: 'calendar', color: '#22c55e' },
  Lead: { icon: 'user-plus', color: '#6366f1' },
};

/** Website quick actions, mapped to the screens that exist in the app. */
const QUICK_ACTIONS: { label: string; icon: FeatherName; to: Href }[] = [
  { label: 'New Lead', icon: 'user-plus', to: '/lead/new' },
  { label: 'Add Client', icon: 'briefcase', to: '/client/new' },
  { label: 'Products', icon: 'package', to: '/products' },
  { label: 'Inventory', icon: 'layers', to: '/inventory' },
  { label: 'Invoices', icon: 'bar-chart-2', to: '/invoices' },
];

type KpiItem = {
  label: string;
  value: string;
  icon: FeatherName;
  tone: keyof typeof TONES;
  hint?: string;
  danger?: boolean;
  to?: Href;
};

function kpiGroups(d: DashboardData): { title: string; items: KpiItem[] }[] {
  return [
    {
      title: 'Revenue',
      items: [
        { label: 'Total Revenue', value: inr(d.totalRevenue), icon: 'credit-card', tone: 'emerald' },
        { label: 'Monthly Average', value: inr(d.monthlyAvg), icon: 'trending-up', tone: 'indigo' },
        { label: 'Won Deal Revenue', value: inr(d.wonRevenue), icon: 'award', tone: 'amber' },
        { label: 'Purchase Spend', value: inr(d.purchaseSpend), icon: 'dollar-sign', tone: 'violet' },
      ],
    },
    {
      title: 'Sales',
      items: [
        { label: 'Total Orders', value: num(d.salesOrders), icon: 'shopping-cart', tone: 'indigo' },
        { label: 'Delivered', value: num(d.delivered), icon: 'package', tone: 'emerald' },
        { label: 'Approved', value: num(d.approved), icon: 'calendar', tone: 'sky' },
        { label: 'Sales Revenue', value: inr(d.totalRevenue), icon: 'credit-card', tone: 'violet' },
      ],
    },
    {
      title: 'CRM',
      items: [
        { label: 'Total Leads', value: num(d.leads), icon: 'users', tone: 'indigo', hint: `${d.qualifiedLeads} qualified`, to: '/leads' },
        { label: 'Clients', value: num(d.clients), icon: 'briefcase', tone: 'sky', hint: `${d.activeClients} active`, to: '/clients' },
        { label: 'Open Opportunities', value: num(d.openOpps), icon: 'target', tone: 'violet', to: '/opportunities' },
        { label: 'Pipeline Value', value: inr(d.pipelineValue), icon: 'credit-card', tone: 'emerald' },
      ],
    },
    {
      title: 'ERP',
      items: [
        { label: 'Products', value: num(d.products), icon: 'package', tone: 'indigo', to: '/products' },
        { label: 'Warehouses', value: num(d.warehouses), icon: 'home', tone: 'sky', to: '/warehouses' },
        { label: 'Inventory Items', value: num(d.inventoryItems), icon: 'layers', tone: 'violet', to: '/inventory' },
        { label: 'Purchase Orders', value: num(d.purchaseOrders), icon: 'shopping-cart', tone: 'amber' },
      ],
    },
    {
      title: 'Inventory',
      items: [
        { label: 'Total Units', value: num(d.totalUnits), icon: 'layers', tone: 'indigo' },
        { label: 'Low Stock', value: num(d.lowStock), icon: 'alert-triangle', tone: 'amber', danger: d.lowStock > 0 },
        { label: 'Out of Stock', value: num(d.outOfStock), icon: 'x-octagon', tone: 'red', danger: d.outOfStock > 0 },
        { label: 'Health Score', value: `${d.healthScore}%`, icon: 'shield', tone: 'emerald' },
      ],
    },
    {
      title: 'Purchase',
      items: [
        { label: 'Total POs', value: num(d.purchaseOrders), icon: 'shopping-cart', tone: 'violet' },
        { label: 'Pending', value: num(d.pendingPO), icon: 'clock', tone: 'amber' },
        { label: 'Completed', value: num(d.completedPO), icon: 'check-circle', tone: 'emerald' },
        { label: 'Total Spend', value: inr(d.purchaseSpend), icon: 'dollar-sign', tone: 'indigo' },
      ],
    },
  ];
}

/* ================= PRESENTATIONAL HELPERS ================= */

function SectionCard({
  title,
  subtitle,
  badge,
  badgeTone = 'indigo',
  icon,
  action,
  children,
}: {
  title: string;
  icon?: FeatherName;
  subtitle?: string;
  badge?: string;
  badgeTone?: 'indigo' | 'emerald' | 'amber';
  action?: { label: string; onPress: () => void };
  children: ReactNode;
}) {
  const badgeStyles = {
    indigo: 'bg-indigo-50 text-indigo-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  }[badgeTone];
  return (
    <View className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <View className="mb-4 flex-row items-start justify-between">
        {icon ? (
          <View className="mr-3 rounded-xl bg-indigo-50 p-2.5">
            <Feather name={icon} size={18} color="#4f46e5" />
          </View>
        ) : null}
        <View className="min-w-0 flex-1 pr-3">
          <Text className="text-base font-semibold text-slate-900">{title}</Text>
          {subtitle ? <Text className="text-xs text-slate-500">{subtitle}</Text> : null}
        </View>
        <View className="shrink-0 flex-row items-center gap-2">
          {badge ? (
            <Text className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeStyles}`}>
              {badge}
            </Text>
          ) : null}
          {action ? (
            <Pressable onPress={action.onPress} hitSlop={8} className="flex-row items-center">
              <Text className="text-xs font-medium text-indigo-600">{action.label}</Text>
              <Feather name="arrow-up-right" size={14} color="#4f46e5" />
            </Pressable>
          ) : null}
        </View>
      </View>
      {children}
    </View>
  );
}

function Empty({ icon, title, subtitle }: { icon: FeatherName; title: string; subtitle: string }) {
  return (
    <View className="items-center py-8">
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-slate-50">
        <Feather name={icon} size={22} color="#94a3b8" />
      </View>
      <Text className="mt-3 text-sm font-semibold text-slate-700">{title}</Text>
      <Text className="mt-1 text-center text-xs text-slate-400">{subtitle}</Text>
    </View>
  );
}

function HeroStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View style={{ flexBasis: '47%', flexGrow: 1 }} className="rounded-2xl border border-white/10 bg-white/10 p-4">
      <Text className="text-xs text-slate-300">{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} className={`mt-1.5 text-xl font-bold ${accent}`}>
        {value}
      </Text>
    </View>
  );
}

const compact = (v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : `${v}`);

/** Vertical bar chart of monthly revenue (last 12 months). */
function RevenueChart({ data }: { data: DashboardData['salesTrend'] }) {
  const rows = data.slice(-12);
  const max = Math.max(...rows.map((r) => r.revenue), 1);
  return (
    <View className="h-48 flex-row items-end" style={{ gap: 6 }}>
      {rows.map((r) => (
        <View key={r.key} className="flex-1 items-center justify-end">
          <Text className="mb-1 text-[9px] text-slate-500" numberOfLines={1}>
            {compact(r.revenue)}
          </Text>
          <View
            className="w-full rounded-t-lg bg-indigo-500"
            style={{ height: Math.max(4, (r.revenue / max) * 140) }}
          />
          <Text className="mt-1 text-[10px] text-slate-500">{r.month}</Text>
        </View>
      ))}
    </View>
  );
}

/** Stacked distribution bar + legend for lead status. */
function LeadStatusChart({ data }: { data: DashboardData['leadStatusData'] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <View>
      <View className="h-4 flex-row overflow-hidden rounded-full">
        {data.map((d) => (
          <View key={d.name} style={{ flex: d.value, backgroundColor: STATUS_COLORS[d.name] ?? '#94a3b8' }} />
        ))}
      </View>
      <View className="mt-4" style={{ gap: 10 }}>
        {data.map((d) => (
          <View key={d.name} className="flex-row items-center">
            <View className="mr-2 h-3 w-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[d.name] ?? '#94a3b8' }} />
            <Text className="flex-1 text-sm text-slate-700">{d.name}</Text>
            <Text className="text-sm font-semibold text-slate-900">{d.value}</Text>
            <Text className="ml-2 w-12 text-right text-xs text-slate-400">
              {Math.round((d.value / total) * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Horizontal stock bars — names stay readable on narrow screens. */
function StockChart({ data }: { data: DashboardData['stockChart'] }) {
  const rows = data.slice().sort((a, b) => b.qty - a.qty).slice(0, 8);
  const max = Math.max(...rows.map((r) => r.qty), 1);
  return (
    <View style={{ gap: 10 }}>
      {rows.map((r, i) => (
        <View key={`${r.name}-${i}`}>
          <View className="mb-1 flex-row justify-between">
            <Text className="flex-1 pr-2 text-xs text-slate-700" numberOfLines={1}>{r.name}</Text>
            <Text className="text-xs font-semibold text-slate-900">{num(r.qty)}</Text>
          </View>
          <View className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <View
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${Math.max(0, (r.qty / max) * 100)}%` }}
            />
          </View>
        </View>
      ))}
      {data.length > rows.length ? (
        <Text className="text-xs text-slate-400">Top {rows.length} of {data.length} items</Text>
      ) : null}
    </View>
  );
}

function RankRow({
  rank,
  title,
  subtitle,
  value,
  filled = false,
}: {
  rank: number;
  title: string;
  subtitle: string;
  value: string;
  filled?: boolean;
}) {
  return (
    <View className="flex-row items-center py-1.5">
      <View className={`h-7 w-7 items-center justify-center rounded-lg ${filled ? 'bg-violet-500' : 'bg-indigo-50'}`}>
        <Text className={`text-xs font-bold ${filled ? 'text-white' : 'text-indigo-600'}`}>{rank}</Text>
      </View>
      <View className="ml-3 min-w-0 flex-1">
        <Text className="text-sm font-medium text-slate-800" numberOfLines={1}>{title}</Text>
        <Text className="text-xs text-slate-500">{subtitle}</Text>
      </View>
      <Text className="ml-2 text-sm font-semibold text-slate-900">{value}</Text>
    </View>
  );
}

/* ================= SCREEN ================= */

export default function DashboardScreen() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      setData(await fetchDashboard());
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload whenever the tab regains focus so figures stay current.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/');
    } catch (err) {
      console.log('Logout error:', err);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
        <LoadingState label="Loading your dashboard…" />
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
        <MessageState
          icon="alert-triangle"
          tone="error"
          title="Unable to load dashboard"
          message={error}
          actionLabel="Retry"
          onAction={() => {
            setLoading(true);
            load();
          }}
        />
      </SafeAreaView>
    );
  }

  const d = data;
  const lowCount = d.lowStock + d.outOfStock;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ============ EXECUTIVE SUMMARY HERO ============ */}
        <LinearGradient
          colors={['#020617', '#0f172a', '#312e81']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 24, overflow: 'hidden', padding: 20 }}
        >
          <View className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-500/20" />
          <View className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-cyan-500/10" />
          <View className="flex-row items-start">
            <LinearGradient
              colors={['#6366f1', '#9333ea']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
            >
              <Feather name="bar-chart-2" size={24} color="white" />
            </LinearGradient>
            <View className="ml-3 min-w-0 flex-1">
              <View className="flex-row items-center self-start rounded-full border border-white/10 bg-white/10 px-2.5 py-1">
                <View className="mr-1.5 h-2 w-2 rounded-full bg-green-400" />
                <Text className="text-[10px] font-semibold uppercase tracking-wider text-white">
                  ReadyTech Executive Overview
                </Text>
              </View>
              <Text className="mt-2 text-2xl font-bold text-white">Executive Dashboard</Text>
            </View>
            <Pressable
              onPress={handleLogout}
              hitSlop={6}
              className="h-10 w-10 items-center justify-center rounded-xl bg-white/10 active:opacity-80"
            >
              <Feather name="log-out" size={18} color="white" />
            </Pressable>
          </View>

          <Text className="mt-3 text-sm leading-5 text-slate-300">
            A unified real-time view across CRM and ERP — revenue, sales, pipeline, inventory and
            procurement in one place.
          </Text>

          <View className="mt-4 self-start rounded-2xl border border-white/10 bg-white/10 px-3 py-2">
            <Text className="text-xs text-slate-400">Last Synced</Text>
            <Text className="text-sm font-semibold text-white">{d.syncedAt.toLocaleString()}</Text>
          </View>

          <View className="mt-5 flex-row flex-wrap" style={{ gap: 10 }}>
            <HeroStat label="Total Revenue" value={inr(d.totalRevenue)} accent="text-emerald-300" />
            <HeroStat label="Pipeline Value" value={inr(d.pipelineValue)} accent="text-indigo-300" />
            <HeroStat label="Sales Orders" value={num(d.salesOrders)} accent="text-white" />
            <HeroStat label="Active Clients" value={num(d.activeClients)} accent="text-cyan-300" />
          </View>
        </LinearGradient>

        {/* ============ KPI GROUPS ============ */}
        {kpiGroups(d).map((group) => (
          <View key={group.title} className="mt-6">
            <View className="mb-3 flex-row items-center">
              <Text className="text-xs font-bold uppercase tracking-[2px] text-slate-500">
                {group.title} KPIs
              </Text>
              <View className="ml-3 h-px flex-1 bg-slate-200" />
            </View>
            <View className="flex-row flex-wrap" style={{ gap: 12 }}>
              {group.items.map((k) => (
                <View key={k.label} style={{ flexBasis: '47%', flexGrow: 1 }}>
                  <StatCard
                    label={k.label}
                    value={k.value}
                    icon={k.icon}
                    tint={TONES[k.tone].tint}
                    iconColor={TONES[k.tone].color}
                    hint={k.hint}
                    danger={k.danger}
                    onPress={k.to ? () => router.push(k.to!) : undefined}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* ============ CHARTS ============ */}
        <SectionCard title="Monthly Revenue Trend" subtitle="Consolidated sales revenue by month" badge="Live">
          {d.salesTrend.length ? (
            <RevenueChart data={d.salesTrend} />
          ) : (
            <Empty icon="trending-up" title="No revenue yet" subtitle="Sales revenue will appear here once orders are placed." />
          )}
        </SectionCard>

        <SectionCard title="Lead Status" subtitle="Distribution across the funnel" badge="CRM">
          {d.leadStatusData.length ? (
            <LeadStatusChart data={d.leadStatusData} />
          ) : (
            <Empty icon="users" title="No leads yet" subtitle="Lead insights will appear once leads are added." />
          )}
        </SectionCard>

        <SectionCard title="Inventory Distribution" subtitle="Current stock levels by product" badge="Real Time">
          {d.stockChart.length ? (
            <StockChart data={d.stockChart} />
          ) : (
            <Empty icon="layers" title="No inventory data" subtitle="Stock levels will appear here once inventory is recorded." />
          )}
        </SectionCard>

        {/* ============ RECENT SALES + ACTIVITY ============ */}
        <SectionCard title="Recent Sales" subtitle="Latest customer orders">
          {d.recentSales.length ? (
            d.recentSales.map((so, i) => (
              <View key={so._id} className={`flex-row items-center py-3 ${i ? 'border-t border-slate-100' : ''}`}>
                <View className="h-9 w-9 items-center justify-center rounded-xl bg-indigo-500">
                  <Text className="text-xs font-bold text-white">
                    {(so.customer?.name || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="ml-3 min-w-0 flex-1">
                  <Text className="text-sm font-medium text-slate-800" numberOfLines={1}>
                    {so.customer?.name || 'Unknown Customer'}
                  </Text>
                  <Text className="text-xs text-slate-500" numberOfLines={1}>{so.soNumber || 'Sales Order'}</Text>
                </View>
                <View className="ml-2 items-end">
                  <Text className="text-sm font-semibold text-emerald-600">{inr(so.amount)}</Text>
                  <Text className="text-[11px] text-slate-400">{shortDate(so.createdAt)}</Text>
                </View>
              </View>
            ))
          ) : (
            <Empty icon="shopping-cart" title="No sales yet" subtitle="Recent orders will appear here." />
          )}
        </SectionCard>

        <SectionCard
          title="Recent Activities"
          subtitle="Latest CRM interactions"
          action={{ label: 'View all', onPress: () => router.push('/salesforce/activities') }}
        >
          {d.recentActivities.length ? (
            d.recentActivities.map((a, i) => {
              const ic = ACTIVITY_ICON[a.type ?? ''] ?? { icon: 'activity' as const, color: '#94a3b8' };
              return (
                <View key={a.id} className={`flex-row items-center py-3 ${i ? 'border-t border-slate-100' : ''}`}>
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-slate-50">
                    <Feather name={ic.icon} size={15} color={ic.color} />
                  </View>
                  <View className="ml-3 min-w-0 flex-1">
                    <Text className="text-sm font-medium text-slate-800" numberOfLines={1}>{a.title}</Text>
                    <Text className="text-xs text-slate-500" numberOfLines={1}>{a.desc}</Text>
                  </View>
                  <Text className="ml-2 text-[11px] text-slate-400">{shortDate(a.time)}</Text>
                </View>
              );
            })
          ) : (
            <Empty icon="activity" title="No activity yet" subtitle="CRM activity will appear here." />
          )}
        </SectionCard>

        {/* ============ TOP PRODUCTS + TOP CUSTOMERS ============ */}
        <SectionCard title="Top Products" subtitle="Best performers by revenue">
          {d.topProducts.length ? (
            d.topProducts.map((p, i) => (
              <RankRow key={p.name} rank={i + 1} title={p.name} subtitle={`${num(p.units)} units sold`} value={inr(p.revenue)} />
            ))
          ) : (
            <Empty icon="star" title="No product sales" subtitle="Top products appear once orders include items." />
          )}
        </SectionCard>

        <SectionCard title="Top Customers" subtitle="Highest revenue accounts">
          {d.topCustomers.length ? (
            d.topCustomers.map((c, i) => (
              <RankRow key={c.name} rank={i + 1} title={c.name} subtitle={`${num(c.orders)} orders`} value={inr(c.revenue)} filled />
            ))
          ) : (
            <Empty icon="users" title="No customers yet" subtitle="Top customers appear once orders are placed." />
          )}
        </SectionCard>

        {/* ============ LOW STOCK ALERTS ============ */}
        <SectionCard
          title="Low Stock Alerts"
          subtitle="Items at or below their reorder limit"
          badge={d.lowStockRows.length ? `${lowCount} items` : 'Healthy'}
          badgeTone={d.lowStockRows.length ? 'amber' : 'emerald'}
          action={{ label: 'Manage', onPress: () => router.push('/inventory') }}
        >
          {d.lowStockRows.length ? (
            d.lowStockRows.map((r, i) => {
              const out = r.qty <= 0;
              return (
                <View key={i} className={`flex-row items-center py-2.5 ${i ? 'border-t border-slate-100' : ''}`}>
                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-medium text-slate-800" numberOfLines={1}>{r.name}</Text>
                    <Text className="text-xs text-slate-500" numberOfLines={1}>
                      {r.warehouse} · Limit {r.limit}
                    </Text>
                  </View>
                  <Text className={`mx-3 text-sm font-semibold ${out ? 'text-red-600' : 'text-amber-600'}`}>{r.qty}</Text>
                  <Text
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      out ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {out ? 'Out of Stock' : 'Low'}
                  </Text>
                </View>
              );
            })
          ) : (
            <Empty icon="shield" title="All stock healthy" subtitle="No products are below their reorder limit." />
          )}
        </SectionCard>

        {/* ============ QUICK ACTIONS ============ */}
        <SectionCard title="Quick Actions" subtitle="Jump straight into daily workflows" icon="zap">
          <View className="flex-row flex-wrap" style={{ gap: 10 }}>
            {QUICK_ACTIONS.map((a) => (
              <View key={a.label} style={{ width: '31%' }}>
                <QuickAction label={a.label} icon={a.icon} color="#4f46e5" onPress={() => router.push(a.to)} />
              </View>
            ))}
          </View>
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}
