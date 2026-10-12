import API from '@/services/api';
import type { PickerOption } from '@/components/ui/SearchablePicker';

/**
 * Vendors data access — mirrors the web ERP module
 * (pages/Stcoks/Vendors.jsx), reusing the existing backend:
 *   GET    /vendors       -> Vendor[] (plain array)
 *   POST   /vendors       -> Vendor
 *   PUT    /vendors/:id   -> Vendor
 *   DELETE /vendors/:id   -> { message }
 * There is NO GET /vendors/:id, so single-vendor reads come from an in-memory
 * cache populated by the list call (refetching the list on a cache miss).
 */

export interface Vendor {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Editable payload — matches the backend Vendor model fields. */
export interface VendorInput {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export const emptyVendor: VendorInput = { name: '', email: '', phone: '', address: '' };

const cache = new Map<string, Vendor>();

function asArray<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.vendors)) return payload.vendors as T[];
  if (Array.isArray(payload?.data)) return payload.data as T[];
  return [];
}

function remember(v: Vendor): Vendor {
  if (v?._id) cache.set(v._id, v);
  return v;
}

function toPayload(input: VendorInput) {
  return {
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    address: input.address.trim(),
  };
}

export async function fetchVendors(): Promise<Vendor[]> {
  const { data } = await API.get('/vendors');
  const rows = asArray<Vendor>(data);
  cache.clear();
  rows.forEach(remember);
  return rows;
}

export function getCachedVendor(id: string): Vendor | undefined {
  return cache.get(id);
}

/** Cached read; refetches the list on a miss or when `force` is set. */
export async function fetchVendor(id: string, force = false): Promise<Vendor> {
  if (!force && cache.has(id)) return cache.get(id)!;
  const rows = await fetchVendors();
  const v = rows.find((r) => r._id === id);
  if (!v) throw new Error('Vendor not found');
  return v;
}

export async function createVendor(input: VendorInput): Promise<Vendor> {
  const { data } = await API.post('/vendors', toPayload(input));
  return remember(data as Vendor);
}

export async function updateVendor(id: string, input: VendorInput): Promise<Vendor> {
  const { data } = await API.put(`/vendors/${id}`, toPayload(input));
  return remember(data as Vendor);
}

export async function deleteVendor(id: string): Promise<void> {
  await API.delete(`/vendors/${id}`);
  cache.delete(id);
}

export function toVendorInput(v: Vendor): VendorInput {
  return {
    name: v.name ?? '',
    email: v.email ?? '',
    phone: v.phone ?? '',
    address: v.address ?? '',
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9\s-]{7,15}$/;

/** Name required (web + backend); email/phone format checked only when given. */
export function validateVendor(input: VendorInput): string | null {
  if (!input.name.trim()) return 'Vendor name required';
  if (input.email.trim() && !EMAIL_RE.test(input.email.trim())) return 'Enter a valid email';
  if (input.phone.trim() && !PHONE_RE.test(input.phone.trim())) return 'Enter a valid phone number';
  return null;
}

/** Web semantics: a vendor with a phone is "Active", otherwise "Pending" setup. */
export type VendorStatus = 'Active' | 'Pending';
export const vendorStatus = (v: Vendor): VendorStatus => (v.phone ? 'Active' : 'Pending');

export const STATUS_FILTER_OPTIONS = ['All', 'Active', 'Pending'] as const;

export interface VendorFilters {
  search: string;
  status: (typeof STATUS_FILTER_OPTIONS)[number];
}

/** Web searches by name; mobile also matches email/phone/address. */
export function filterVendors(rows: Vendor[], f: VendorFilters): Vendor[] {
  const q = f.search.toLowerCase().trim();
  return rows.filter((v) => {
    const matchesSearch =
      !q ||
      [v.name, v.email, v.phone, v.address].some((s) => s?.toLowerCase().includes(q));
    const matchesStatus = f.status === 'All' || vendorStatus(v) === f.status;
    return matchesSearch && matchesStatus;
  });
}

/** KPI stats (same formulas as the web page). */
export function vendorStats(rows: Vendor[]) {
  const total = rows.length;
  const active = rows.filter((v) => v.phone).length;
  const withEmail = rows.filter((v) => v.email).length;
  return { total, active, pending: total - active, withEmail };
}

/** Options for SearchablePicker (e.g. Purchase Order vendor selection). */
export function vendorOptions(rows: Vendor[]): PickerOption[] {
  return rows.map((v) => ({
    label: v.name,
    sublabel: v.phone || v.email || undefined,
    value: v._id,
  }));
}
