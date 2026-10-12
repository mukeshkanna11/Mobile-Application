import API from '@/services/api';

/**
 * Warehouses data access — mirrors the web ERP module
 * (pages/Stcoks/Warehouses.jsx) EXACTLY, reusing the existing backend:
 *   GET    /warehouses       -> { warehouses: Warehouse[] }
 *   GET    /warehouses/:id   -> { warehouse: Warehouse }
 *   POST   /warehouses       -> create (name required; unique name/code)
 *   PUT    /warehouses/:id   -> update
 *   DELETE /warehouses/:id   -> delete
 */

export type WarehouseStatus = 'Active' | 'Inactive';

export interface Warehouse {
  _id: string;
  name: string;
  code?: string;
  location?: string;
  manager?: string;
  status?: WarehouseStatus;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  capacity?: number;
  currentStock?: number;
  isPrimary?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Editable payload — field set matches the web INITIAL_FORM. */
export interface WarehouseInput {
  name: string;
  code: string;
  location: string;
  manager: string;
  status: WarehouseStatus;
  description: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  capacity: string;
  currentStock: string;
  isPrimary: boolean;
}

export const emptyWarehouse: WarehouseInput = {
  name: '',
  code: '',
  location: '',
  manager: '',
  status: 'Active',
  description: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  country: 'India',
  pincode: '',
  capacity: '',
  currentStock: '',
  isPrimary: false,
};

function asArray<T>(payload: any): T[] {
  if (Array.isArray(payload?.warehouses)) return payload.warehouses as T[];
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.data)) return payload.data as T[];
  return [];
}

function oneOf(payload: any): Warehouse {
  return (payload?.warehouse ?? payload?.data ?? payload) as Warehouse;
}

/** Coerce the string form into the numeric payload (matches web add/update). */
function toPayload(input: WarehouseInput) {
  return {
    ...input,
    capacity: Number(input.capacity) || 0,
    currentStock: Number(input.currentStock) || 0,
  };
}

export async function fetchWarehouses(): Promise<Warehouse[]> {
  const { data } = await API.get('/warehouses');
  return asArray<Warehouse>(data);
}

export async function fetchWarehouse(id: string): Promise<Warehouse> {
  const { data } = await API.get(`/warehouses/${id}`);
  return oneOf(data);
}

export async function createWarehouse(input: WarehouseInput): Promise<Warehouse> {
  const { data } = await API.post('/warehouses', toPayload(input));
  return oneOf(data);
}

export async function updateWarehouse(
  id: string,
  input: WarehouseInput
): Promise<Warehouse> {
  const { data } = await API.put(`/warehouses/${id}`, toPayload(input));
  return oneOf(data);
}

export async function deleteWarehouse(id: string): Promise<void> {
  await API.delete(`/warehouses/${id}`);
}

export function toWarehouseInput(w: Warehouse): WarehouseInput {
  return {
    ...emptyWarehouse,
    name: w.name ?? '',
    code: w.code ?? '',
    location: w.location ?? '',
    manager: w.manager ?? '',
    status: (w.status as WarehouseStatus) ?? 'Active',
    description: w.description ?? '',
    phone: w.phone ?? '',
    email: w.email ?? '',
    address: w.address ?? '',
    city: w.city ?? '',
    state: w.state ?? '',
    country: w.country ?? 'India',
    pincode: w.pincode ?? '',
    capacity: String(Number(w.capacity || 0)),
    currentStock: String(Number(w.currentStock || 0)),
    isPrimary: Boolean(w.isPrimary),
  };
}

/** Client-side validation (mirrors backend: name required). */
export function validateWarehouse(input: WarehouseInput): string | null {
  if (!input.name.trim()) return 'Warehouse name is required';
  return null;
}

export const STATUS_FILTER_OPTIONS = ['All', 'Active', 'Inactive'] as const;

export interface WarehouseFilters {
  search: string;
  status: 'All' | WarehouseStatus;
}

/** Search matches the web filtered() fields; status filter added for mobile UX. */
export function filterWarehouses(rows: Warehouse[], f: WarehouseFilters): Warehouse[] {
  const q = f.search.toLowerCase().trim();
  return rows.filter((w) => {
    const matchesSearch =
      !q ||
      w.name?.toLowerCase().includes(q) ||
      w.code?.toLowerCase().includes(q) ||
      w.location?.toLowerCase().includes(q) ||
      w.manager?.toLowerCase().includes(q) ||
      w.city?.toLowerCase().includes(q) ||
      w.state?.toLowerCase().includes(q);
    const matchesStatus =
      f.status === 'All' || (w.status || 'Active') === f.status;
    return Boolean(matchesSearch) && matchesStatus;
  });
}

/** KPI stats (verbatim formulas from the web page). */
export function warehouseStats(rows: Warehouse[]) {
  const total = rows.length;
  const active = rows.filter((w) => w.status === 'Active').length;
  const inactive = rows.filter((w) => w.status === 'Inactive').length;
  const totalCapacity = rows.reduce((sum, w) => sum + Number(w.capacity || 0), 0);
  const totalCurrentStock = rows.reduce(
    (sum, w) => sum + Number(w.currentStock || 0),
    0
  );
  const primary = rows.filter((w) => w.isPrimary).length;
  return { total, active, inactive, totalCapacity, totalCurrentStock, primary };
}

/** Active warehouses as SearchablePicker options (PO receive / SO approve & deliver). */
export function warehousePickerOptions(rows: Warehouse[]) {
  return rows
    .filter((w) => (w.status || 'Active') === 'Active')
    .map((w) => ({
      label: w.name,
      sublabel: [w.code, w.location || w.city].filter(Boolean).join(' · ') || undefined,
      value: w._id,
    }));
}

/** Default pick: the primary active warehouse, else the first active one. */
export function defaultWarehouseId(rows: Warehouse[]): string {
  const active = rows.filter((w) => (w.status || 'Active') === 'Active');
  return (active.find((w) => w.isPrimary) ?? active[0])?._id ?? '';
}
