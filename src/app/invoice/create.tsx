import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import InvoiceItemCard from '@/components/forms/InvoiceItemCard';
import DateField from '@/components/ui/DateField';
import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import FormField from '@/components/ui/FormField';
import PrimaryButton from '@/components/ui/PrimaryButton';
import SearchablePicker, { type PickerOption } from '@/components/ui/SearchablePicker';
import Segmented from '@/components/ui/Segmented';
import { fetchClients, type Client } from '@/services/clients';
import { createInvoice, money } from '@/services/invoices';
import {
  buildInvoicePayload,
  computeInvoiceTotals,
  createInvoiceState,
  DISCOUNT_TYPES,
  emptyItem,
  INVOICE_TYPES,
  PAYMENT_MODES,
  TAX_TYPES,
  validateInvoiceForm,
  type InvoiceFormItem,
  type InvoiceFormState,
} from '@/services/invoiceForm';

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="mb-3 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </Text>
  );
}

function TotalRow({
  label,
  value,
  valueClass = 'text-white',
  bold,
}: {
  label: string;
  value: string;
  valueClass?: string;
  bold?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className={`text-sm ${bold ? 'font-bold text-white' : 'text-slate-300'}`}>
        {label}
      </Text>
      <Text className={`${bold ? 'text-base font-bold' : 'text-sm font-medium'} ${valueClass}`}>
        {value}
      </Text>
    </View>
  );
}

