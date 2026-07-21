import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { Section } from '@/components/ui/DetailSection';
import EnterpriseHeader, { HeaderAction } from '@/components/ui/EnterpriseHeader';
import InvoiceStatusBadge from '@/components/ui/InvoiceStatusBadge';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  deleteInvoice,
  fetchInvoice,
  money,
  sendInvoiceEmail,
  updateInvoiceStatus,
  type Invoice,
} from '@/services/invoices';
import { downloadAndShareInvoicePdf } from '@/services/pdf';

type FeatherName = keyof typeof Feather.glyphMap;

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString() : '-');
const joinAddr = (parts: (string | undefined)[]) => parts.filter(Boolean).join(', ');

function ActionPill({
  icon,
  label,
  onPress,
  tone = 'light',
  busy,
}: {
  icon: FeatherName;
  label: string;
  onPress: () => void;
  tone?: 'light' | 'primary' | 'danger' | 'success';
  busy?: boolean;
}) {
  const tones = {
    light: 'bg-white border border-slate-200',
    primary: 'bg-indigo-600',
    danger: 'bg-red-50 border border-red-200',
    success: 'bg-emerald-50 border border-emerald-200',
  };
  const textTones = {
    light: 'text-slate-700',
    primary: 'text-white',
    danger: 'text-red-600',
    success: 'text-emerald-700',
  };
  const iconColor = {
    light: '#334155',
    primary: '#ffffff',
    danger: '#dc2626',
    success: '#059669',
  }[tone];

  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      className={`mr-2 flex-row items-center gap-2 rounded-xl px-4 py-2.5 ${tones[tone]} ${
        busy ? 'opacity-60' : 'active:opacity-80'
      }`}
    >
      {busy ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <Feather name={icon} size={16} color={iconColor} />
      )}
      <Text className={`text-sm font-semibold ${textTones[tone]}`}>{label}</Text>
    </Pressable>
  );
}

