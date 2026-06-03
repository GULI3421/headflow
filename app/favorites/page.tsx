"use client";

import { Query } from "appwrite";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ProductGrid } from "@/components/product-grid";
import type { Product } from "@/lib/products";
import { appwriteConfig, AppwriteProductDocument, databases, mapAppwriteProduct } from "@/src/lib/appwrite";
import "@/src/i18n/config";

const favoritesStorageKey = "heatflow:favorites";

export default function FavoritesPage() {
  const { t, i18n } = useTranslation();
  const [favoriteDocuments, setFavoriteDocuments] = useState<AppwriteProductDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const products = useMemo<Product[]>(
    () => favoriteDocuments.map((item) => mapAppwriteProduct(item, i18n.language)),
    [favoriteDocuments, i18n.language],
  );

  useEffect(() => {
    const fetchFavoriteProducts = async () => {
      try {
        const storedFavorites = localStorage.getItem(favoritesStorageKey);
        const favoriteIds = storedFavorites ? JSON.parse(storedFavorites) : [];

        if (!Array.isArray(favoriteIds) || favoriteIds.length === 0) {
          setFavoriteDocuments([]);
          setLoading(false);
          return;
        }

        const response = await databases.listDocuments<AppwriteProductDocument>({
          databaseId: appwriteConfig.databaseId,
          collectionId: appwriteConfig.productsCollectionId,
          queries: [Query.equal("$id", favoriteIds), Query.limit(favoriteIds.length)],
        });

        const favoriteOrder = new Map(favoriteIds.map((id: string, index: number) => [id, index]));
        const sortedDocuments = response.documents.sort(
          (a, b) => (favoriteOrder.get(a.$id) ?? 0) - (favoriteOrder.get(b.$id) ?? 0),
        );

        setFavoriteDocuments(sortedDocuments);
      } catch (error) {
        console.error("Error loading favorite items:", error);
        setFavoriteDocuments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFavoriteProducts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 py-20 text-center text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        {t("favorites.loading")}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 md:p-12">
      <div className="mx-auto max-w-7xl pt-28">
        <h1 className="mb-8 text-3xl font-bold">{t("favorites.title")}</h1>

        {products.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 py-16 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900/30">
            <p className="mb-6 text-zinc-600 dark:text-zinc-400">{t("favorites.empty")}</p>
            <Link
              href="/catalog"
              className="inline-block rounded-md bg-orange-600 px-6 py-3 font-medium text-white transition-colors hover:bg-orange-500"
            >
              {t("favorites.catalog")}
            </Link>
          </div>
        ) : (
          <ProductGrid products={products} />
        )}
      </div>
    </div>
  );
}
