import API from '@/services/api';
import { API_URL } from '@/constants/config';
import { getItem, StorageKeys } from '@/services/storage';

/**
 * Invoice data access — mirrors the web Invoice module EXACTLY
 * (InvoiceList.jsx / ViewInvoice.jsx / CreateInvoice.jsx). All totals are
 * computed by the backend on create; the client-side helpers here reproduce the
 * web's preview/list math verbatim.
 *
 *   GET    /invoices              -> { data: Invoice[] } | Invoice[]
 *   GET    /invoices/:id?view=1   -> { data: Invoice }
 *   POST   /invoices              -> create (backend validates + computes)
 *   PUT    /invoices/:id/status   -> { paymentStatus } | { status }
 *   POST   /invoices/:id/send     -> mark Sent
 *   GET    /invoices/:id/pdf      -> streamed PDF (auth required)
 *   DELETE /invoices/:id          -> delete
 *
 * NOTE: the backend exposes NO full-update route (no PUT /invoices/:id), and
 * the web has no edit screen — so invoices are create/view/delete only.
 */

export interface InvoiceItem {
  product?: string | null;
  description: string;
  hsnCode?: string;
  sacCode?: string;
  planType?: 'Monthly' | 'Annual' | 'One-Time' | 'Add-on';
  users?: number;
  quantity: number;
  unitPrice: number;
  taxableAmount?: number;
  taxPercent?: number;
  taxAmount?: number;
  total?: number;
}

export interface Invoice {
  _id: string;
  invoiceNumber?: string;
  orderNumber?: string;
  invoiceType?: 'Product' | 'Service' | 'Subscription';
  customer?: any;
  companyDetails?: Record<string, any>;
  billingDetails?: Record<string, any>;
  shippingDetails?: Record<string, any>;
  customerName?: string;
  orderDate?: string;
  issueDate?: string;
  dueDate?: string;
  paymentDate?: string;
  placeOfSupply?: string;
  items?: InvoiceItem[];
  currency?: string;
  subtotal?: number;
  taxableAmount?: number;
  discountType?: 'Flat' | 'Percentage';
  discountValue?: number;
  discountAmount?: number;
  taxType?: 'INTRA' | 'INTER';
  cgstPercent?: number;
  cgstAmount?: number;
  sgstPercent?: number;
  sgstAmount?: number;
  igstPercent?: number;
  igstAmount?: number;
  totalTax?: number;
  roundOff?: number;
  grandTotal?: number;
  amountPaid?: number;
  balanceDue?: number;
  balance?: number;
  tdsAmount?: number;
  tcsAmount?: number;
  paymentStatus?: string;
  paymentMode?: string;
  paymentReference?: string;
  transactionId?: string;
  status?: string;
  statusHistory?: { status?: string; note?: string; at?: string }[];
  paymentHistory?: {
    amount?: number;
    mode?: string;
    reference?: string;
    transactionId?: string;
    date?: string;
  }[];
  notes?: string;
  termsAndConditions?: string;
  createdAt?: string;
}

/** Computed display status used by the web list (Paid / Overdue / Pending). */
export type ComputedStatus = 'Paid' | 'Overdue' | 'Pending';

function safeArray<T>(payload: unknown): T[] {
  const data = (payload as { data?: unknown })?.data ?? payload;
  return Array.isArray(data) ? (data as T[]) : [];
}

/* ================= web getComputedStatus ================= */
export function getComputedStatus(invoice: Partial<Invoice> = {}): ComputedStatus {
  const status = String(invoice?.status || '').toLowerCase();
  if (status === 'paid') return 'Paid';
  const dueDate = invoice?.dueDate;
  if (dueDate && new Date(dueDate).getTime() < Date.now()) return 'Overdue';
  return 'Pending';
}

/* ================= web calculateTotals (list view) ================= */
export function calculateTotals(invoice: Partial<Invoice> = {}) {
  const items = Array.isArray(invoice?.items) ? invoice.items : [];
  let subtotal = 0;
  let totalTax = 0;

  items.forEach((item) => {
    const qty = Number(item?.quantity || 0);
    const price = Number(item?.unitPrice ?? (item as any)?.rate ?? 0);
    const taxPercent = Number(item?.taxPercent || 0);
    const base = qty * price;
    const tax = (base * taxPercent) / 100;
    subtotal += base;
    totalTax += tax;
  });

  const discount = Number(invoice?.discountAmount || 0);
  const tds = Number(invoice?.tdsAmount || 0);
  const tcs = Number(invoice?.tcsAmount || 0);
  const grandTotal = subtotal + totalTax - discount - tds + tcs;
  const computedStatus = getComputedStatus(invoice);
  const balance =
    computedStatus === 'Paid' ? 0 : Number(invoice?.balance ?? grandTotal);

  return { subtotal, totalTax, discount, tds, tcs, grandTotal, balance, computedStatus };
}

export function formatCurrency(amount: unknown): string {
  const val = Number(amount);
  return Number.isFinite(val) ? val.toFixed(2) : '0.00';
}

export function money(x: unknown): string {
  return `₹ ${Number(x || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* ================= CRUD ================= */
export async function fetchInvoices(): Promise<Invoice[]> {
  const res = await API.get('/invoices');
  return safeArray<Invoice>(res.data);
}

export async function fetchInvoice(id: string, markView = true): Promise<Invoice> {
  const { data } = await API.get(`/invoices/${id}${markView ? '?view=1' : ''}`);
  return (data?.data ?? data) as Invoice;
}

export async function createInvoice(payload: Record<string, any>): Promise<Invoice> {
  const { data } = await API.post('/invoices', payload);
  return (data?.data ?? data) as Invoice;
}

export async function deleteInvoice(id: string): Promise<void> {
  await API.delete(`/invoices/${id}`);
}

/** Legacy status update used by the web list (Mark Paid / Overdue). */
export async function updateInvoiceStatus(
  id: string,
  paymentStatus: string
): Promise<Invoice> {
  const { data } = await API.put(`/invoices/${id}/status`, { paymentStatus });
  return (data?.data ?? data) as Invoice;
}

export async function sendInvoiceEmail(
  id: string,
  email?: string
): Promise<{ message?: string; data?: Invoice }> {
  const { data } = await API.post(`/invoices/${id}/send`, email ? { email } : {});
  return data;
}

/** Absolute URL + bearer token for authenticated PDF download. */
export async function getPdfRequest(
  id: string
): Promise<{ url: string; headers: Record<string, string> }> {
  const token = await getItem(StorageKeys.token);
  return {
    url: `${API_URL}/invoices/${id}/pdf`,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  };
}
