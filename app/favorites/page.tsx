"use client";

import { Query } from "appwrite";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ProductGrid } from "@/components/product-grid";
import type { Product } from "@/lib/products";
import { appwriteConfig, AppwriteProductDocument, databases, mapAppwriteProduct } from "@/src/lib/appwrite";

const favoritesStorageKey = "heatflow:favorites";

export default function FavoritesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavoriteProducts = async () => {
      try {
        const storedFavorites = localStorage.getItem(favoritesStorageKey);
        const favoriteIds = storedFavorites ? JSON.parse(storedFavorites) : [];

        if (!Array.isArray(favoriteIds) || favoriteIds.length === 0) {
          setProducts([]);
          setLoading(false);
          return;
        }

        const response = await databases.listDocuments<AppwriteProductDocument>({
          databaseId: appwriteConfig.databaseId,
          collectionId: appwriteConfig.productsCollectionId,
          queries: [Query.equal("$id", favoriteIds), Query.limit(favoriteIds.length)],
        });

        const favoriteOrder = new Map(favoriteIds.map((id: string, index: number) => [id, index]));
        const mappedProducts = response.documents
          .map((item) => mapAppwriteProduct(item, "ru"))
          .sort((a, b) => (favoriteOrder.get(a.id) ?? 0) - (favoriteOrder.get(b.id) ?? 0));

        setProducts(mappedProducts);
      } catch (error) {
        console.error("Error loading favorite items:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFavoriteProducts();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-black py-20 text-center text-white">Загрузка избранных товаров...</div>;
  }

  return (
    <div className="min-h-screen bg-black p-6 text-white md:p-12">
      <div className="mx-auto max-w-7xl pt-28">
        <h1 className="mb-8 text-3xl font-bold">Избранные товары</h1>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-8 py-16 text-center">
            <p className="mb-6 text-zinc-400">В списке избранного пока ничего нет.</p>
            <Link
              href="/catalog"
              className="inline-block rounded-xl bg-orange-600 px-6 py-3 font-medium text-white transition-colors hover:bg-orange-500"
            >
              Перейти в каталог
            </Link>
          </div>
        ) : (
          <ProductGrid products={products} />
        )}
      </div>
    </div>
  );
}
