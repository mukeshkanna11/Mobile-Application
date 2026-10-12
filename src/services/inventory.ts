import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import type { PickerOption } from '@/components/ui/SearchablePicker';
import { API_URL } from '@/constants/config';
import API from '@/services/api';
import { fetchProducts, isForbidden, type Product } from '@/services/products';
import { fetchWarehouses, warehousePickerOptions } from '@/services/warehouses';
import { getItem, StorageKeys } from '@/services/storage';

/**
 * Inventory data access — mirrors the web ERP Inventory module
 * (pages/Stcoks/Inventory.jsx) EXACTLY, reusing the existing backend:
 *   GET  /inventory/summary        -> { data: StockRow[] }  (aggregated ledger)
 *   POST /inventory/stock-in       -> { product, warehouse, quantity }
 *   POST /inventory/stock-out      -> { product, warehouse, quantity }
 *   GET  /inventory/export?type=inventory&format=csv|pdf  (auth, streamed file)
 *
 * All stock calculations are ported verbatim from the web helpers.
 */

export type StockStatus = 'out' | 'low' | 'ok';

/** NativeWind tokens per stock status (matches web STOCK_STATUS). */
export const STOCK_STATUS: Record<
  StockStatus,
  { label: string; badgeBg: string; badgeText: string; text: string; bar: string }
> = {
  out: {
    label: 'Out of Stock',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-700',
    text: 'text-red-600',
    bar: 'bg-red-500',
  },
  low: {
    label: 'Low Stock',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
    text: 'text-amber-600',
    bar: 'bg-amber-500',
  },
  ok: {
    label: 'In Stock',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    text: 'text-emerald-600',
    bar: 'bg-emerald-500',
  },
};

export interface StockRow {
  _id?: string;
  product?: {
    _id?: string;
    name?: string;
    sku?: string;
    price?: number;
    lowStockLimit?: number;
  };
  warehouse?: { _id?: string; name?: string };
  inQty?: number;
  outQty?: number;
  onHand?: number;
  reserved?: number;
  available?: number;
  lowStockLimit?: number;
  lastTransaction?: { type?: string; qty?: number };
}

/* ================= Stock calculation helpers (verbatim from web) ================= */
export const limitOf = (s: StockRow): number =>
  s.lowStockLimit ?? s.product?.lowStockLimit ?? 10;

export const statusOf = (qty: number, limit: number): StockStatus =>
  qty <= 0 ? 'out' : qty <= limit ? 'low' : 'ok';

export const onHandOf = (s: StockRow): number => s.onHand ?? s.available ?? 0;
export const reservedOf = (s: StockRow): number => s.reserved ?? 0;
export const availableOf = (s: StockRow): number =>
  s.available ?? onHandOf(s) - reservedOf(s);

function asArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const data = (payload as { data?: unknown })?.data;
  return Array.isArray(data) ? (data as T[]) : [];
}

export async function fetchInventory(): Promise<StockRow[]> {
  const res = await API.get('/inventory/summary');
  return asArray<StockRow>(res.data);
}

export interface StockMovementPayload {
  product: string;
  warehouse: string;
  quantity: number;
}

export async function stockIn(payload: StockMovementPayload): Promise<void> {
  await API.post('/inventory/stock-in', payload);
}

export async function stockOut(payload: StockMovementPayload): Promise<void> {
  await API.post('/inventory/stock-out', payload);
}

/** Auth-download the backend inventory report and open the native share sheet. */
export async function exportInventory(format: 'csv' | 'pdf'): Promise<void> {
  const token = await getItem(StorageKeys.token);
  const url = `${API_URL}/inventory/export?type=inventory&format=${format}`;
  const target = `${FileSystem.cacheDirectory}inventory-report.${format}`;
  const { uri, status } = await FileSystem.downloadAsync(url, target, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (status < 200 || status >= 300) throw new Error(`Export failed (${status})`);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: format === 'pdf' ? 'application/pdf' : 'text/csv',
      dialogTitle: 'Inventory Report',
    });
  }
}