export default function CreateInvoiceScreen() {
  const [clients, setClients] = useState<Client[]>([]);
  const [invoice, setInvoice] = useState<InvoiceFormState>(createInvoiceState());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchClients()
      .then(setClients)
      .catch(() => Toast.show({ type: 'error', text1: 'Unable to load customers' }));
  }, []);

  const setField = <K extends keyof InvoiceFormState>(
    key: K,
    value: InvoiceFormState[K]
  ) => setInvoice((prev) => ({ ...prev, [key]: value }));

  const updateItem = (index: number, patch: Partial<InvoiceFormItem>) =>
    setInvoice((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], ...patch };
      return { ...prev, items };
    });

  const addItem = () =>
    setInvoice((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));

  const removeItem = (index: number) =>
    setInvoice((prev) => {
      if (prev.items.length === 1) {
        Toast.show({ type: 'error', text1: 'Minimum one item required.' });
        return prev;
      }
      return { ...prev, items: prev.items.filter((_, i) => i !== index) };
    });

  const totals = useMemo(() => computeInvoiceTotals(invoice), [invoice]);

  const clientOptions: PickerOption[] = useMemo(
    () =>
      clients.map((c) => ({
        value: c._id,
        label: c.companyName || c.contactPerson || 'Unnamed',
        sublabel: c.email || c.phone,
      })),
    [clients]
  );

  const handleSubmit = async () => {
    if (saving) return;
    const client = clients.find((c) => String(c._id) === String(invoice.customer));
    const err = validateInvoiceForm(invoice, client);
    if (err) {
      Toast.show({ type: 'error', text1: err });
      return;
    }
    try {
      setSaving(true);
      await createInvoice(buildInvoicePayload(invoice, client!));
      Toast.show({ type: 'success', text1: 'Invoice Created Successfully' });
      router.back();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: error?.response?.data?.message || 'Invoice Creation Failed',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        icon="file-plus"
        title="Create Invoice"
        subtitle="GST-compliant tax invoice"
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SectionTitle>Customer</SectionTitle>
          <SearchablePicker
            label="Customer"
            required
            placeholder="Select customer"
            searchPlaceholder="Search customers…"
            value={invoice.customer}
            options={clientOptions}
            onSelect={(v) => setField('customer', v)}
          />

          <SectionTitle>Invoice Details</SectionTitle>
          <Segmented
            label="Invoice Type"
            options={INVOICE_TYPES}
            value={invoice.invoiceType}
            onChange={(v) => setField('invoiceType', v)}
            scroll
          />
          <FormField
            label="Order Number"
            value={invoice.orderNumber}
            onChangeText={(t) => setField('orderNumber', t)}
            placeholder="Optional"
          />
          <DateField
            label="Issue Date"
            value={invoice.issueDate}
            onChange={(d) => setField('issueDate', d)}
          />
          <DateField
            label="Due Date"
            value={invoice.dueDate}
            onChange={(d) => setField('dueDate', d)}
          />
          <DateField
            label="Purchase Date"
            value={invoice.purchaseDate}
            onChange={(d) => setField('purchaseDate', d)}
          />

          <SectionTitle>Tax</SectionTitle>
          <Segmented
            label="Tax Type"
            options={TAX_TYPES}
            value={invoice.taxType}
            onChange={(v) => setField('taxType', v)}
          />
          {invoice.taxType === 'INTRA' ? (
            <View className="flex-row gap-3">
              <View className="flex-1">
                <FormField
                  label="CGST %"
                  value={String(invoice.cgstRate)}
                  onChangeText={(t) => setField('cgstRate', Number(t) || 0)}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <FormField
                  label="SGST %"
                  value={String(invoice.sgstRate)}
                  onChangeText={(t) => setField('sgstRate', Number(t) || 0)}
                  keyboardType="numeric"
                />
              </View>
            </View>
          ) : (
            <FormField
              label="IGST %"
              value={String(invoice.igstRate)}
              onChangeText={(t) => setField('igstRate', Number(t) || 0)}
              keyboardType="numeric"
            />
          )}

          <SectionTitle>Discount</SectionTitle>
          <Segmented
            label="Discount Type"
            options={DISCOUNT_TYPES}
            value={invoice.discountType}
            onChange={(v) => setField('discountType', v)}
          />
          <FormField
            label={invoice.discountType === 'Percentage' ? 'Discount (%)' : 'Discount (₹)'}
            value={String(invoice.discountValue)}
            onChangeText={(t) => setField('discountValue', Number(t) || 0)}
            keyboardType="numeric"
          />

          <SectionTitle>Payment</SectionTitle>
          <Segmented
            label="Payment Mode"
            options={PAYMENT_MODES}
            value={invoice.paymentMode}
            onChange={(v) => setField('paymentMode', v)}
            scroll
          />

          {/* Items */}
          <View className="mb-3 mt-5 flex-row items-center justify-between">
            <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Items ({invoice.items.length})
            </Text>
            <Pressable
              onPress={addItem}
              className="flex-row items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 active:opacity-80"
            >
              <Feather name="plus" size={14} color="#ffffff" />
              <Text className="text-xs font-semibold text-white">Add Item</Text>
            </Pressable>
          </View>

          {invoice.items.map((item, index) => (
            <InvoiceItemCard
              key={index}
              index={index}
              item={item}
              onChange={updateItem}
              onRemove={removeItem}
              removable={invoice.items.length > 1}
            />
          ))}

          <SectionTitle>Notes & Terms</SectionTitle>
          <FormField
            label="Notes"
            value={invoice.notes}
            onChangeText={(t) => setField('notes', t)}
            multiline
          />
          <FormField
            label="Terms & Conditions"
            value={invoice.termsAndConditions}
            onChangeText={(t) => setField('termsAndConditions', t)}
            multiline
          />

          {/* Live totals */}
          <View className="mt-5 rounded-2xl bg-slate-900 p-5">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Summary
            </Text>
            <TotalRow label="Subtotal" value={money(totals.subtotal)} />
            {totals.discountAmount > 0 && (
              <TotalRow
                label="Discount"
                value={`− ${money(totals.discountAmount)}`}
                valueClass="text-rose-300"
              />
            )}
            <TotalRow label="Taxable" value={money(totals.taxableAmount)} />
            {invoice.taxType === 'INTRA' ? (
              <>
                <TotalRow label={`CGST (${invoice.cgstRate}%)`} value={money(totals.cgst)} />
                <TotalRow label={`SGST (${invoice.sgstRate}%)`} value={money(totals.sgst)} />
              </>
            ) : (
              <TotalRow label={`IGST (${invoice.igstRate}%)`} value={money(totals.igst)} />
            )}
            {totals.roundOff !== 0 && (
              <TotalRow label="Round Off" value={money(totals.roundOff)} />
            )}
            <View className="my-2 border-t border-white/10" />
            <TotalRow label="Grand Total" value={money(totals.payable)} valueClass="text-cyan-300" bold />
          </View>

          <View className="mt-5">
            <PrimaryButton
              label="Create Invoice"
              loadingLabel="Creating…"
              loading={saving}
              onPress={handleSubmit}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
