import API from '@/services/api';

/**
 * Users / Access Management data access — mirrors the web module
 * (Frontend/src/pages/Users.jsx) EXACTLY.
 *
 * The web page fetches every user once and performs search + role/status
 * filtering client-side, so this service does the same to keep 100%
 * business-logic parity. Endpoints and payloads are reused verbatim:
 *   GET    /admin/users      -> User[]            (bare array)
 *   POST   /admin/users      -> { user: User }    (password required)
 *   PUT    /admin/users/:id  -> { user: User }    (password optional)
 *   DELETE /admin/users/:id  -> { success }
 *
 * NOTE: the backend exposes no GET /admin/users/:id, so `fetchUser` reads the
 * collection and picks the record — same data, no new endpoint.
 */

/** Role options copied from the web <select> in the drawer's Access Control. */
export const USER_ROLES = ['admin', 'employee', 'client'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['Active', 'Inactive'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/**
 * NativeWind class tokens copied from the web role badge ternary. "manager" is
 * kept because the web styles it, even though it isn't in the role <select>.
 */
export const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
};

export const ROLE_STYLE_FALLBACK = 'bg-slate-100 text-slate-700';

export function roleStyle(role?: string): string {
  return ROLE_STYLES[role ?? ''] ?? ROLE_STYLE_FALLBACK;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
  company?: string | null;
  lastLogin?: string | null;
  createdAt?: string;
  updatedAt?: string;
  /**
   * Sent by the web form and echoed back when present. Not in the Mongoose
   * schema, so these are currently dropped server-side — see notes in the
   * module README/handover.
   */
  department?: string;
  phone?: string;
}

/** Editable payload — field-for-field identical to the web `form` state. */
export interface UserInput {
  name: string;
  email: string;
  password: string;
  role: string;
  status: UserStatus;
  department: string;
  phone: string;
}

/** Matches the web `setForm({...})` reset inside openAdd(). */
export const emptyUser: UserInput = {
  name: '',
  email: '',
  password: '',
  role: 'employee',
  status: 'Active',
  department: '',
  phone: '',
};

function asArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const data = (payload as { data?: unknown })?.data;
  return Array.isArray(data) ? (data as T[]) : [];
}

export async function fetchUsers(): Promise<User[]> {
  const res = await API.get('/admin/users');
  return asArray<User>(res.data);
}

export async function fetchUser(id: string): Promise<User | null> {
  const users = await fetchUsers();
  return users.find((u) => u._id === id) ?? null;
}

/**
 * Builds the request body exactly as the web saveUser() does: the six base
 * fields always, `password` only when the field is non-empty (so editing
 * without typing a password keeps the existing one).
 */
export function toPayload(input: UserInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: input.name,
    email: input.email,
    role: input.role,
    status: input.status,
    department: input.department,
    phone: input.phone,
  };

  if (input.password) {
    payload.password = input.password;
  }

  return payload;
}

export async function createUser(input: UserInput): Promise<User> {
  const { data } = await API.post('/admin/users', toPayload(input));
  return (data?.user ?? data?.data ?? data) as User;
}

export async function updateUser(id: string, input: UserInput): Promise<User> {
  const { data } = await API.put(`/admin/users/${id}`, toPayload(input));
  return (data?.user ?? data?.data ?? data) as User;
}

export async function deleteUser(id: string): Promise<void> {
  await API.delete(`/admin/users/${id}`);
}

/**
 * Turns an Axios failure into the most specific message the API gave us, so a
 * save error never shows as a bare generic string. Handles, in order:
 * transport failures, Mongoose field-validation maps, `message`/`error` bodies,
 * and finally the raw HTTP status.
 */
export function userErrorMessage(error: any): string {
  // No `response` means the request never reached the API at all.
  if (!error?.response) {
    return `Cannot reach the server (${error?.message ?? 'network error'})`;
  }

  const { status, data } = error.response;

  // Mongoose ValidationError shape: { errors: { field: { message } } }
  const fieldErrors = data?.errors
    ? Object.values(data.errors)
        .map((e: any) => (typeof e === 'string' ? e : e?.message))
        .filter(Boolean)
    : [];
  if (fieldErrors.length) return fieldErrors.join('\n');

  const message = data?.message ?? data?.error;
  if (message) {
    // Flag 5xx so a server crash isn't mistaken for a validation problem.
    return status >= 500 ? `${message} (server error ${status})` : String(message);
  }

  return `Request failed with status ${status}`;
}

/** Build an editable payload from a fetched user (matches web openEdit). */
export function toUserInput(u: User): UserInput {
  return {
    name: u.name || '',
    email: u.email || '',
    password: '',
    role: u.role || 'employee',
    status: u.isActive ? 'Active' : 'Inactive',
    department: u.department || '',
    phone: u.phone || '',
  };
}

export interface UserFilters {
  search: string;
  role: 'All' | string;
  status: 'All' | UserStatus;
}

/** Client-side search + role/status filters (identical to web `filtered`). */
export function filterUsers(users: User[], f: UserFilters): User[] {
  const q = f.search.toLowerCase();

  return users.filter((u) => {
    const textMatch = [u.name, u.email, u.role]
      .join(' ')
      .toLowerCase()
      .includes(q);

    const roleMatch =
      f.role === 'All' || String(u.role).toLowerCase() === f.role.toLowerCase();

    const statusMatch =
      f.status === 'All' || (u.isActive ? 'Active' : 'Inactive') === f.status;

    return textMatch && roleMatch && statusMatch;
  });
}

/** Header metrics — identical formulas to the web `metrics` useMemo. */
export function userMetrics(users: User[]) {
  const total = users.length;
  const active = users.filter((u) => u.isActive !== false).length;
  const admins = users.filter(
    (u) => String(u.role).toLowerCase() === 'admin'
  ).length;
  return { total, active, admins };
}

/** Same en-IN date formatting + "—" fallback as the web formatDate. */
export function formatDate(date?: string | null): string {
  if (!date) return '—';
  const d = new Date(date);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN');
}
