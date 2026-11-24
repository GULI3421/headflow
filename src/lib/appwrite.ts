"use client";

import { Account, Client, Storage } from "appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const productImagesBucketId = process.env.NEXT_PUBLIC_APPWRITE_PRODUCT_IMAGES_BUCKET_ID || "";

export const appwriteConfig = { endpoint, projectId, productImagesBucketId };

const client = new Client();

if (projectId && endpoint) {
  client.setEndpoint(endpoint).setProject(projectId);
}

export const storage = new Storage(client);
export const account = new Account(client);

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
  if (primaryImageId.startsWith("/uploads/")) return primaryImageId;
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
