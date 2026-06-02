"use client";

import { Account, Client, Databases, ID, Models, Query, Storage } from "appwrite";
import type { Product } from "@/lib/products";

// Өзгөрмөлөрдү коопсуз окуу жана бош эмес экенине кепилдик берүү (TypeScript ката бербеши үчүн)
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";
const productsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_PRODUCTS_COLLECTION_ID || "";
const leadsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LEADS_COLLECTION_ID || "";
const productImagesBucketId = process.env.NEXT_PUBLIC_APPWRITE_PRODUCT_IMAGES_BUCKET_ID || "";

export const APPWRITE_CONFIG = {
    endpoint,
    projectId,
    databaseId,
    productsCollectionId,
    leadsCollectionId,
    productImagesBucketId
};

export const appwriteConfig = APPWRITE_CONFIG;

// Клиентти инициализациялоо
export const client = new Client();

if (projectId && endpoint) {
    client.setEndpoint(endpoint).setProject(projectId);
}

export const appwriteClient = client;

export const databases = new Databases(client);
export const storage = new Storage(client);
export const account = new Account(client);

export type AppwriteProductDocument = Models.Document & {
  title_ru: string;
  title_ky?: string;
  title_en?: string;
  price: number;
  old_price?: number | null;
  image_id: string[];
  imageUrl?: string | null;
  category: string;
  subcategory?: string;
  power_options?: string[];
  description?: string;
  desc?: string;
  content?: string;
  text?: string;
  specs?: string | string[];
  brand?: string;
  badgeKey?: "inStock" | "new";
  energyClass?: string;
  pressure?: string;
  power?: string;
  description_ru?: string;
  description_ky?: string;
  description_en?: string;
};

export type LeadPayload = {
  name: string;
  phone: string;
  message?: string;
};

export type CreateProductPayload = {
  title_ru?: string;
  title_ky?: string;
  title_en?: string;
  title?: string;
  price: number | string;
  old_price?: number | string | null;
  images?: string | string[] | null;
  image_id?: string | string[] | null;
  imageUrl?: string | null;
  category?: string;
  subcategory?: string;
  power_options?: string | string[];
  description?: string;
  desc?: string;
  content?: string;
  text?: string;
  specs?: string | string[];
  brand?: string;
  badgeKey?: "inStock" | "new";
  energyClass?: string;
  pressure?: string;
  power?: string;
  description_ru?: string;
  description_ky?: string;
  description_en?: string;
};

type ProductDocumentData = Omit<AppwriteProductDocument, keyof Models.Document>;

function assertAppwriteConfig() {
  const missing = [
    !appwriteConfig.endpoint && "NEXT_PUBLIC_APPWRITE_ENDPOINT",
    !appwriteConfig.projectId && "NEXT_PUBLIC_APPWRITE_PROJECT_ID",
    !appwriteConfig.databaseId && "NEXT_PUBLIC_APPWRITE_DATABASE_ID",
    !appwriteConfig.productsCollectionId && "NEXT_PUBLIC_APPWRITE_PRODUCTS_COLLECTION_ID",
    !appwriteConfig.leadsCollectionId && "NEXT_PUBLIC_APPWRITE_LEADS_COLLECTION_ID",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`Missing Appwrite configuration: ${missing.join(", ")}.`);
  }
}

function normalizeStringArray(value: unknown): string[] {
  // 1. Эгер маани такыр жок болсо (null же undefined), дароо бош массив кайтар
  if (value === null || value === undefined) {
    return [];
  }

  // 2. Эгер маани ТЕКСТ (string) болсо гана split() иштет
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }

  // 3. Эгер маани МАССИВ (array) болсо, анын ичиндеги тексттерди гана иретте
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  // 4. Эгер башка күтүлбөгөн тип келип калса, ката бербей эле бош массив кайтар
  return [];
}

export async function listProductDocuments(
  category?: string | null,
  subcategory?: string | null,
  limit = 100,
  searchTerm?: string | null,
) {
  try {
    assertAppwriteConfig();

    const queries = [Query.limit(limit)];
    const normalizedSearchTerm = searchTerm?.trim();

    if (category) {
      queries.push(Query.equal("category", category));
    }
    if (subcategory) {
      queries.push(Query.equal("subcategory", subcategory));
    }
    if (normalizedSearchTerm) {
      queries.push(Query.search("title_ru", normalizedSearchTerm));
    }

    return await databases.listDocuments<AppwriteProductDocument>({
      databaseId: appwriteConfig.databaseId,
      collectionId: appwriteConfig.productsCollectionId,
      queries,
    });
  } catch {
    return {
      total: 0,
      documents: [],
    } as Models.DocumentList<AppwriteProductDocument>;
  }
}