function SummaryRow({
  label,
  value,
  valueClass = 'text-slate-800',
  bold,
}: {
  label: string;
  value: string;
  valueClass?: string;
  bold?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className={`text-sm ${bold ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
        {label}
      </Text>
      <Text className={`text-sm ${bold ? 'font-bold' : 'font-medium'} ${valueClass}`}>
        {value}
      </Text>
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-3 w-1/2 pr-3">
      <Text className="text-[11px] uppercase tracking-wide text-slate-400">{label}</Text>
      <Text className="text-sm font-semibold text-slate-800">{value}</Text>
    </View>
  );
}

export default function InvoiceDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(false);
      setLoading(true);
      setInvoice(await fetchInvoice(id, true));
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

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  const handlePdf = () =>
    run('pdf', async () => {
      try {
        await downloadAndShareInvoicePdf(invoice!);
      } catch {
        Toast.show({ type: 'error', text1: 'Failed to download PDF' });
      }
    });

  const handleSend = () =>
    run('send', async () => {
      try {
        const res = await sendInvoiceEmail(invoice!._id);
        Toast.show({ type: 'success', text1: res?.message || 'Invoice sent' });
        setInvoice((prev) => (prev ? { ...prev, status: 'Sent' } : prev));
      } catch (err: any) {
        Toast.show({
          type: 'error',
          text1: err?.response?.data?.message || 'Failed to send email',
        });
      }
    });

  const markStatus = (status: 'Paid' | 'Overdue') =>
    run(status, async () => {
      try {
        const updated = await updateInvoiceStatus(invoice!._id, status);
        setInvoice(updated);
        Toast.show({ type: 'success', text1: `Marked as ${status}` });
      } catch {
        Toast.show({ type: 'error', text1: 'Failed to update status' });
      }
    });

  const handleDelete = () => {
    if (!invoice) return;
    Alert.alert('Delete invoice', `Delete ${invoice.invoiceNumber || 'this invoice'}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          run('delete', async () => {
            try {
              await deleteInvoice(invoice._id);
              Toast.show({ type: 'success', text1: 'Invoice deleted' });
              router.back();
            } catch {
              Toast.show({ type: 'error', text1: 'Delete failed' });
            }
          }),
      },
    ]);
  };

  const company = invoice?.companyDetails || {};
  const billing = invoice?.billingDetails || {};
  const shipping = invoice?.shippingDetails || {};
  const items = Array.isArray(invoice?.items) ? invoice!.items! : [];
  const isIntra = invoice?.taxType === 'INTRA';

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        title="Invoice"
        badge={invoice?.invoiceNumber}
        right={
          invoice ? <HeaderAction icon="trash-2" color="#fecaca" onPress={handleDelete} /> : undefined
        }
      >
        {invoice ? (
          <View className="mt-3 flex-row items-center gap-2">
            <InvoiceStatusBadge status={invoice.status || 'Draft'} />
            <Text className="text-xs text-slate-300">
              {invoice.invoiceType || 'Invoice'}
            </Text>
          </View>
        ) : null}
      </EnterpriseHeader>

      {loading ? (
        <LoadingState label="Loading invoice…" />
      ) : error || !invoice ? (
        <MessageState
          icon="alert-triangle"
          tone="error"
          title="Invoice not found"
          message="This invoice may have been removed."
          actionLabel="Retry"
          onAction={load}
        />
      ) : (
        <>
          {/* Action bar */}
          <View className="border-b border-slate-200 bg-white py-3">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            >
              <ActionPill icon="download" label="PDF" onPress={handlePdf} busy={busy === 'pdf'} />
              <ActionPill icon="share-2" label="Share" onPress={handlePdf} />
              <ActionPill
                icon="send"
                label="Send"
                tone="primary"
                onPress={handleSend}
                busy={busy === 'send'}
              />
              <ActionPill
                icon="check-circle"
                label="Mark Paid"
                tone="success"
                onPress={() => markStatus('Paid')}
                busy={busy === 'Paid'}
              />
              <ActionPill
                icon="alert-circle"
                label="Overdue"
                onPress={() => markStatus('Overdue')}
                busy={busy === 'Overdue'}
              />
              <ActionPill icon="trash-2" label="Delete" tone="danger" onPress={handleDelete} />
            </ScrollView>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Company */}
            <View className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <Text className="text-lg font-bold text-slate-900">
                {company.companyName || 'Your Company'}
              </Text>
              {joinAddr([company.address, company.city, company.state, company.pincode, company.country]) ? (
                <Text className="mt-1 text-xs text-slate-500">
                  {joinAddr([company.address, company.city, company.state, company.pincode, company.country])}
                </Text>
              ) : null}
              {company.email ? <Text className="mt-1 text-xs text-slate-500">{company.email}</Text> : null}
              {company.phone ? <Text className="text-xs text-slate-500">{company.phone}</Text> : null}
              {company.gstNumber ? (
                <Text className="mt-1 text-xs text-slate-500">GSTIN: {company.gstNumber}</Text>
              ) : null}
            </View>

            {/* Meta */}
            <Section title="Invoice Details">
              <View className="flex-row flex-wrap pb-3 pt-2">
                <Meta label="Invoice #" value={invoice.invoiceNumber || '-'} />
                <Meta label="Status" value={invoice.status || 'Draft'} />
                <Meta label="Invoice Date" value={fmtDate(invoice.issueDate)} />
                <Meta label="Due Date" value={fmtDate(invoice.dueDate)} />
                <Meta label="Order Date" value={fmtDate(invoice.orderDate)} />
                <Meta label="Payment Date" value={fmtDate(invoice.paymentDate)} />
              </View>
            </Section>

            {/* Bill To / Ship To */}
            <Section title="Bill To">
              <View className="pb-3 pt-1">
                <Text className="font-semibold text-slate-800">
                  {billing.companyName || invoice.customer?.companyName || '-'}
                </Text>
                {billing.contactPerson ? (
                  <Text className="text-sm text-slate-600">{billing.contactPerson}</Text>
                ) : null}
                {joinAddr([billing.addressLine1, billing.addressLine2, billing.city, billing.state, billing.pincode, billing.country]) ? (
                  <Text className="mt-1 text-sm text-slate-500">
                    {joinAddr([billing.addressLine1, billing.addressLine2, billing.city, billing.state, billing.pincode, billing.country])}
                  </Text>
                ) : null}
                {billing.email ? <Text className="mt-1 text-sm text-slate-500">Email: {billing.email}</Text> : null}
                {billing.phone ? <Text className="text-sm text-slate-500">Phone: {billing.phone}</Text> : null}
                {billing.gstNumber ? <Text className="text-sm text-slate-500">GSTIN: {billing.gstNumber}</Text> : null}
              </View>
            </Section>

            {(shipping.addressLine1 || invoice.placeOfSupply) && (
              <Section title="Ship To">
                <View className="pb-3 pt-1">
                  <Text className="font-semibold text-slate-800">
                    {shipping.companyName || billing.companyName || '-'}
                  </Text>
                  {joinAddr([shipping.addressLine1, shipping.addressLine2, shipping.city, shipping.state, shipping.pincode, shipping.country]) ? (
                    <Text className="mt-1 text-sm text-slate-500">
                      {joinAddr([shipping.addressLine1, shipping.addressLine2, shipping.city, shipping.state, shipping.pincode, shipping.country])}
                    </Text>
                  ) : null}
                  {invoice.placeOfSupply ? (
                    <Text className="mt-1 text-sm text-slate-600">Place of Supply: {invoice.placeOfSupply}</Text>
                  ) : null}
                </View>
              </Section>
            )}

            {/* Items */}
            <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Items ({items.length})
            </Text>
            {items.map((item, index) => {
              const qty = Number(item.quantity || 0);
              const rate = Number(item.unitPrice || 0);
              const taxable = Number(item.taxableAmount ?? qty * rate);
              const amount = Number(item.total ?? taxable + Number(item.taxAmount || 0));
              return (
                <View
                  key={index}
                  className="mb-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                >
                  <View className="flex-row items-start justify-between">
                    <Text className="flex-1 pr-3 font-semibold text-slate-800">
                      {item.description || '-'}
                    </Text>
                    <Text className="font-bold text-slate-900">{money(amount)}</Text>
                  </View>
                  <View className="mt-2 flex-row flex-wrap gap-x-4 gap-y-1">
                    <Text className="text-xs text-slate-500">HSN/SAC: {item.hsnCode || item.sacCode || '-'}</Text>
                    <Text className="text-xs text-slate-500">Qty: {qty}</Text>
                    <Text className="text-xs text-slate-500">Rate: {money(rate)}</Text>
                    <Text className="text-xs text-slate-500">Taxable: {money(taxable)}</Text>
                    <Text className="text-xs text-slate-500">Tax: {Number(item.taxPercent || 0)}%</Text>
                  </View>
                </View>
              );
            })}

            {/* Tax summary */}
            <View className="mt-4 rounded-2xl bg-slate-100 p-4">
              <SummaryRow label="Subtotal" value={money(invoice.subtotal)} />
              {Number(invoice.discountAmount || 0) > 0 && (
                <SummaryRow
                  label={`Discount${invoice.discountType === 'Percentage' ? ` (${Number(invoice.discountValue || 0)}%)` : ''}`}
                  value={`− ${money(invoice.discountAmount)}`}
                  valueClass="text-rose-600"
                />
              )}
              <SummaryRow label="Taxable Value" value={money(invoice.taxableAmount)} />
              {isIntra ? (
                <>
                  <SummaryRow label={`CGST (${Number(invoice.cgstPercent || 0)}%)`} value={money(invoice.cgstAmount)} />
                  <SummaryRow label={`SGST (${Number(invoice.sgstPercent || 0)}%)`} value={money(invoice.sgstAmount)} />
                </>
              ) : (
                <SummaryRow label={`IGST (${Number(invoice.igstPercent || 0)}%)`} value={money(invoice.igstAmount)} />
              )}
              {Number(invoice.roundOff || 0) !== 0 && (
                <SummaryRow label="Round Off" value={money(invoice.roundOff)} />
              )}
              <View className="my-2 border-t border-slate-300" />
              <SummaryRow label="Grand Total" value={money(invoice.grandTotal)} valueClass="text-indigo-600" bold />
              <SummaryRow label="Amount Paid" value={money(invoice.amountPaid)} valueClass="text-green-600" />
              <SummaryRow label="Balance Due" value={money(invoice.balanceDue)} valueClass="text-rose-600" />
            </View>

            {/* Payment */}
            <Section title="Payment">
              <View className="flex-row flex-wrap pb-3 pt-2">
                <Meta label="Payment Method" value={invoice.paymentMode || '-'} />
                <Meta label="Payment Status" value={invoice.paymentStatus || '-'} />
                <Meta label="Transaction ID" value={invoice.transactionId || invoice.paymentReference || '-'} />
              </View>
            </Section>

            {(invoice.notes || invoice.termsAndConditions) && (
              <Section title="Notes & Terms">
                <View className="pb-4 pt-1">
                  {invoice.notes ? (
                    <Text className="text-sm leading-relaxed text-slate-700">{invoice.notes}</Text>
                  ) : null}
                  {invoice.termsAndConditions ? (
                    <Text className="mt-2 text-xs leading-relaxed text-slate-500">
                      {invoice.termsAndConditions}
                    </Text>
                  ) : null}
                </View>
              </Section>
            )}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}
