import API from '@/services/api';

/**
 * Products data access — mirrors the web Products module (pages/Products.jsx)
 * EXACTLY. The `/products` endpoint returns every product (no server-side
 * pagination/search), so search, filters and pagination are done client-side,
 * identical to the web page.
 *
 *   GET    /products      -> { data: Product[] } | Product[]
 *   GET    /products/:id  -> { data: Product } | Product
 *   POST   /products      -> create
 *   PUT    /products/:id  -> update
 *   DELETE /products/:id  -> delete
 *
 * NOTE: the web/backend have no image upload API, so no picker/upload is wired.
 * An `image`/`imageUrl` is rendered if a product happens to carry one.
 */

export type ProductStatus = 'Active' | 'Inactive';

export interface Product {
  _id: string;
  name: string;
  sku?: string;
  category?: string;
  price: number;
  tax?: number;
  stock?: number;
  status?: string;
  description?: string;
  image?: string;
  imageUrl?: string;
  createdAt?: string;
}

/** Editable payload — fields match the web emptyForm (all strings for inputs). */
export interface ProductInput {
  name: string;
  sku: string;
  category: string;
  price: string;
  tax: string;
  stock: string;
  status: ProductStatus;
  description: string;
}

export const emptyProduct: ProductInput = {
  name: '',
  sku: '',
  category: '',
  price: '',
  tax: '',
  stock: '',
  status: 'Active',
  description: '',
};

function asArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const data = (payload as { data?: unknown })?.data;
  return Array.isArray(data) ? (data as T[]) : [];
}

/** Coerce the web string form into the numeric payload (matches saveProduct). */
function toPayload(input: ProductInput) {
  return {
    ...input,
    price: Number(input.price) || 0,
    stock: Number(input.stock) || 0,
    tax: Number(input.tax) || 0,
  };
}

export async function fetchProducts(): Promise<Product[]> {
  const res = await API.get('/products');
  // Web maps a default status of "Active" onto every product.
  return asArray<Product>(res.data).map((p) => ({
    ...p,
    status: p.status || 'Active',
  }));
}

export async function fetchProduct(id: string): Promise<Product> {
  const { data } = await API.get(`/products/${id}`);
  const product = (data?.data ?? data) as Product;
  return { ...product, status: product.status || 'Active' };
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const { data } = await API.post('/products', toPayload(input));
  return (data?.data ?? data) as Product;
}

export async function updateProduct(
  id: string,
  input: ProductInput
): Promise<Product> {
  const { data } = await API.put(`/products/${id}`, toPayload(input));
  return (data?.data ?? data) as Product;
}

export async function deleteProduct(id: string): Promise<void> {
  await API.delete(`/products/${id}`);
}

export function toProductInput(p: Product): ProductInput {
  return {
    name: p.name ?? '',
    sku: p.sku ?? '',
    category: p.category ?? '',
    price: p.price !== undefined && p.price !== null ? String(p.price) : '',
    tax: p.tax !== undefined && p.tax !== null ? String(p.tax) : '',
    stock: p.stock !== undefined && p.stock !== null ? String(p.stock) : '',
    status: (p.status as ProductStatus) || 'Active',
    description: p.description ?? '',
  };
}

/* ================= Stock helpers (Low stock threshold = 5, per web) ================= */
export type StockLevel = 'In Stock' | 'Low Stock' | 'Out of Stock';

export function stockLevel(stock?: number): StockLevel {
  const n = Number(stock) || 0;
  if (n <= 0) return 'Out of Stock';
  if (n <= 5) return 'Low Stock';
  return 'In Stock';
}

export interface ProductFilters {
  search: string;
  category: 'All' | string;
  status: 'All' | string;
  stock: 'All' | StockLevel;
}

/** Search matches the web filter (name + sku + category); extra filters added. */
export function filterProducts(
  products: Product[],
  f: ProductFilters
): Product[] {
  const q = f.search.trim().toLowerCase();
  return products
    .filter((p) =>
      `${p.name ?? ''} ${p.sku ?? ''} ${p.category ?? ''}`
        .toLowerCase()
        .includes(q)
    )
    .filter((p) => (f.category === 'All' ? true : p.category === f.category))
    .filter((p) => (f.status === 'All' ? true : (p.status || 'Active') === f.status))
    .filter((p) => (f.stock === 'All' ? true : stockLevel(p.stock) === f.stock));
}

/** KPI insights (identical formulas to the web page). */
export function productStats(products: Product[]) {
  const total = products.length;
  const active = products.filter((p) => (p.status || 'Active') === 'Active').length;
  const lowStock = products.filter((p) => (Number(p.stock) || 0) <= 5).length;
  const inventoryValue = products.reduce(
    (sum, p) => sum + (Number(p.price) || 0) * (Number(p.stock) || 0),
    0
  );
  return { total, active, lowStock, inventoryValue };
}
