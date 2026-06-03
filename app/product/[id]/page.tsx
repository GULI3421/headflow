"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Query } from "appwrite";
import { ArrowLeft, CheckCircle2, Heart, Loader2, ShoppingCart } from "lucide-react";
import { ProductGrid } from "@/components/product-grid";
import type { Product } from "@/lib/products";
import {
  appwriteConfig,
  AppwriteProductDocument,
  databases,
  getProductImageUrl,
  mapAppwriteProduct,
} from "@/src/lib/appwrite";
import { useCartStore } from "@/store/cart-store";
import { useFavorites } from "@/store/use-favorites";

function parseSpecs(specs: AppwriteProductDocument["specs"]) {
  if (!specs) return [];

  const values = Array.isArray(specs) ? specs : specs.split(/\n|,/);

  return values
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [label, ...rest] = item.split(":");
      return {
        label: rest.length > 0 ? label.trim() : "Характеристика",
        value: rest.length > 0 ? rest.join(":").trim() : item,
      };
    });
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const productId = params.id;
  const addItem = useCartStore((state) => state.addItem);
  const { isFavorite, toggleFavorite } = useFavorites();
  const [product, setProduct] = useState<AppwriteProductDocument | null>(null);
  const [mappedProduct, setMappedProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadProduct() {
      setIsLoading(true);
      setError(null);
      setProduct(null);
      setMappedProduct(null);
      setRelatedProducts([]);

      window.scrollTo({ top: 0, behavior: "smooth" });

      try {
        const response = await databases.getDocument<AppwriteProductDocument>({
          databaseId: appwriteConfig.databaseId,
          collectionId: appwriteConfig.productsCollectionId,
          documentId: productId,
        });

        if (ignore) return;

        setProduct(response);
        setMappedProduct(mapAppwriteProduct(response, "ru"));

        try {
          const relatedData = await databases.listDocuments<AppwriteProductDocument>({
            databaseId: appwriteConfig.databaseId,
            collectionId: appwriteConfig.productsCollectionId,
            queries: [
              Query.equal("category", response?.category ?? ""),
              Query.notEqual("$id", response.$id),
              Query.limit(8),
            ],
          });

          if (!ignore) {
            const documents = Array.isArray(relatedData?.documents) ? relatedData.documents : [];
            setRelatedProducts(documents.map((item) => mapAppwriteProduct(item, "ru")));
          }
        } catch {
          if (!ignore) {
            setRelatedProducts([]);
          }
        }
      } catch (loadError) {
        console.error("Failed to load product", loadError);
        if (!ignore) {
          setError("Товар не найден или временно недоступен.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    if (productId) {
      loadProduct();
    }

    return () => {
      ignore = true;
    };
  }, [productId]);

  const specs = useMemo(() => {
    if (!product || !mappedProduct) return [];

    return [
      { label: "Бренд", value: product?.brand || mappedProduct?.brand },
      { label: "Категория", value: product?.category },
      { label: "Подкатегория", value: product?.subcategory || "" },
      { label: "Мощность", value: product?.power || mappedProduct?.power },
      { label: "Давление", value: product?.pressure || mappedProduct?.pressure },
      { label: "Энергоэффективность", value: product?.energyClass || mappedProduct?.energyClass },
      ...parseSpecs(product?.specs),
    ].filter((item) => item.value && item.value !== "-");
  }, [mappedProduct, product]);

  if (isLoading) {
    return (
      <section className="min-h-screen bg-white px-4 pt-40 text-zinc-800 dark:bg-[#0a0a0a] dark:text-zinc-200">
        <div className="container-shell grid min-h-[420px] place-items-center">
          <div className="grid justify-items-center gap-4">
            <Loader2 className="animate-spin text-[#FF4D00]" size={36} aria-hidden />
            <p className="text-sm font-bold uppercase tracking-widest text-zinc-500 dark:text-white/55">Загрузка товара</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="min-h-screen bg-white px-4 pt-40 text-zinc-800 dark:bg-[#0a0a0a] dark:text-zinc-200">
        <div className="container-shell">
          <Link className="inline-flex items-center gap-2 text-sm font-black uppercase text-[#FF4D00]" href="/catalog">
            <ArrowLeft size={17} aria-hidden />
            В каталог
          </Link>
          <div className="mt-8 rounded-md border border-zinc-200 bg-zinc-50 p-8 dark:border-white/10 dark:bg-white/5">
            <h1 className="text-3xl font-black">Товар недоступен</h1>
            <p className="mt-3 text-zinc-600 dark:text-white/60">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  if (!product || !mappedProduct) {
    return (
      <div className="min-h-screen bg-white p-10 pt-40 text-center text-zinc-800 dark:bg-[#0a0a0a] dark:text-zinc-200">
        Товар загружается или не найден...
      </div>
    );
  }

  const imageUrl = getProductImageUrl(product?.image_id?.length ? product?.image_id : product?.imageUrl ?? "");
  const safeRelatedProducts = Array.isArray(relatedProducts) ? relatedProducts : [];
  const favorited = mappedProduct ? isFavorite(mappedProduct.id) : false;

  return (
    <section className="min-h-screen bg-white bg-[linear-gradient(rgba(24,24,27,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(24,24,27,0.07)_1px,transparent_1px)] bg-[size:42px_42px] px-4 pb-20 pt-36 text-zinc-800 dark:bg-[#0a0a0a] dark:bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] dark:text-zinc-200">
      <div className="container-shell">
        <Link className="inline-flex items-center gap-2 text-sm font-black uppercase text-[#FF4D00]" href="/catalog">
          <ArrowLeft size={17} aria-hidden />
          В каталог
        </Link>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.95fr)] lg:items-start">
          <div className="flex w-full flex-col gap-4">
            <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-white p-4 shadow-sm">
              <img
                src={imageUrl}
                alt={product?.title_ru || "Товар"}
                className="max-h-full max-w-full object-contain"
              />
              <button
                aria-label={favorited ? "Убрать из избранного" : "Добавить в избранное"}
                className="absolute right-4 top-4 z-20 grid size-11 place-items-center rounded-md border border-black/10 bg-white/90 text-zinc-400 shadow-lg transition-colors hover:text-[#FF4D00]"
                onClick={(event) => {
                  event.preventDefault();
                  if (mappedProduct) {
                    toggleFavorite(mappedProduct.id);
                  }
                }}
                type="button"
              >
                <Heart className={favorited ? "fill-red-500 text-red-500" : "text-zinc-400 transition-colors hover:text-zinc-700"} size={21} aria-hidden />
              </button>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-100 p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
              <h3 className="mb-3 text-lg font-medium text-zinc-900 dark:text-zinc-100">Описание товара</h3>
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {product?.description ||
                  "Описание для данного товара временно отсутствует. Вы можете заполнить его в панели администратора."}
              </p>
            </div>
          </div>

          <div className="rounded-md border border-zinc-200 bg-white p-5 shadow-2xl shadow-black/10 dark:border-white/10 dark:bg-zinc-900/50 dark:shadow-black/25 md:p-7">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-md border border-[#FF4D00]/30 bg-[#FF4D00]/10 px-3 py-1 text-xs font-black uppercase text-[#FF4D00]">
                {product?.category}
              </span>
              {product?.subcategory && (
                <span className="rounded-md border border-zinc-200 bg-zinc-100 px-3 py-1 text-xs font-black uppercase text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                  {product?.subcategory}
                </span>
              )}
            </div>

            <h1 className="mt-5 text-4xl font-black leading-tight md:text-5xl">{product?.title_ru}</h1>

            <div className="mt-7 flex flex-col gap-4 border-y border-zinc-200 py-6 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-white/38">Цена</p>
                <p className="mt-1 text-4xl font-black text-[#FF4D00]">
                  {Number(product?.price ?? 0).toLocaleString("ru-RU")} KGS
                </p>
              </div>
              <div className="inline-flex items-center gap-2 text-sm font-bold text-green-700 dark:text-green-300">
                <CheckCircle2 size={18} aria-hidden />
                В наличии
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-500 dark:text-white/45">Характеристики</h2>
              <dl className="mt-4 grid gap-2 sm:grid-cols-2">
                {specs.map((spec) => (
                  <div className="rounded-md border border-zinc-200 bg-zinc-100 p-3 dark:border-white/10 dark:bg-zinc-900/50" key={`${spec.label}-${spec.value}`}>
                    <dt className="text-[11px] font-black uppercase text-zinc-500 dark:text-white/36">{spec.label}</dt>
                    <dd className="mt-1 text-sm font-bold text-zinc-800 dark:text-zinc-200">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <button
              className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-md bg-[#FF4D00] text-sm font-black uppercase text-white shadow-[0_0_32px_rgba(255,77,0,0.22)] transition hover:bg-[#e64800]"
              onClick={() => addItem(mappedProduct)}
              type="button"
            >
              <ShoppingCart size={19} aria-hidden />
              Добавить в корзину
            </button>
          </div>
        </div>

        <section className="mt-14 border-t border-zinc-200 pt-10 dark:border-white/10">
          <div className="mb-7 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-black uppercase text-[#FF4D00]">{product?.category}</p>
              <h2 className="mt-2 text-3xl font-black leading-tight md:text-4xl">Похожие товары</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-zinc-600 dark:text-white/52">
              Подборка товаров из той же категории для быстрого сравнения характеристик и цены.
            </p>
          </div>

          {/* Safe check before mapping through related hardware cards */}
          {safeRelatedProducts.length > 0 ? (
            <ProductGrid products={safeRelatedProducts} />
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              <p className="col-span-full text-sm text-zinc-500">Нет похожих товаров в этой категории.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
