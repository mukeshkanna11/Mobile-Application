import API from '@/services/api';

/**
 * Executive dashboard data. Mirrors the web DashboardPage exactly:
 *   Core ERP (failure -> error state):  /products, /sales, /purchase, /inventory/summary
 *   CRM (degrade to [] if unavailable): /leads, /clients, /opportunities, /activities
 * All metrics are derived client-side with the same rules as the web page.
 */

export interface Invoice {
  _id: string;
  invoiceNumber?: string;
  grandTotal?: number;
  amountPaid?: number;
  balanceDue?: number;
  status?: string;
  customer?: { companyName?: string; contactPerson?: string } | string;
}

export interface Activity {
  _id: string;
  type?: string;
  notes?: string;
  done?: boolean;
  createdAt?: string;
  assignedTo?: { name?: string; email?: string };
}

type Ref = { _id?: string; name?: string; lowStockLimit?: number } | string | null | undefined;

interface OrderItem {
  product?: Ref;
  name?: string;
  qty?: number;
  price?: number;
  cost?: number;
}

export interface SalesOrder {
  _id: string;
  soNumber?: string;
  status?: string;
  totalAmount?: number;
  items?: OrderItem[];
  customer?: { name?: string };
  client?: { companyName?: string };
  createdAt?: string;
}

interface PurchaseOrder {
  status?: string;
  totalAmount?: number;
  items?: OrderItem[];
}

interface InventoryRow {
  product?: Ref;
  warehouse?: { _id?: string; name?: string };
  available?: number;
  inQty?: number;
  outQty?: number;
  lowStockLimit?: number;
}

interface Named {
  _id: string;
  name?: string;
  status?: string;
  stage?: string;
  value?: number;
  source?: string;
  createdAt?: string;
}

export const LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Closed'] as const;

export interface FeedItem {
  id: string;
  type?: string;
  title: string;
  desc: string;
  time?: string;
}

export interface DashboardData {
  syncedAt: Date;
  // Revenue
  totalRevenue: number;
  monthlyAvg: number;
  wonRevenue: number;
  purchaseSpend: number;
  salesTrend: { key: string; month: string; revenue: number; orders: number }[];
  // Sales
  salesOrders: number;
  delivered: number;
  approved: number;
  recentSales: (SalesOrder & { amount: number })[];
  // CRM
  leads: number;
  qualifiedLeads: number;
  clients: number;
  activeClients: number;
  openOpps: number;
  pipelineValue: number;
  leadStatusData: { name: string; value: number }[];
  // ERP / Inventory
  products: number;
  warehouses: number;
  inventoryItems: number;
  stockChart: { name: string; qty: number; limit: number }[];
  totalUnits: number;
  lowStock: number;
  outOfStock: number;
  healthScore: number;
  lowStockRows: { name: string; warehouse: string; qty: number; limit: number }[];
  // Purchase
  purchaseOrders: number;
  pendingPO: number;
  completedPO: number;
  // Rankings + feed
  topProducts: { name: string; units: number; revenue: number }[];
  topCustomers: { name: string; revenue: number; orders: number }[];
  recentActivities: FeedItem[];
}

/** Tolerates bare arrays, { data }, and other list envelopes (same as web safeFetch). */
function asArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const data = (payload as { data?: unknown }).data;
    if (Array.isArray(data)) return data as T[];
    return (Object.values(payload).find(Array.isArray) as T[]) ?? [];
  }
  return [];
}

const get = async <T>(url: string): Promise<T[]> => asArray<T>((await API.get(url)).data);
const byDateDesc = (a: { createdAt?: string }, b: { createdAt?: string }) =>
  new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();

