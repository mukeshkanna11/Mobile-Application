import API from '@/services/api';

/**
 * Clients data access. Reuses the existing backend EXACTLY as the web app does:
 *   GET    /clients      -> Client[]  (bare array OR { data })
 *   GET    /clients/:id  -> Client
 *   POST   /clients      -> create
 *   PUT    /clients/:id  -> update
 *   DELETE /clients/:id  -> delete
 *
 * The backend has no server-side search/pagination, so both are done
 * client-side (mirroring Clients.jsx).
 */

export interface Address {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

export type ClientStatus = 'Active' | 'Inactive';
export type ClientType = 'Customer' | 'Prospect' | 'Partner' | 'Lead';

export interface Client {
  _id: string;
  companyName: string;
  contactPerson: string;
  email?: string;
  phone?: string;
  website?: string;
  gstNumber?: string;
  panNumber?: string;
  billingAddress?: Address;
  shippingAddress?: Address;
  clientType?: ClientType;
  status?: ClientStatus;
  currentPlan?: string;
  subscriptionStatus?: 'Trial' | 'Active' | 'Expired' | 'Cancelled';
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Editable fields (matches the web drawer's `emptyForm`). */
export interface ClientInput {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  website: string;
  gstNumber: string;
  panNumber: string;
  clientType: ClientType;
  status: ClientStatus;
  currentPlan: string;
  subscriptionStatus: NonNullable<Client['subscriptionStatus']>;
  notes: string;
  billingAddress: Address;
  shippingAddress: Address;
}

export const emptyClient: ClientInput = {
  companyName: '',
  contactPerson: '',
  email: '',
  phone: '',
  website: '',
  gstNumber: '',
  panNumber: '',
  clientType: 'Customer',
  status: 'Active',
  currentPlan: '',
  subscriptionStatus: 'Active',
  notes: '',
  billingAddress: {
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
  },
  shippingAddress: { country: 'India' },
};

/** Some list endpoints wrap in { data }, others return a bare array. */
function asArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const data = (payload as { data?: unknown })?.data;
  return Array.isArray(data) ? (data as T[]) : [];
}

export async function fetchClients(): Promise<Client[]> {
  const { data } = await API.get('/clients');
  return asArray<Client>(data);
}

export async function fetchClient(id: string): Promise<Client> {
  const { data } = await API.get(`/clients/${id}`);
  return (data?.data ?? data) as Client;
}

export async function createClient(input: ClientInput): Promise<Client> {
  const { data } = await API.post('/clients', input);
  return (data?.data ?? data) as Client;
}

export async function updateClient(
  id: string,
  input: ClientInput
): Promise<Client> {
  // Strip server-managed fields before PUT (mirrors the web cleanup).
  const { data } = await API.put(`/clients/${id}`, input);
  return (data?.data ?? data) as Client;
}

export async function deleteClient(id: string): Promise<void> {
  await API.delete(`/clients/${id}`);
}

/** Build a ClientInput from an existing client (for the edit form). */
export function toClientInput(c: Client): ClientInput {
  return {
    companyName: c.companyName ?? '',
    contactPerson: c.contactPerson ?? '',
    email: c.email ?? '',
    phone: c.phone ?? '',
    website: c.website ?? '',
    gstNumber: c.gstNumber ?? '',
    panNumber: c.panNumber ?? '',
    clientType: c.clientType ?? 'Customer',
    status: c.status ?? 'Active',
    currentPlan: c.currentPlan ?? '',
    subscriptionStatus: c.subscriptionStatus ?? 'Active',
    notes: c.notes ?? '',
    billingAddress: { ...emptyClient.billingAddress, ...c.billingAddress },
    shippingAddress: { ...emptyClient.shippingAddress, ...c.shippingAddress },
  };
}

export interface ClientFilters {
  search: string;
  status: 'All' | ClientStatus;
  type: 'All' | ClientType;
}

/** Client-side search + status/type filters (mirrors filteredClients). */
export function filterClients(
  clients: Client[],
  { search, status, type }: ClientFilters
): Client[] {
  const q = search.trim().toLowerCase();
  return clients.filter((c) => {
    const matchesSearch =
      !q ||
      `${c.companyName ?? ''} ${c.contactPerson ?? ''} ${c.email ?? ''} ${c.phone ?? ''}`
        .toLowerCase()
        .includes(q);
    const matchesStatus = status === 'All' || c.status === status;
    const matchesType = type === 'All' || c.clientType === type;
    return matchesSearch && matchesStatus && matchesType;
  });
}
