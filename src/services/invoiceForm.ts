import type { Client } from '@/services/clients';

/**
 * Create-invoice form model — a faithful port of CreateInvoice.jsx.
 * State shape, live calculations, validation and the POST payload all match the
 * web version exactly (the backend re-computes authoritative totals).
 */

export const INVOICE_TYPES = ['Product', 'Service', 'Subscription'] as const;
export const PLAN_TYPES = ['Monthly', 'Annual', 'One-Time', 'Add-on'] as const;
export const DISCOUNT_TYPES = ['Flat', 'Percentage'] as const;
export const TAX_TYPES = ['INTRA', 'INTER'] as const;
export const PAYMENT_MODES = [
  'Cash',
  'Bank Transfer',
  'UPI',
  'Card',
  'Razorpay',
  'Stripe',
] as const;

/** Hardcoded seller snapshot, identical to CreateInvoice.jsx's payload. */
export const COMPANY_DETAILS = {
  companyName: 'ReadyTech Solutions',
  website: 'www.readytechsolutions.com',
  email: 'quries.readytechsolutions@gmail.com',
  phone: '+91 7010797721',
  gstNumber: '29ABCDE1234F1Z5',
  panNumber: 'ABCDE1234F',
  address: '149 Hope College',
  city: 'Coimbatore',
  state: 'Tamil Nadu',
  pincode: '641004',
  country: 'India',
};

export interface InvoiceFormItem {
  description: string;
  hsnCode: string;
  planType: (typeof PLAN_TYPES)[number];
  users: number;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
}

/** Existing client (linked) vs. a one-off walk-in buyer typed by hand. */
export type ClientMode = 'existing' | 'walkin';

export interface InvoiceAddress {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

/**
 * Editable buyer snapshot. Auto-filled from the selected client but kept in
 * form state so it stays editable right up to save — the API already prefers
 * `billingDetails.*` over the linked client's own fields.
 */
export interface BillingDetailsState {
  companyName: string;
  contactPerson: string;
  gstNumber: string;
  panNumber: string;
  email: string;
  phone: string;
  billingAddress: InvoiceAddress;
  shippingAddress: InvoiceAddress;
}

export function emptyAddress(): InvoiceAddress {
  return {
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
  };
}

export function emptyBillingDetails(): BillingDetailsState {
  return {
    companyName: '',
    contactPerson: '',
    gstNumber: '',
    panNumber: '',
    email: '',
    phone: '',
    billingAddress: emptyAddress(),
    shippingAddress: emptyAddress(),
  };
}

/**
 * Maps a selected client onto the editable billing block. Address fallback
 * chains match the ones the web CreateInvoice page uses.
 */
export function billingFromClient(client: Client): BillingDetailsState {
  const b = (client.billingAddress ?? {}) as any;
  const s = (client.shippingAddress ?? {}) as any;

  const billingAddress: InvoiceAddress = {
    addressLine1: b.addressLine1 || b.address || (client as any).address || '',
    addressLine2: b.addressLine2 || '',
    city: b.city || '',
    state: b.state || '',
    pincode: b.pincode || '',
    country: b.country || 'India',
  };

  return {
    companyName: client.companyName || '',
    contactPerson: client.contactPerson || '',
    gstNumber: client.gstNumber || '',
    panNumber: client.panNumber || '',
    email: client.email || '',
    phone: client.phone || '',
    billingAddress,
    shippingAddress: {
      addressLine1:
        s.addressLine1 || s.address || s.street || billingAddress.addressLine1,
      addressLine2: s.addressLine2 || '',
      city: s.city || billingAddress.city,
      state: s.state || billingAddress.state,
      pincode: s.pincode || billingAddress.pincode,
      country: s.country || 'India',
    },
  };
}

export interface InvoiceFormState {
  clientMode: ClientMode;
  billing: BillingDetailsState;
  customer: string;
  invoiceType: (typeof INVOICE_TYPES)[number];
  orderNumber: string;
  purchaseDate: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  taxType: (typeof TAX_TYPES)[number];
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  discountType: (typeof DISCOUNT_TYPES)[number];
  discountValue: number;
  paymentMode: (typeof PAYMENT_MODES)[number];
  notes: string;
  termsAndConditions: string;
  items: InvoiceFormItem[];
}

export function createInvoiceState(): InvoiceFormState {
  const today = new Date().toISOString().split('T')[0];
  return {
    clientMode: 'existing',
    billing: emptyBillingDetails(),
    customer: '',
    invoiceType: 'Subscription',
    orderNumber: '',
    purchaseDate: today,
    issueDate: today,
    dueDate: today,
    currency: 'INR',
    taxType: 'INTRA',
    cgstRate: 9,
    sgstRate: 9,
    igstRate: 18,
    discountType: 'Percentage',
    discountValue: 0,
    paymentMode: 'UPI',
    notes: 'Thank you for your business.',
    termsAndConditions: 'Payment due within 15 days.',
    items: [
      {
        description: '',
        hsnCode: '',
        planType: 'Annual',
        users: 1,
        quantity: 1,
        unitPrice: 0,
        taxPercent: 18,
      },
    ],
  };
}

export function emptyItem(): InvoiceFormItem {
  return {
    description: '',
    hsnCode: '',
    planType: 'One-Time',
    users: 1,
    quantity: 1,
    unitPrice: 0,
    taxPercent: 18,
  };
}

/* ================= Live calculations (matches CreateInvoice useMemo) ================= */
export function computeInvoiceTotals(state: InvoiceFormState) {
  const subtotal = (state.items || []).reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0
  );

