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
 *   GET    /admin/users/:id  -> { success, user }
 */

/** Role options copied from the web <select> in the drawer's Access Control. */
export const USER_ROLES = ['admin', 'employee', 'client'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['Active', 'Inactive'] as const;

/* Enums copied from the web page — must stay in sync with Backend/models/User.js. */
export const DEPARTMENTS = [
  'Software Development',
  'UI/UX Design',
  'Digital Marketing',
  'Sales & Business Development',
  'BPO & Customer Support',
  'Human Resources',
  'Finance & Accounting',
  'Administration',
  'Quality Assurance',
  'Data & Analytics',
  'Project Management',
  'Operations',
  'Other',
] as const;

const DESIGNATIONS_BY_DEPARTMENT: Record<string, string[]> = {
  'Software Development': [
    'Software Developer',
    'Full Stack Developer',
    'MERN Stack Developer',
    'Frontend Developer',
    'Backend Developer',
    'React Developer',
    'Node.js Developer',
    'Mobile App Developer',
    'Software Engineer',
    'Technical Lead',
    'Tech Lead',
  ],
  'UI/UX Design': ['UI/UX Designer', 'UI Designer', 'UX Designer', 'Product Designer', 'Graphic Designer'],
  'Digital Marketing': [
    'Digital Marketing Executive',
    'Digital Marketing Manager',
    'SEO Executive',
    'SEO Specialist',
    'SEM Executive',
    'Social Media Executive',
    'Social Media Manager',
    'Content Marketing Executive',
    'Content Writer',
    'Marketing Executive',
  ],
  'Sales & Business Development': [
    'Sales Executive',
    'Sales Manager',
    'Business Development Executive',
    'Business Development Manager',
    'Relationship Manager',
    'Account Manager',
  ],
  'BPO & Customer Support': [
    'BPO Executive',
    'BPO Team Leader',
    'Customer Support Executive',
    'Customer Support Manager',
    'Telecaller',
    'Process Associate',
  ],
  'Human Resources': ['HR Executive', 'HR Manager', 'Recruiter', 'Talent Acquisition Executive'],
  'Finance & Accounting': ['Accountant', 'Finance Executive', 'Finance Manager'],
  'Quality Assurance': ['QA Tester', 'QA Engineer', 'QA Lead'],
  'Project Management': ['Project Manager', 'Project Coordinator', 'Scrum Master', 'Team Lead'],
  'Data & Analytics': ['Data Analyst', 'Data Entry Operator'],
  Administration: ['Office Administrator', 'Admin Executive'],
  Operations: ['Operations Executive', 'Operations Manager'],
  Other: [],
};

/** Always selectable regardless of department. */
const COMMON_DESIGNATIONS = ['Intern', 'Trainee', 'Manager', 'Senior Manager', 'General Manager', 'Director', 'Other'];

export const designationsFor = (department: string): string[] => [
  ...(DESIGNATIONS_BY_DEPARTMENT[department] || []),
  ...COMMON_DESIGNATIONS,
];
export type UserStatus = (typeof USER_STATUSES)[number];

/**
 * NativeWind class tokens copied from the web role badge ternary. "manager" is
 * kept because the web styles it, even though it isn't in the role <select>.
 */
export const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  client: 'bg-amber-100 text-amber-700',
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
  department?: string;
  designation?: string;
  employeeId?: string | null;
  joiningDate?: string | null;
  lastLogin?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Editable payload — field-for-field identical to the web `form` state. */
export interface UserInput {
  name: string;
  email: string;
  password: string;
  role: string;
  status: UserStatus;
  department: string;
  designation: string;
  company: string;
  employeeId: string;
  joiningDate: string;
  /** Optional password change on update (web `pwdForm`). */
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/** Matches the web `setForm({...})` reset inside openAdd(). */
export const emptyUser: UserInput = {
  name: '',
  email: '',
  password: '',
  role: 'employee',
  status: 'Active',
  department: '',
  designation: '',
  company: '',
  employeeId: '',
  joiningDate: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

/** Same envelopes the web fetchUsers() accepts. */
function asArray<T>(payload: any): T[] {
  const list = [payload, payload?.users, payload?.data, payload?.data?.users].find(Array.isArray);
  return (list ?? []) as T[];
}

export async function fetchUsers(): Promise<User[]> {
  const res = await API.get('/admin/users');
  return asArray<User>(res.data);
}

export async function fetchUser(id: string): Promise<User | null> {
  const { data } = await API.get(`/admin/users/${id}`);
  return (data?.user ?? null) as User | null;
}

/** True when any of the optional change-password fields is filled (web `wantsPasswordChange`). */
export const wantsPasswordChange = (input: UserInput) =>
  Boolean(input.currentPassword.trim() || input.newPassword.trim() || input.confirmPassword.trim());

/** Web saveUser() validation, in the same order with the same messages. */
export function validateUser(input: UserInput, isEdit: boolean): string | null {
  if (!input.name.trim()) return 'Name is required';
  if (!input.email.trim()) return 'Email is required';
  if (!isEdit && !input.password.trim()) return 'Password is required';
  if (!input.department) return 'Department is required';
  if (!input.designation) return 'Designation is required';

  if (isEdit && wantsPasswordChange(input)) {
    if (!input.currentPassword.trim()) return 'Current password is required to change the password';
    if (!input.newPassword.trim()) return 'New password is required';
    if (input.newPassword.trim() !== input.confirmPassword.trim())
      return 'New password and confirm password do not match';
    if (input.newPassword.trim().length < 6) return 'New password must be at least 6 characters';
  }
  return null;
}

/** Builds the request body exactly as the web saveUser() does. */
export function toPayload(input: UserInput, isEdit = false): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    role: input.role,
    department: input.department.trim(),
    designation: input.designation.trim(),
    company: input.company.trim() || null,
    employeeId: input.employeeId.trim() || null,
    joiningDate: input.joiningDate || null,
    isActive: input.status === 'Active',
  };

  // Password only when entered (blank on edit keeps the existing one).
  if (input.password.trim()) payload.password = input.password.trim();

  // Optional password change — the backend verifies the current password.
  if (isEdit && wantsPasswordChange(input)) {
    payload.currentPassword = input.currentPassword.trim();
    payload.password = input.newPassword.trim();
    payload.confirmPassword = input.confirmPassword.trim();
  }

  return payload;
}

/** The web treats a 2xx without `success: true` as a failure too. */
function ensureSuccess(data: any, fallback: string): User {
  if (!data?.success) throw new Error(data?.message || fallback);
  return data.user as User;
}

export async function createUser(input: UserInput): Promise<User> {
  const { data } = await API.post('/admin/users', toPayload(input));
  return ensureSuccess(data, 'User creation failed');
}

export async function updateUser(id: string, input: UserInput): Promise<User> {
  const { data } = await API.put(`/admin/users/${id}`, toPayload(input, true));
  return ensureSuccess(data, 'User update failed');
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
  // Thrown by ensureSuccess(): the API answered but reported failure.
  if (!error?.response && !error?.request) return error?.message || 'Failed to save user';

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
    status: u.isActive === false ? 'Inactive' : 'Active',
    department: u.department || '',
    designation: u.designation || '',
    company: u.company || '',
    employeeId: u.employeeId || '',
    joiningDate: u.joiningDate ? new Date(u.joiningDate).toISOString().split('T')[0] : '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
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
    const textMatch = [u.name, u.email, u.role, u.department, u.designation, u.company, u.employeeId]
      .filter(Boolean)
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
