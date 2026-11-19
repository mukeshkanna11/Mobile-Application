import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EnterpriseHeader, { HeaderAction } from '@/components/ui/EnterpriseHeader';
import KpiCard from '@/components/ui/KpiCard';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import { fetchInvoices, money, type Invoice } from '@/services/invoices';

/**
 * Invoice Analytics — mirrors the web page (Frontend/src/pages/InvoiceAnalytics.jsx):
 * one GET /invoices (workspace-scoped, unpaginated) and the exact same figures:
 *   Total Revenue = Σ grandTotal of all invoices
 *   Paid / Partial / Overdue = counts by the STORED status
 *   ("Paid", "Partially Paid", "Overdue") — not the list's computed due-date status.
 * The web page has no date filters or charts, so none are added here.
 */
function invoiceAnalytics(invoices: Invoice[]) {
  const byStatus = (s: string) => invoices.filter((i) => i.status === s).length;
  return {
    totalRevenue: invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0),
    paid: byStatus('Paid'),
    partial: byStatus('Partially Paid'),
    overdue: byStatus('Overdue'),
  };
}

export default function InvoiceAnalyticsScreen() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      setInvoices(await fetchInvoices());
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

  const stats = useMemo(() => invoiceAnalytics(invoices), [invoices]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        icon="bar-chart-2"
        title="Invoice Analytics"
        badge="Billing"
        subtitle="Revenue and invoice status overview"
        right={<HeaderAction icon="refresh-cw" onPress={onRefresh} color={refreshing ? '#a5b4fc' : '#ffffff'} />}
      />

      {loading ? (
        <LoadingState label="Loading analytics…" />
      ) : error ? (
        <MessageState
          icon="wifi-off"
          tone="error"
          title="Couldn't load invoices"
          actionLabel="Retry"
          onAction={() => {
            setLoading(true);
            load();
          }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <KpiCard title="Total Revenue" value={money(stats.totalRevenue)} icon="trending-up" accent="indigo" badge="All invoices" />

          <View className="mt-3 flex-row gap-3">
            <View className="flex-1">
              <KpiCard title="Paid" value={stats.paid} icon="check-circle" accent="green" />
            </View>
            <View className="flex-1">
              <KpiCard title="Partial" value={stats.partial} icon="pie-chart" accent="amber" />
            </View>
          </View>

          <View className="mt-3">
            <KpiCard title="Overdue" value={stats.overdue} icon="alert-triangle" accent="amber" />
          </View>

          <Text className="mt-4 text-center text-xs text-slate-400">
            {invoices.length
              ? `Based on ${invoices.length} invoice${invoices.length === 1 ? '' : 's'} in this workspace`
              : 'No invoices yet — figures will appear once invoices are created'}
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