  const discountAmount =
    state.discountType === 'Percentage'
      ? (subtotal * Number(state.discountValue || 0)) / 100
      : Number(state.discountValue || 0);

  const safeDiscount = Math.min(discountAmount, subtotal);
  const taxableAmount = Math.max(subtotal - safeDiscount, 0);

  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  if (state.taxType === 'INTRA') {
    cgst = (taxableAmount * Number(state.cgstRate || 0)) / 100;
    sgst = (taxableAmount * Number(state.sgstRate || 0)) / 100;
  } else {
    igst = (taxableAmount * Number(state.igstRate || 0)) / 100;
  }

  const totalTax = cgst + sgst + igst;
  const grandTotal = taxableAmount + totalTax;
  const roundOff = Math.round(grandTotal) - grandTotal;
  const payable = grandTotal + roundOff;

  const n = (v: number) => Number(v.toFixed(2));
  return {
    subtotal: n(subtotal),
    discountAmount: n(safeDiscount),
    taxableAmount: n(taxableAmount),
    cgst: n(cgst),
    sgst: n(sgst),
    igst: n(igst),
    totalTax: n(totalTax),
    grandTotal: n(grandTotal),
    roundOff: n(roundOff),
    payable: n(payable),
  };
}

/* ================= Client-side validation (matches web toast checks) ================= */
export function validateInvoiceForm(
  state: InvoiceFormState,
  client: Client | undefined
): string | null {
  if (state.clientMode === 'existing') {
    if (!client) return 'Please select customer';
  } else if (!state.billing.companyName.trim()) {
    return 'Please enter the customer / company name';
  }

  if (!state.items || state.items.length === 0) return 'Please add invoice items';

  for (let i = 0; i < state.items.length; i++) {
    const item = state.items[i];
    if (!item.description || !item.description.trim())
      return `Item ${i + 1} description required`;
    if (!item.hsnCode) return `Item ${i + 1} HSN required`;
    if (Number(item.quantity) <= 0) return `Item ${i + 1} quantity invalid`;
  }

  if (!state.paymentMode) return 'Payment Mode Required';
  return null;
}

/* ================= Build the POST payload (matches web payload exactly) ================= */
export function buildInvoicePayload(
  state: InvoiceFormState,
  client: Client | undefined
) {
  // Snapshot comes from the (editable) form block, not the client record, so
  // any edits made after auto-fill are the ones that get saved.
  const billing = state.billing.billingAddress;
  const shipping = state.billing.shippingAddress;

  return {
    customer: client?._id ?? '',
    invoiceType: state.invoiceType || 'Subscription',
    orderNumber: state.orderNumber || '',
    purchaseDate: state.purchaseDate || new Date(),
    issueDate: state.issueDate || new Date(),
    dueDate: state.dueDate,
    currency: state.currency || 'INR',
    paymentMode: state.paymentMode,
    discountType: state.discountType || 'Flat',
    discountValue: Number(state.discountValue || 0),
    notes: state.notes || '',
    termsAndConditions: state.termsAndConditions || '',
    companyDetails: { ...COMPANY_DETAILS },
    billingDetails: {
      companyName: state.billing.companyName || '',
      contactPerson: state.billing.contactPerson || '',
      email: state.billing.email || '',
      phone: state.billing.phone || '',
      addressLine1: billing.addressLine1 || '',
      addressLine2: billing.addressLine2 || '',
      city: billing.city || '',
      state: billing.state || '',
      pincode: billing.pincode || '',
      country: billing.country || 'India',
      gstNumber: state.billing.gstNumber || '',
      panNumber: state.billing.panNumber || '',
    },
    shippingDetails: {
      companyName: state.billing.companyName || '',
      contactPerson: state.billing.contactPerson || '',
      phone: state.billing.phone || '',
      addressLine1: shipping.addressLine1 || billing.addressLine1 || '',
      addressLine2: shipping.addressLine2 || billing.addressLine2 || '',
      city: shipping.city || billing.city || '',
      state: shipping.state || billing.state || '',
      pincode: shipping.pincode || billing.pincode || '',
      country: shipping.country || billing.country || 'India',
    },
    items: state.items.map((item) => {
      const qty = Number(item.quantity || 1);
      const price = Number(item.unitPrice || 0);
      const taxable = qty * price;
      const tax = Number(item.taxPercent || 18);
      return {
        description: item.description,
        hsnCode: item.hsnCode,
        sacCode: '',
        planType: item.planType || 'One-Time',
        users: Number(item.users || 1),
        quantity: qty,
        unitPrice: price,
        taxableAmount: taxable,
        taxPercent: tax,
        taxAmount: (taxable * tax) / 100,
        total: taxable + (taxable * tax) / 100,
      };
    }),
  };
}
