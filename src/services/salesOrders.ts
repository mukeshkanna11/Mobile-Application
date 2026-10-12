import API from '@/services/api';
import type { PickerOption } from '@/components/ui/SearchablePicker';
import type { Client } from '@/services/clients';
import type { Product } from '@/services/products';

/**
 * Sales Orders data access — mirrors the web ERP module
 * (pages/Stcoks/SalesOrders.jsx) using the existing backend:
 *   GET    /sales               -> { success, count, salesOrders }
 *   GET    /sales/:id           -> { success, salesOrder }
 *   POST   /sales               -> { success, message, salesOrder }  body { customer, items[{product,qty,price}], notes }
 *   PUT    /sales/:id           -> { success, message, salesOrder }  DRAFT only
 *   DELETE /sales/:id           -> { success, message }              DRAFT or CANCELLED only
 *   POST   /sales/:id/approve   -> body { warehouse? }  DRAFT -> APPROVED (reserves stock when warehouse given)
 *   POST   /sales/:id/deliver   -> body { warehouse }   APPROVED -> DELIVERED (warehouse only if none reserved)
 *   POST   /sales/:id/cancel    -> DRAFT/APPROVED -> CANCELLED (releases reservation)
 * customer is populated with companyName/contactPerson/email/phone; items.product with name/sku/price;
 * warehouse is returned as an id.
 */

export type SOStatus = 'DRAFT' | 'APPROVED' | 'DELIVERED' | 'CANCELLED';

type ProductRef = { _id: string; name?: string; sku?: string; price?: number } | string | null;
type CustomerRef =
  | { _id: string; companyName?: string; contactPerson?: string; email?: string; phone?: string }
  | string
  | null;
type UserRef = { _id: string; name?: string; email?: string } | string | null | undefined;

export interface SOItem {
  product: ProductRef;
  qty: number;
  price: number;
  lineTotal?: number;
}

