import API from '@/services/api';

/**
 * Dashboard data access. Reuses the existing backend endpoints:
 *   GET /clients            -> Client[]                (bare array)
 *   GET /products           -> { data: Product[] }
 *   GET /inventory          -> { data: Inventory[] }
 *   GET /invoices           -> { data: Invoice[] }
 *   GET /activities?limit=n -> { data: Activity[] }
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

export interface DashboardData {
  clients: number;
  products: number;
  inventory: number;
  invoices: number;
  revenue: number;
  activities: Activity[];
}

/** Safely coerce the various backend envelopes into a list. */
function asArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const data = (payload as { data?: unknown })?.data;
  return Array.isArray(data) ? (data as T[]) : [];
}

export async function fetchDashboard(): Promise<DashboardData> {
  const [clientsRes, productsRes, inventoryRes, invoicesRes, activitiesRes] =
    await Promise.allSettled([
      API.get('/clients'),
      API.get('/products'),
      API.get('/inventory'),
      API.get('/invoices'),
      API.get('/activities', { params: { limit: 6 } }),
    ]);

  const clients =
    clientsRes.status === 'fulfilled' ? asArray(clientsRes.value.data) : [];
  const products =
    productsRes.status === 'fulfilled' ? asArray(productsRes.value.data) : [];
  const inventory =
    inventoryRes.status === 'fulfilled'
      ? asArray(inventoryRes.value.data)
      : [];
  const invoices =
    invoicesRes.status === 'fulfilled'
      ? asArray<Invoice>(invoicesRes.value.data)
      : [];
  const activities =
    activitiesRes.status === 'fulfilled'
      ? asArray<Activity>(activitiesRes.value.data)
      : [];

  const revenue = invoices.reduce(
    (sum, inv) => sum + (Number(inv.amountPaid) || 0),
    0
  );

  return {
    clients: clients.length,
    products: products.length,
    inventory: inventory.length,
    invoices: invoices.length,
    revenue,
    activities,
  };
}