export async function listFavoriteProductDocuments(productIds: string[]) {
  try {
    assertAppwriteConfig();

    const favoriteIds = productIds.filter(Boolean);
    if (favoriteIds.length === 0) {
      return {
        total: 0,
        documents: [],
      } as Models.DocumentList<AppwriteProductDocument>;
    }

    return await databases.listDocuments<AppwriteProductDocument>({
      databaseId: appwriteConfig.databaseId,
      collectionId: appwriteConfig.productsCollectionId,
      queries: [Query.equal("$id", favoriteIds), Query.limit(favoriteIds.length)],
    });
  } catch {
    return {
      total: 0,
      documents: [],
    } as Models.DocumentList<AppwriteProductDocument>;
  }
}

export async function createProduct(product: CreateProductPayload) {
  assertAppwriteConfig();

  const imageSource = product.images ?? product.image_id;
  const oldPrice = product.old_price;

  // Массивдерди текшерип тазалап алабыз
  const validatedImages = normalizeStringArray(imageSource).filter(
    (item) => typeof item === "string" && item.trim() !== ""
  );
  const validatedPowerOptions = normalizeStringArray(product.power_options).filter(
    (item) => typeof item === "string" && item.trim() !== ""
  );
  const validatedSpecs = normalizeStringArray(product.specs).filter(
    (item) => typeof item === "string" && item.trim() !== ""
  );
  const parsedOldPrice = oldPrice != null && String(oldPrice).trim() !== "" ? Number(oldPrice) : undefined;
  const payload: ProductDocumentData = {
    title_ru: product.title_ru ?? product.title ?? "",
    title_ky: product.title_ky || "",
    title_en: product.title_en || "",
    price: Number(product.price) || 0,
    category: product.category ?? "",
    subcategory: product.subcategory ?? "",
    description: product.description || "",
    brand: product.brand || "",
    badgeKey: product.badgeKey,
    energyClass: product.energyClass || "",
    pressure: product.pressure || "",
    power: product.power || "",
    image_id: validatedImages,
    imageUrl: product.imageUrl ?? (validatedImages.length > 0 ? getProductImageUrl(validatedImages) : ""),
    power_options: validatedPowerOptions,
    specs: String(validatedSpecs.join("\n") || "").slice(0, 65535),
  };

  if (Number.isFinite(parsedOldPrice)) {
    payload.old_price = parsedOldPrice;
  }

  return databases.createDocument<AppwriteProductDocument>({
    databaseId: appwriteConfig.databaseId,
    collectionId: appwriteConfig.productsCollectionId,
    documentId: ID.unique(),
    data: {
      ...payload,
      specs: String(payload.specs || "").slice(0, 65535),
    },
  });
}

export async function createLeadDocument(payload: LeadPayload) {
  assertAppwriteConfig();

  return databases.createDocument({
    databaseId: appwriteConfig.databaseId,
    collectionId: appwriteConfig.leadsCollectionId,
    documentId: ID.unique(),
    data: {
      name: payload.name,
      phone: payload.phone,
      message: payload.message ?? "",
    },
  });
}

export function getPrimaryProductImageId(imageId: string | string[]) {
  return Array.isArray(imageId) ? imageId[0] ?? "" : imageId;
}

export function getAppwriteFileViewUrl(fileId: string) {
  if (!fileId || !appwriteConfig.productImagesBucketId || !appwriteConfig.projectId) return "/assets/image.png";

  return storage.getFileView({
    bucketId: appwriteConfig.productImagesBucketId,
    fileId,
  });
}

export function getProductImageUrl(imageId: string | string[]) {
  const primaryImageId = getPrimaryProductImageId(imageId);

  if (!primaryImageId) return "/assets/image.png";
  if (/^(https?:)?\/\//.test(primaryImageId)) {
    try {
      const url = new URL(primaryImageId);
      const fileId = url.pathname.match(/\/storage\/buckets\/[^/]+\/files\/([^/]+)\//)?.[1];

      if (fileId) {
        return getAppwriteFileViewUrl(decodeURIComponent(fileId));
      }
    } catch {
      return primaryImageId;
    }

    return primaryImageId;
  }
  if (primaryImageId.startsWith("/")) return primaryImageId;

  return getAppwriteFileViewUrl(primaryImageId);
}

export function mapAppwriteProduct(product: AppwriteProductDocument, language: string): Product {
  const isKy = language === "ky";
  const isEn = language === "en";
  const imageUrl = getProductImageUrl(product.image_id?.length ? product.image_id : product.imageUrl ?? "");

  return {
    id: product.$id,
    name: isKy ? product.title_ky ?? product.title_ru : isEn ? product.title_en ?? product.title_ru : product.title_ru,
    brand: product.brand ?? product.category,
    category: product.category,
    subcategory: product.subcategory,
    price: Number(product.price),
    image: imageUrl,
    badgeKey: product.badgeKey ?? "inStock",
    badge: product.badgeKey ?? "inStock",
    energyClass: product.energyClass ?? "A",
    pressure: product.pressure ?? "3 bar",
    power: product.power ?? "-",
    description: product.description ?? (isKy
      ? product.description_ky ?? product.title_ky ?? product.title_ru
      : isEn
        ? product.description_en ?? product.title_en ?? product.title_ru
        : product.description_ru ?? product.title_ru),
  };
}