export interface SalesOrder {
  _id: string;
  soNumber: string;
  customer: CustomerRef;
  warehouse?: string | { _id: string } | null;
  items: SOItem[];
  totalAmount?: number;
  status: SOStatus;
  notes?: string;
  createdBy?: UserRef;
  approvedBy?: UserRef;
  deliveredBy?: UserRef;
  approvedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Form line — strings for text inputs. */
export interface SOFormItem {
  product: string;
  qty: string;
  price: string;
}

export interface SOInput {
  customer: string;
  notes: string;
  items: SOFormItem[];
}

export const emptySOItem: SOFormItem = { product: '', qty: '1', price: '' };
export const emptySO: SOInput = { customer: '', notes: '', items: [{ ...emptySOItem }] };

export const STATUS_LABEL: Record<SOStatus, string> = {
  DRAFT: 'Draft',
  APPROVED: 'Approved',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export const STATUS_STYLE: Record<SOStatus, { bg: string; text: string; dot: string }> = {
  DRAFT: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  APPROVED: { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  DELIVERED: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  CANCELLED: { bg: 'bg-slate-200', text: 'text-slate-600', dot: 'bg-slate-400' },
};

const idOf = (r: { _id: string } | string | null | undefined) =>
  (r && typeof r === 'object' ? r._id : r) || '';

export const customerName = (c: CustomerRef, fallback = 'Unknown customer') =>
  (c && typeof c === 'object' ? c.companyName || c.contactPerson : undefined) || fallback;

export const productName = (p: ProductRef, fallback = 'Deleted product') =>
  (p && typeof p === 'object' ? p.name : undefined) || fallback;

export const userName = (u: UserRef) => (u && typeof u === 'object' ? u.name : undefined);

export const reservedWarehouseId = (so: SalesOrder) => idOf(so.warehouse);

export const lineTotal = (i: { qty: unknown; price: unknown }) =>
  (Number(i.qty) || 0) * (Number(i.price) || 0);

/** Web revenue formula: sum of qty × price. */
export const soTotal = (so: { items?: { qty: unknown; price: unknown }[] }) =>
  (so.items || []).reduce((s, i) => s + lineTotal(i), 0);

/** Status-based action visibility — mirrors the backend guards. */
export const canEdit = (s: SOStatus) => s === 'DRAFT';
export const canDelete = (s: SOStatus) => s === 'DRAFT' || s === 'CANCELLED';
export const canApprove = (s: SOStatus) => s === 'DRAFT';
export const canDeliver = (s: SOStatus) => s === 'APPROVED';
export const canCancel = (s: SOStatus) => s === 'DRAFT' || s === 'APPROVED';

const listOf = (d: any): SalesOrder[] =>
  Array.isArray(d?.salesOrders) ? d.salesOrders : Array.isArray(d) ? d : [];
const oneOf = (d: any): SalesOrder => (d?.salesOrder ?? d) as SalesOrder;

function toPayload(input: SOInput) {
  return {
    customer: input.customer,
    notes: input.notes.trim(),
    items: input.items
      .filter((i) => i.product)
      .map((i) => ({ product: i.product, qty: Number(i.qty), price: Number(i.price) || 0 })),
  };
}

export async function fetchSalesOrders(): Promise<SalesOrder[]> {
  const { data } = await API.get('/sales');
  return listOf(data);
}

export async function fetchSalesOrder(id: string): Promise<SalesOrder> {
  const { data } = await API.get(`/sales/${id}`);
  return oneOf(data);
}

export async function createSalesOrder(input: SOInput): Promise<SalesOrder> {
  const { data } = await API.post('/sales', toPayload(input));
  return oneOf(data);
}

export async function updateSalesOrder(id: string, input: SOInput): Promise<SalesOrder> {
  const { data } = await API.put(`/sales/${id}`, toPayload(input));
  return oneOf(data);
}

export async function deleteSalesOrder(id: string): Promise<void> {
  await API.delete(`/sales/${id}`);
}

/** Warehouse is optional; when given, stock is reserved there. */
export async function approveSalesOrder(id: string, warehouse?: string): Promise<void> {
  await API.post(`/sales/${id}/approve`, warehouse ? { warehouse } : {});
}

/** Warehouse is only needed when none was reserved at approval. */
export async function deliverSalesOrder(id: string, warehouse?: string): Promise<void> {
  await API.post(`/sales/${id}/deliver`, warehouse ? { warehouse } : {});
}

export async function cancelSalesOrder(id: string): Promise<void> {
  await API.post(`/sales/${id}/cancel`);
}

export function toSOInput(so: SalesOrder): SOInput {
  return {
    customer: idOf(so.customer),
    notes: so.notes ?? '',
    items: so.items.length
      ? so.items.map((i) => ({
          product: idOf(i.product),
          qty: String(i.qty ?? 1),
          price: String(i.price ?? 0),
        }))
      : [{ ...emptySOItem }],
  };
}

/**
 * Web savePO rules plus backend constraints: qty ≥ 1, price ≥ 0, and no
 * duplicate products (backend create rejects repeated product ids as invalid).
 */
export function validateSO(input: SOInput): string | null {
  if (!input.customer) return 'Customer is required';
  const items = input.items.filter((i) => i.product);
  if (!items.length) return 'Add at least one product';
  if (items.some((i) => !(Number(i.qty) >= 1))) return 'Quantity must be at least 1';
  if (items.some((i) => Number(i.price) < 0)) return 'Price cannot be negative';
  if (new Set(items.map((i) => i.product)).size !== items.length)
    return 'Each product can only be added once';
  return null;
}

/** Web default: unit price falls back to the product price. */
export const defaultPrice = (p?: Product & { sellingPrice?: number }) =>
  Number(p?.price ?? p?.sellingPrice ?? 0);

export function clientOptions(rows: Client[]): PickerOption[] {
  return rows.map((c) => ({
    value: c._id,
    label: c.companyName || c.contactPerson || 'Unnamed',
    sublabel: c.email || c.phone,
  }));
}

export const STATUS_FILTER_OPTIONS = ['All', 'Draft', 'Approved', 'Delivered', 'Cancelled'] as const;

export interface SOFilters {
  search: string;
  status: (typeof STATUS_FILTER_OPTIONS)[number];
}

/** Web searches SO number + customer; mobile also matches product names. */
export function filterSalesOrders(rows: SalesOrder[], f: SOFilters): SalesOrder[] {
  const q = f.search.toLowerCase().trim();
  return rows.filter((so) => {
    const matchesSearch =
      !q ||
      so.soNumber?.toLowerCase().includes(q) ||
      customerName(so.customer, '').toLowerCase().includes(q) ||
      so.items?.some((i) => productName(i.product, '').toLowerCase().includes(q));
    const matchesStatus = f.status === 'All' || STATUS_LABEL[so.status] === f.status;
    return Boolean(matchesSearch) && matchesStatus;
  });
}

/** KPI stats — web cards, computed on the real backend statuses. */
export function salesOrderStats(rows: SalesOrder[]) {
  const count = (s: SOStatus) => rows.filter((o) => o.status === s).length;
  const live = rows.filter((o) => o.status !== 'CANCELLED');
  const revenue = live.reduce((s, o) => s + soTotal(o), 0);
  return {
    total: rows.length,
    draft: count('DRAFT'),
    approved: count('APPROVED'),
    delivered: count('DELIVERED'),
    cancelled: count('CANCELLED'),
    revenue,
    avgOrder: live.length ? Math.round(revenue / live.length) : 0,
    customers: new Set(rows.map((o) => idOf(o.customer)).filter(Boolean)).size,
  };
}