/* ================= Filters (verbatim from web filteredStocks) ================= */
export const STATUS_FILTER_OPTIONS = [
  'All',
  'In Stock',
  'Low Stock',
  'Out of Stock',
] as const;

const LABEL_TO_STATUS: Record<string, StockStatus> = {
  'In Stock': 'ok',
  'Low Stock': 'low',
  'Out of Stock': 'out',
};

export interface InventoryFilters {
  search: string;
  warehouse: string; // 'All' | warehouse name
  status: string; // one of STATUS_FILTER_OPTIONS
}

export function warehouseOptions(rows: StockRow[]): string[] {
  return [
    'All',
    ...Array.from(new Set(rows.map((s) => s.warehouse?.name).filter(Boolean))),
  ] as string[];
}

export function filterInventory(rows: StockRow[], f: InventoryFilters): StockRow[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter((s) => {
    const matchesSearch =
      !q ||
      s.product?.name?.toLowerCase().includes(q) ||
      s.product?.sku?.toLowerCase().includes(q) ||
      s.warehouse?.name?.toLowerCase().includes(q);
    const matchesWarehouse =
      f.warehouse === 'All' || s.warehouse?.name === f.warehouse;
    const matchesStatus =
      f.status === 'All' ||
      statusOf(availableOf(s), limitOf(s)) === LABEL_TO_STATUS[f.status];
    return Boolean(matchesSearch) && matchesWarehouse && matchesStatus;
  });
}

/* ================= KPI stats (verbatim formulas) ================= */
export function inventoryStats(rows: StockRow[]) {
  const totalProducts = rows.length;
  const totalStockQty = rows.reduce((sum, s) => sum + onHandOf(s), 0);
  const lowStock = rows.filter((s) => {
    const q = availableOf(s);
    return q > 0 && q <= limitOf(s);
  }).length;
  const outOfStock = rows.filter((s) => availableOf(s) <= 0).length;
  const warehouses = new Set(
    rows.map((s) => s.warehouse?._id || s.warehouse?.name)
  ).size;
  const inventoryValue = rows.reduce(
    (sum, s) => sum + (s.product?.price || 0) * onHandOf(s),
    0
  );
  return { totalProducts, totalStockQty, lowStock, outOfStock, warehouses, inventoryValue };
}

export function formatMoney(x: unknown): string {
  return `₹${Number(x || 0).toLocaleString('en-IN')}`;
}

/* ================= Stock Adjustment & Warehouse Transfer =================
 * Mirrors web pages/Stcoks/StockAdjustment.jsx and WarehouseTransfer.jsx:
 *   POST /inventory/adjust    { product, warehouse, delta (±, non-zero), reason (required) }
 *   POST /inventory/transfer  { product, fromWarehouse, toWarehouse, quantity (> 0), reason }
 * Client checks use `available` (onHand − reserved) like the web, which is
 * stricter than the backend's on-hand check so reserved stock is not moved.
 */

export interface StockFormData {
  products: PickerOption[];
  warehouses: PickerOption[];
  summary: StockRow[];
  /** /products is admin-only; non-admins only see products already in stock. */
  productsRestricted: boolean;
}

/** Products, active warehouses and the stock summary for the two ERP forms. */
export async function loadStockFormData(): Promise<StockFormData> {
  const [summary, warehouses, productsRes] = await Promise.all([
    fetchInventory(),
    fetchWarehouses(),
    fetchProducts().then(
      (p) => ({ ok: true as const, p }),
      (err) => {
        if (!isForbidden(err)) throw err;
        return { ok: false as const, p: [] as Product[] };
      }
    ),
  ]);
  const products: PickerOption[] = productsRes.ok
    ? productsRes.p.map((p) => ({ label: p.name, sublabel: p.sku || undefined, value: p._id }))
    : [...new Map(
        summary
          .filter((s) => s.product?._id)
          .map((s) => [s.product!._id!, { label: s.product!.name ?? 'Product', sublabel: s.product!.sku || undefined, value: s.product!._id! }])
      ).values()];
  return {
    products,
    warehouses: warehousePickerOptions(warehouses),
    summary,
    productsRestricted: !productsRes.ok,
  };
}

