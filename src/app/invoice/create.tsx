import { Feather } from '@expo/vector-icons';
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
import { isForbidden } from '@/services/products';
import { createInvoice, money } from '@/services/invoices';
import {
  billingFromClient,
  buildInvoicePayload,
  computeInvoiceTotals,
  createInvoiceState,
  DISCOUNT_TYPES,
  emptyBillingDetails,
  emptyItem,
  INVOICE_TYPES,
  PAYMENT_MODES,
  TAX_TYPES,
  validateInvoiceForm,
  type BillingDetailsState,
  type ClientMode,
  type InvoiceAddress,
  type InvoiceFormItem,
  type InvoiceFormState,
} from '@/services/invoiceForm';
import { goBackOr } from '@/utils/nav';

/** Segmented renders raw option strings, so map labels ⇄ mode values here. */
const MODE_LABELS = ['Existing Client', 'New / Walk-in'] as const;
type ModeLabel = (typeof MODE_LABELS)[number];

const modeToLabel = (mode: ClientMode): ModeLabel =>
  mode === 'existing' ? 'Existing Client' : 'New / Walk-in';

const labelToMode = (label: ModeLabel): ClientMode =>
  label === 'Existing Client' ? 'existing' : 'walkin';

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
  // /clients is admin-only; non-admins can still bill walk-in customers.
  const [clientsForbidden, setClientsForbidden] = useState(false);

  useEffect(() => {
    fetchClients()
      .then(setClients)
      .catch((err) =>
        isForbidden(err)
          ? setClientsForbidden(true)
          : Toast.show({ type: 'error', text1: 'Unable to load customers' })
      );
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

  /** Patch a top-level billing field (company name, GST, email…). */
  const setBillingField = <K extends keyof BillingDetailsState>(
    key: K,
    value: BillingDetailsState[K]
  ) =>
    setInvoice((prev) => ({
      ...prev,
      billing: { ...prev.billing, [key]: value },
    }));

  const setAddress = (
    which: 'billingAddress' | 'shippingAddress',
    key: keyof InvoiceAddress,
    value: string
  ) =>
    setInvoice((prev) => ({
      ...prev,
      billing: {
        ...prev.billing,
        [which]: { ...prev.billing[which], [key]: value },
      },
    }));

  const copyBillingToShipping = () =>
    setInvoice((prev) => ({
      ...prev,
      billing: {
        ...prev.billing,
        shippingAddress: { ...prev.billing.billingAddress },
      },
    }));

  /** Switching mode clears the other mode's buyer data so nothing leaks over. */
  const changeMode = (mode: ClientMode) =>
    setInvoice((prev) =>
      prev.clientMode === mode
        ? prev
        : {
            ...prev,
            clientMode: mode,
            customer: '',
            billing: emptyBillingDetails(),
          }
    );

  /** Task 4: selecting a client auto-fills every billing field, still editable. */
  const selectClient = (id: string) => {
    const client = clients.find((c) => String(c._id) === String(id));
    setInvoice((prev) => ({
      ...prev,
      customer: id,
      billing: client ? billingFromClient(client) : emptyBillingDetails(),
    }));
  };

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
      await createInvoice(buildInvoicePayload(invoice, client));
      Toast.show({ type: 'success', text1: 'Invoice Created Successfully' });
      goBackOr('/invoices');
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
          <Segmented<ModeLabel>
            label="Billing To"
            options={MODE_LABELS}
            value={modeToLabel(invoice.clientMode)}
            onChange={(label) => changeMode(labelToMode(label))}
          />

          {invoice.clientMode === 'existing' && clientsForbidden ? (
            <View className="mb-4 flex-row items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <Feather name="lock" size={14} color="#b45309" />
              <Text className="flex-1 text-xs leading-5 text-amber-800">
                Existing customers can only be loaded by admin users. Switch to
                Walk-in to bill this customer, or ask an administrator for access.
              </Text>
            </View>
          ) : invoice.clientMode === 'existing' ? (
            <SearchablePicker
              label="Customer"
              required
              placeholder="Select customer"
              searchPlaceholder="Search customers…"
              value={invoice.customer}
              options={clientOptions}
              onSelect={selectClient}
            />
          ) : (
            <View className="mb-4 flex-row items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <Feather name="info" size={14} color="#b45309" />
              <Text className="flex-1 text-xs leading-5 text-amber-800">
                Walk-in details are saved on the invoice only — no client record
                is created.
              </Text>
            </View>
          )}

          {/* ===== Billing Details (auto-filled, editable) ===== */}
          <SectionTitle>Billing Details</SectionTitle>
          <FormField
            label="Company Name"
            required
            value={invoice.billing.companyName}
            onChangeText={(t) => setBillingField('companyName', t)}
            placeholder="Acme Pvt Ltd"
          />
          <FormField
            label="Contact Person"
            value={invoice.billing.contactPerson}
            onChangeText={(t) => setBillingField('contactPerson', t)}
            placeholder="Full name"
          />
          <FormField
            label="GST Number"
            value={invoice.billing.gstNumber}
            onChangeText={(t) => setBillingField('gstNumber', t)}
            placeholder="29ABCDE1234F1Z5"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={15}
          />
          <View className="flex-row" style={{ gap: 12 }}>
            <View className="flex-1">
              <FormField
                label="Email"
                value={invoice.billing.email}
                onChangeText={(t) => setBillingField('email', t)}
                placeholder="name@company.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View className="flex-1">
              <FormField
                label="Phone"
                value={invoice.billing.phone}
                onChangeText={(t) => setBillingField('phone', t)}
                placeholder="+91…"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <SectionTitle>Billing Address</SectionTitle>
          <FormField
            label="Address Line 1"
            value={invoice.billing.billingAddress.addressLine1}
            onChangeText={(t) => setAddress('billingAddress', 'addressLine1', t)}
            placeholder="Street, area"
          />
          <FormField
            label="Address Line 2"
            value={invoice.billing.billingAddress.addressLine2}
            onChangeText={(t) => setAddress('billingAddress', 'addressLine2', t)}
            placeholder="Landmark, building"
          />
          <View className="flex-row" style={{ gap: 12 }}>
            <View className="flex-1">
              <FormField
                label="City"
                value={invoice.billing.billingAddress.city}
                onChangeText={(t) => setAddress('billingAddress', 'city', t)}
                placeholder="Coimbatore"
              />
            </View>
            <View className="flex-1">
              <FormField
                label="State"
                value={invoice.billing.billingAddress.state}
                onChangeText={(t) => setAddress('billingAddress', 'state', t)}
                placeholder="Tamil Nadu"
              />
            </View>
          </View>
          <View className="flex-row" style={{ gap: 12 }}>
            <View className="flex-1">
              <FormField
                label="Pincode"
                value={invoice.billing.billingAddress.pincode}
                onChangeText={(t) => setAddress('billingAddress', 'pincode', t)}
                placeholder="641004"
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>
            <View className="flex-1">
              <FormField
                label="Country"
                value={invoice.billing.billingAddress.country}
                onChangeText={(t) => setAddress('billingAddress', 'country', t)}
                placeholder="India"
              />
            </View>
          </View>

          <View className="mb-3 mt-2 flex-row items-center justify-between">
            <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Shipping Address
            </Text>
            <Pressable
              onPress={copyBillingToShipping}
              hitSlop={6}
              className="flex-row items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 active:opacity-80"
            >
              <Feather name="copy" size={13} color="#4f46e5" />
              <Text className="text-xs font-medium text-indigo-600">
                Same as billing
              </Text>
            </Pressable>
          </View>
          <FormField
            label="Address Line 1"
            value={invoice.billing.shippingAddress.addressLine1}
            onChangeText={(t) => setAddress('shippingAddress', 'addressLine1', t)}
            placeholder="Street, area"
          />
          <FormField
            label="Address Line 2"
            value={invoice.billing.shippingAddress.addressLine2}
            onChangeText={(t) => setAddress('shippingAddress', 'addressLine2', t)}
            placeholder="Landmark, building"
          />
          <View className="flex-row" style={{ gap: 12 }}>
            <View className="flex-1">
              <FormField
                label="City"
                value={invoice.billing.shippingAddress.city}
                onChangeText={(t) => setAddress('shippingAddress', 'city', t)}
                placeholder="Coimbatore"
              />
            </View>
            <View className="flex-1">
              <FormField
                label="State"
                value={invoice.billing.shippingAddress.state}
                onChangeText={(t) => setAddress('shippingAddress', 'state', t)}
                placeholder="Tamil Nadu"
              />
            </View>
          </View>
          <View className="flex-row" style={{ gap: 12 }}>
            <View className="flex-1">
              <FormField
                label="Pincode"
                value={invoice.billing.shippingAddress.pincode}
                onChangeText={(t) => setAddress('shippingAddress', 'pincode', t)}
                placeholder="641004"
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>
            <View className="flex-1">
              <FormField
                label="Country"
                value={invoice.billing.shippingAddress.country}
                onChangeText={(t) => setAddress('shippingAddress', 'country', t)}
                placeholder="India"
              />
            </View>
          </View>

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
