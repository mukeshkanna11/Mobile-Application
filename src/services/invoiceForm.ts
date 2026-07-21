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

export interface InvoiceFormState {
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
  if (!client) return 'Please select customer';
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
export function buildInvoicePayload(state: InvoiceFormState, client: Client) {
  const billing = {
    addressLine1:
      client.billingAddress?.addressLine1 ||
      (client.billingAddress as any)?.address ||
      (client as any).address ||
      '',
    addressLine2: client.billingAddress?.addressLine2 || '',
    city: client.billingAddress?.city || '',
    state: client.billingAddress?.state || '',
    pincode: client.billingAddress?.pincode || '',
    country: client.billingAddress?.country || 'India',
  };

  const shipping = {
    addressLine1:
      client.shippingAddress?.addressLine1 ||
      (client.shippingAddress as any)?.address ||
      (client.shippingAddress as any)?.street ||
      '',
    addressLine2: client.shippingAddress?.addressLine2 || '',
    city: client.shippingAddress?.city || '',
    state: client.shippingAddress?.state || '',
    pincode: client.shippingAddress?.pincode || '',
    country: client.shippingAddress?.country || 'India',
  };

  return {
    customer: client._id,
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
      companyName: client.companyName || '',
      contactPerson: client.contactPerson || '',
      email: client.email || '',
      phone: client.phone || '',
      addressLine1: billing.addressLine1 || '',
      addressLine2: billing.addressLine2 || '',
      city: billing.city || '',
      state: billing.state || '',
      pincode: billing.pincode || '',
      country: billing.country || 'India',
      gstNumber: client.gstNumber || '',
      panNumber: client.panNumber || '',
    },
    shippingDetails: {
      companyName: client.companyName || '',
      contactPerson: client.contactPerson || '',
      phone: client.phone || '',
      addressLine1: shipping.addressLine1 || billing.addressLine1 || '',
      city: shipping.city || billing.city || '',
      state: shipping.state || billing.state || '',
      pincode: shipping.pincode || billing.pincode || '',
      country: 'India',
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