/** Web `available` lookup: null until both are chosen; 0 when no ledger row exists. */
export function availableFor(rows: StockRow[], product: string, warehouse: string): number | null {
  if (!product || !warehouse) return null;
  const row = rows.find((s) => s.product?._id === product && s.warehouse?._id === warehouse);
  return row ? (row.available ?? 0) : 0;
}

export type AdjustDirection = 'Increase' | 'Decrease';

export interface AdjustInput {
  product: string;
  warehouse: string;
  direction: AdjustDirection;
  quantity: string;
  reason: string;
}

export function validateAdjust(f: AdjustInput, available: number | null): string | null {
  const qty = Number(f.quantity);
  if (!f.product || !f.warehouse) return 'Select product and warehouse';
  if (!Number.isFinite(qty) || qty <= 0) return 'Enter a valid quantity';
  if (!f.reason.trim()) return 'A reason is required';
  if (f.direction === 'Decrease' && available !== null && qty > available)
    return `Cannot decrease more than available (${available})`;
  return null;
}

export async function adjustStock(f: AdjustInput): Promise<void> {
  const qty = Number(f.quantity);
  await API.post('/inventory/adjust', {
    product: f.product,
    warehouse: f.warehouse,
    delta: f.direction === 'Increase' ? qty : -qty,
    reason: f.reason.trim(),
  });
}

export interface TransferInput {
  product: string;
  fromWarehouse: string;
  toWarehouse: string;
  quantity: string;
  reason: string;
}

export function validateTransfer(f: TransferInput, available: number | null): string | null {
  const qty = Number(f.quantity);
  if (!f.product || !f.fromWarehouse || !f.toWarehouse) return 'Select product and both warehouses';
  if (f.fromWarehouse === f.toWarehouse) return 'Source and destination must differ';
  if (!Number.isFinite(qty) || qty <= 0) return 'Enter a valid quantity';
  if (available !== null && qty > available) return `Cannot transfer more than available (${available})`;
  return null;
}

export async function transferStock(f: TransferInput): Promise<void> {
  await API.post('/inventory/transfer', {
    product: f.product,
    fromWarehouse: f.fromWarehouse,
    toWarehouse: f.toWarehouse,
    quantity: Number(f.quantity),
    reason: f.reason.trim(),
  });
}

/* ================= AI Inventory Insight =================
 * Web InventoryAIAssistant / aiService.getInventoryInsight:
 *   POST /ai/inventory-insight { type, inventory: StockRow[] (non-empty) }
 *     -> { success, type, label, insight, model, generatedAt }
 */
export const INVENTORY_AI_FEATURES = [
  { type: 'insights', label: 'Inventory Insights', description: 'Overall stock health overview', icon: 'bar-chart-2' },
  { type: 'lowstock', label: 'Low Stock Analysis', description: 'Stockout risks & urgent items', icon: 'alert-triangle' },
  { type: 'overstock', label: 'Overstock Analysis', description: 'Excess stock & holding cost', icon: 'layers' },
  { type: 'restock', label: 'Restock Recommendations', description: 'Reorder plan & priorities', icon: 'refresh-cw' },
] as const;

export type InventoryInsightType = (typeof INVENTORY_AI_FEATURES)[number]['type'];

export async function getInventoryInsight(
  type: InventoryInsightType,
  inventory: StockRow[]
): Promise<{ insight: string; model?: string }> {
  const { data } = await API.post('/ai/inventory-insight', { type, inventory });
  if (!data?.success) throw new Error(data?.message || 'Request failed');
  return data;
}
