import type { Product } from "@/lib/products";
import { getProductImageUrl } from "@/src/lib/appwrite";

export type ProductDocument = {
  id: string;
  title_ru: string;
  title_ky?: string | null;
  title_en?: string | null;
  price: number;
  old_price?: number | null;
  stock?: number;
  oldPrice?: number | null;
  stockQuantity?: number;
  powerVariants?: { power: string; price: number; oldPrice?: number | null; stockQuantity: number }[] | null;
  image_id: string[];
  imageUrl?: string | null;
  certificateUrl?: string | null;
  certificateFileName?: string | null;
  passportUrl?: string | null;
  passportFileName?: string | null;
  category: string;
  subcategory?: string | null;
  power_options?: string[];
  description?: string | null;
  desc?: string | null;
  content?: string | null;
  text?: string | null;
  specs?: string | string[] | null;
  brand?: string | null;
  badgeKey?: "inStock" | "new" | null;
  energyClass?: string | null;
  pressure?: string | null;
  power?: string | null;
  description_ru?: string | null;
  description_ky?: string | null;
  description_en?: string | null;
};

export type ProductPayload = Omit<ProductDocument, "id">;

export type LeadPayload = {
  name: string;
  phone: string;
  message?: string;
  type?: "callback" | "calculator";
};

type ProductList = {
  total?: number;
  documents: ProductDocument[];
};

export type CartProductDocument = Pick<ProductDocument, "id" | "title_ru" | "price"> &
  Partial<Pick<ProductDocument, "title_ky" | "title_en" | "stock" | "stockQuantity" | "powerVariants" | "image_id" | "imageUrl">>;

type CartProductList = {
  total: number;
  documents: CartProductDocument[];
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const error = typeof body?.error === "string" ? body.error : `Запрос завершился ошибкой (${response.status}).`;
    const details = typeof body?.details === "string" ? body.details : "";
    const code = typeof body?.code === "string" ? `Код: ${body.code}.` : "";
    throw new Error([error, details, code].filter(Boolean).join(" "));
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function listProductDocuments(
  category?: string | null,
  subcategory?: string | null,
  limit = 100,
  searchTerm?: string | null,
) {
  const params = new URLSearchParams({ limit: String(limit), projection: "card" });
  if (category) params.set("category", category);
  if (subcategory) params.set("subcategory", subcategory);
  if (searchTerm?.trim()) params.set("search", searchTerm.trim());

  return request<ProductList>(`/api/products?${params}`);
}

export function listAdminProductDocuments(limit = 100) {
  const params = new URLSearchParams({ limit: String(limit), projection: "admin" });
  return request<ProductList>(`/api/products?${params}`);
}

export function getProductCount() {
  return request<{ total: number }>("/api/products?countOnly=true");
}

export function listFavoriteProductDocuments(ids: string[]) {
  if (ids.length === 0) return Promise.resolve({ total: 0, documents: [] });
  const params = new URLSearchParams({ ids: ids.join(","), projection: "card" });
  return request<ProductList>(`/api/products?${params}`);
}

export function listCartProductDocuments(ids: string[]) {
  if (ids.length === 0) return Promise.resolve({ total: 0, documents: [] });
  const params = new URLSearchParams({ ids: ids.join(",") });
  params.set("projection", "cart");
  return request<CartProductList>(`/api/products?${params}`);
}

export function getProductDocument(id: string) {
  return request<ProductDocument>(`/api/products/${encodeURIComponent(id)}`);
}

export function listRelatedProductDocuments(category: string, excludedId: string, limit = 8) {
  const params = new URLSearchParams({ category, exclude: excludedId, limit: String(limit) });
  return request<ProductList>(`/api/products?${params}`);
}

export function createProduct(product: ProductPayload) {
  return request<ProductDocument>("/api/products", {
    method: "POST",
    body: JSON.stringify(product),
  });
}

export function updateProduct(id: string, product: Partial<ProductPayload>) {
  return request<ProductDocument>(`/api/products/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(product),
  });
}

export function deleteProduct(id: string) {
  return request<void>(`/api/products/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function createLeadDocument(payload: LeadPayload) {
  return request<{ id: string }>("/api/leads", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function mapProduct(product: ProductDocument, language: string): Product {
  const isKy = language === "ky";
  const isEn = language === "en";
  const imageUrl = getProductImageUrl(product.image_id?.length ? product.image_id : product.imageUrl ?? "");
  const name = isKy ? product.title_ky || product.title_ru : isEn ? product.title_en || product.title_ru : product.title_ru;
  const description = isKy
    ? product.description_ky || product.description || product.description_ru || product.title_ky || product.title_ru
    : isEn
      ? product.description_en || product.description || product.description_ru || product.title_en || product.title_ru
      : product.description_ru || product.description || product.title_ru;

  return {
    id: product.id,
    name,
    brand: product.brand ?? product.category,
    category: product.category,
    subcategory: product.subcategory ?? undefined,
    price: Number(product.price),
    oldPrice: product.oldPrice ?? product.old_price ?? null,
    stockQuantity: product.stockQuantity ?? product.stock ?? 0,
    powerVariants: product.powerVariants ?? [],
    image: imageUrl,
    badgeKey: product.badgeKey ?? "inStock",
    badge: product.badgeKey ?? "inStock",
    energyClass: product.energyClass ?? "A",
    pressure: product.pressure ?? "3 bar",
    power: product.power ?? "-",
    description,
  };
}
