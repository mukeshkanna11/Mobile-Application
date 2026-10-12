import API from '@/services/api';
import type { PickerOption } from '@/components/ui/SearchablePicker';
import type { Product } from '@/services/products';

/**
 * Purchase Orders data access — mirrors the web ERP module
 * (pages/Stcoks/PurchaseOrders.jsx) using ONLY the existing backend:
 *   GET  /purchase              -> PurchaseOrder[] (vendor + items.product populated with name)
 *   GET  /purchase/:id          -> PurchaseOrder (same population)
 *   POST /purchase              -> PurchaseOrder (unpopulated; poNumber assigned server-side)
 *   POST /purchase/:id/receive  -> { message, po } — body { warehouse } required;
 *                                  adds stock to the inventory ledger, DRAFT -> RECEIVED once.
 * There is no update/delete endpoint, so POs are create + receive only.
 */

export type POStatus = 'DRAFT' | 'RECEIVED';

type Ref = { _id: string; name?: string } | string | null | undefined;

export interface POItem {
  _id?: string;
  product: Ref;
  qty: number;
  cost: number;
}

export interface PurchaseOrder {
  _id: string;
  poNumber: string;
  vendor: Ref;
  items: POItem[];
  status: POStatus;
  createdAt?: string;
  updatedAt?: string;
}

/** Form line — strings for text inputs. */
export interface POFormItem {
  product: string;
  qty: string;
  cost: string;
}

export interface POInput {
  vendor: string;
  items: POFormItem[];
}

export const emptyPOItem: POFormItem = { product: '', qty: '1', cost: '' };
export const emptyPO: POInput = { vendor: '', items: [{ ...emptyPOItem }] };

export const refName = (r: Ref, fallback = '—') =>
  (r && typeof r === 'object' ? r.name : undefined) || fallback;

export const lineTotal = (i: { qty: unknown; cost: unknown }) =>
  (Number(i.qty) || 0) * (Number(i.cost) || 0);

export const poTotal = (po: { items?: { qty: unknown; cost: unknown }[] }) =>
  (po.items || []).reduce((s, i) => s + lineTotal(i), 0);

export const STATUS_LABEL: Record<POStatus, string> = { DRAFT: 'Draft', RECEIVED: 'Received' };

function asArray<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.data)) return payload.data as T[];
  return [];
}

export async function fetchPurchaseOrders(): Promise<PurchaseOrder[]> {
  const { data } = await API.get('/purchase');
  return asArray<PurchaseOrder>(data);
}

export async function fetchPurchaseOrder(id: string): Promise<PurchaseOrder> {
  const { data } = await API.get(`/purchase/${id}`);
  return data as PurchaseOrder;
}

/** Validation + payload match the web savePO(). */
export function validatePO(input: POInput): string | null {
  if (!input.vendor) return 'Vendor is required';
  const items = input.items.filter((i) => i.product);
  if (!items.length) return 'Add at least one product';
  if (items.some((i) => !(Number(i.qty) > 0))) return 'Quantity must be greater than 0';
  if (items.some((i) => Number(i.cost) < 0)) return 'Cost cannot be negative';
  return null;
}

export async function createPurchaseOrder(input: POInput): Promise<PurchaseOrder> {
  const payload = {
    vendor: input.vendor,
    items: input.items
      .filter((i) => i.product)
      .map((i) => ({ product: i.product, qty: Number(i.qty), cost: Number(i.cost) || 0 })),
  };
  const { data } = await API.post('/purchase', payload);
  return data as PurchaseOrder;
}

export async function receivePurchaseOrder(id: string, warehouse: string): Promise<void> {
  await API.post(`/purchase/${id}/receive`, { warehouse });
}

/** Web default: cost falls back to the product's purchase price, then price. */
export const defaultCost = (p?: Product & { purchasePrice?: number }) =>
  Number(p?.purchasePrice ?? p?.price ?? 0);

export function productOptions(rows: Product[]): PickerOption[] {
  return rows.map((p) => ({
    label: p.name,
    sublabel: [p.sku, p.price != null ? `₹${p.price}` : ''].filter(Boolean).join(' · ') || undefined,
    value: p._id,
  }));
}

export const STATUS_FILTER_OPTIONS = ['All', 'Draft', 'Received'] as const;

export interface POFilters {
  search: string;
  status: (typeof STATUS_FILTER_OPTIONS)[number];
}

/** Search PO number, vendor and product names. */
export function filterPurchaseOrders(rows: PurchaseOrder[], f: POFilters): PurchaseOrder[] {
  const q = f.search.toLowerCase().trim();
  return rows.filter((po) => {
    const matchesSearch =
      !q ||
      po.poNumber?.toLowerCase().includes(q) ||
      refName(po.vendor, '').toLowerCase().includes(q) ||
      po.items?.some((i) => refName(i.product, '').toLowerCase().includes(q));
    const matchesStatus = f.status === 'All' || STATUS_LABEL[po.status] === f.status;
    return Boolean(matchesSearch) && matchesStatus;
  });
}

/** KPI stats (same formulas as the web page). */
export function purchaseOrderStats(rows: PurchaseOrder[]) {
  const total = rows.length;
  const draft = rows.filter((o) => o.status === 'DRAFT').length;
  const received = rows.filter((o) => o.status === 'RECEIVED').length;
  const totalValue = rows.reduce((s, o) => s + poTotal(o), 0);
  const avgValue = total > 0 ? Math.round(totalValue / total) : 0;
  return { total, draft, received, totalValue, avgValue };
}