export async function fetchDashboard(): Promise<DashboardData> {
  const [products, sales, purchases, inventory] = await Promise.all([
    get<Named>('/products'),
    get<SalesOrder>('/sales'),
    get<PurchaseOrder>('/purchase'),
    get<InventoryRow>('/inventory/summary'),
  ]);

  const [leads, clients, opportunities, activities] = await Promise.all([
    get<Named>('/leads').catch(() => []),
    get<Named>('/clients').catch(() => []),
    get<Named>('/opportunities?limit=1000').catch(() => []),
    get<Activity>('/activities?limit=1000').catch(() => []),
  ]);

  const orderAmount = (so: SalesOrder) =>
    typeof so.totalAmount === 'number' && so.totalAmount > 0
      ? so.totalAmount
      : (so.items || []).reduce((s, i) => s + (i.qty || 0) * (i.price || 0), 0);

  const productName = (ref: Ref): string | null => {
    if (!ref) return null;
    if (typeof ref === 'object') return ref.name || null;
    return products.find((x) => x._id === ref)?.name || null;
  };

  /* Revenue + monthly trend */
  const totalRevenue = sales.reduce((s, so) => s + orderAmount(so), 0);
  const trendMap: Record<string, DashboardData['salesTrend'][number]> = {};
  sales.forEach((so) => {
    if (!so.createdAt) return;
    const dt = new Date(so.createdAt);
    const key = `${dt.getFullYear()}-${String(dt.getMonth()).padStart(2, '0')}`;
    trendMap[key] ??= {
      key,
      month: dt.toLocaleString('default', { month: 'short' }),
      revenue: 0,
      orders: 0,
    };
    trendMap[key].revenue += orderAmount(so);
    trendMap[key].orders += 1;
  });
  const salesTrend = Object.values(trendMap).sort((a, b) => a.key.localeCompare(b.key));
  const monthlyAvg = salesTrend.length ? Math.round(totalRevenue / salesTrend.length) : 0;

  /* Inventory */
  const qtyOf = (i: InventoryRow) => i.available ?? (i.inQty || 0) - (i.outQty || 0);
  const limitOf = (i: InventoryRow) =>
    i.lowStockLimit ??
    (typeof i.product === 'object' ? i.product?.lowStockLimit : undefined) ??
    10;
  const stockChart = inventory
    .map((i) => ({ name: productName(i.product) || 'Unknown', qty: qtyOf(i), limit: limitOf(i) }))
    .filter((s) => s.name !== 'Unknown');
  const lowStock = stockChart.filter((s) => s.qty > 0 && s.qty <= s.limit).length;
  const outOfStock = stockChart.filter((s) => s.qty <= 0).length;
  const healthScore = stockChart.length
    ? Math.max(0, 100 - Math.round(((lowStock + outOfStock) / stockChart.length) * 100))
    : 100;
  const warehouses = new Set(
    inventory.map((i) => i.warehouse?._id || i.warehouse?.name).filter(Boolean)
  ).size;
  const lowStockRows = inventory
    .map((i) => ({
      name: productName(i.product) || 'Unknown',
      warehouse: i.warehouse?.name || '—',
      qty: qtyOf(i),
      limit: limitOf(i),
    }))
    .filter((r) => r.name !== 'Unknown' && r.qty <= r.limit)
    .sort((a, b) => a.qty - b.qty)
    .slice(0, 6);

  /* CRM */
  const openOpps = opportunities.filter((o) => o.stage !== 'Closed Won' && o.stage !== 'Closed Lost');
  const wonRevenue = opportunities
    .filter((o) => o.stage === 'Closed Won')
    .reduce((s, o) => s + (o.value || 0), 0);

  /* Purchase */
  const poAmount = (p: PurchaseOrder) =>
    typeof p.totalAmount === 'number' && p.totalAmount > 0
      ? p.totalAmount
      : (p.items || []).reduce((s, i) => s + (i.qty || 0) * (i.cost || 0), 0);

  /* Top products / customers */
  const productAgg: Record<string, { name: string; units: number; revenue: number }> = {};
  sales.forEach((so) =>
    (so.items || []).forEach((i) => {
      const name = productName(i.product) || i.name;
      if (!name) return;
      productAgg[name] ??= { name, units: 0, revenue: 0 };
      productAgg[name].units += i.qty || 0;
      productAgg[name].revenue += (i.qty || 0) * (i.price || 0);
    })
  );
  const customerAgg: Record<string, { name: string; revenue: number; orders: number }> = {};
  sales.forEach((so) => {
    const name = so.customer?.name || so.client?.companyName || 'Unknown';
    customerAgg[name] ??= { name, revenue: 0, orders: 0 };
    customerAgg[name].revenue += orderAmount(so);
    customerAgg[name].orders += 1;
  });

  /* Recent activity (fallback to newest leads) */
  const recentActivities: FeedItem[] = activities.length
    ? activities.slice().sort(byDateDesc).slice(0, 6).map((a) => ({
        id: a._id,
        type: a.type,
        title: a.type || 'Activity',
        desc: a.notes || 'No notes',
        time: a.createdAt,
      }))
    : leads.slice().sort(byDateDesc).slice(0, 6).map((l) => ({
        id: l._id,
        type: 'Lead',
        title: 'New Lead',
        desc: `${l.name || 'Unknown'}${l.source ? ` · ${l.source}` : ''}`,
        time: l.createdAt,
      }));

  return {
    syncedAt: new Date(),
    totalRevenue,
    monthlyAvg,
    wonRevenue,
    purchaseSpend: purchases.reduce((s, p) => s + poAmount(p), 0),
    salesTrend,
    salesOrders: sales.length,
    delivered: sales.filter((o) => o.status === 'DELIVERED').length,
    approved: sales.filter((o) => o.status === 'APPROVED').length,
    recentSales: sales.slice().sort(byDateDesc).slice(0, 5).map((so) => ({ ...so, amount: orderAmount(so) })),
    leads: leads.length,
    qualifiedLeads: leads.filter((l) => l.status === 'Qualified').length,
    clients: clients.length,
    activeClients: clients.filter((c) => c.status === 'Active').length,
    openOpps: openOpps.length,
    pipelineValue: openOpps.reduce((s, o) => s + (o.value || 0), 0),
    leadStatusData: LEAD_STATUSES.map((st) => ({
      name: st,
      value: leads.filter((l) => l.status === st).length,
    })).filter((d) => d.value > 0),
    products: products.length,
    warehouses,
    inventoryItems: stockChart.length,
    stockChart,
    totalUnits: stockChart.reduce((s, x) => s + x.qty, 0),
    lowStock,
    outOfStock,
    healthScore,
    lowStockRows,
    purchaseOrders: purchases.length,
    pendingPO: purchases.filter((p) => p.status !== 'RECEIVED').length,
    completedPO: purchases.filter((p) => p.status === 'RECEIVED').length,
    topProducts: Object.values(productAgg).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    topCustomers: Object.values(customerAgg)
      .filter((c) => c.name !== 'Unknown')
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5),
    recentActivities,
  };
}
