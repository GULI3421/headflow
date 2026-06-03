"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductGrid } from "@/components/product-grid";
import { SidebarCatalog } from "@/components/sidebar-catalog";
import { useClientMounted } from "@/components/use-client-mounted";
import { catalogCategories, categoryTranslationKey, subcategoryTranslationKey } from "@/lib/catalog";
import type { Product } from "@/lib/products";
import { listProductDocuments, mapAppwriteProduct } from "@/src/lib/appwrite";
import { useTranslation } from "react-i18next";
import "@/src/i18n/config";

function CatalogPageContent() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mounted = useClientMounted();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const activeCategory = useMemo(() => searchParams.get("category"), [searchParams]);
  const activeSubcategory = useMemo(() => searchParams.get("subcategory"), [searchParams]);
  const searchTerm = useMemo(() => searchParams.get("search")?.trim() ?? "", [searchParams]);

  function selectCategory(category: string | null) {
    const params = new URLSearchParams(searchParams.toString());

    if (category) {
      params.set("category", category);
      params.delete("subcategory");
    } else {
      params.delete("category");
      params.delete("subcategory");
    }

    const query = params.toString();
    router.replace(query ? `/catalog?${query}#products` : "/catalog#products", { scroll: false });
  }

  useEffect(() => {
    if (!mounted) return;

    let ignore = false;

    async function loadProducts() {
      setIsLoadingProducts(true);
      setProductsError(null);

      try {
        const response = await listProductDocuments(activeCategory, activeSubcategory, 100, searchTerm);

        if (ignore) return;

        const documents = Array.isArray(response?.documents) ? response.documents : [];
        setProducts(documents.map((product) => mapAppwriteProduct(product, i18n.language)));
      } catch {
        if (!ignore) {
          setProducts([]);
          setProductsError(null);
        }
      } finally {
        if (!ignore) {
          setIsLoadingProducts(false);
        }
      }
    }

    loadProducts();

    return () => {
      ignore = true;
    };
  }, [activeCategory, activeSubcategory, i18n.language, mounted, searchTerm]);

  if (!mounted) {
    return null;
  }

  return (
    <>
      <SidebarCatalog />
      <section
        className="min-h-screen bg-[#F7F7F4] bg-[linear-gradient(rgba(15,15,15,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(15,15,15,0.045)_1px,transparent_1px)] bg-[size:42px_42px] px-4 pb-20 pt-36 text-[#151515] dark:bg-[#0F0F0F] dark:bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] dark:text-white lg:pl-[86px]"
        id="products"
      >
        <div className="container-shell">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-black uppercase text-[#FF4F00]">{t("catalog.eyebrow")}</p>
              <h1 className="mt-2 text-4xl font-black leading-tight md:text-6xl">{t("catalog.title")}</h1>
            </div>
            <p className="max-w-xl text-sm leading-6 text-black/58 dark:text-white/55 md:text-base">
              {t("catalog.description")}
            </p>
          </div>

          <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
            <button
              className={`h-10 shrink-0 rounded-md border px-4 text-sm font-black uppercase transition ${
                activeCategory === null
                  ? "border-[#FF4F00] bg-[#FF4F00] text-white"
                  : "border-black/10 bg-white text-black/60 hover:border-[#FF4F00] hover:text-[#FF4F00] dark:border-white/10 dark:bg-white/5 dark:text-white/70"
              }`}
              onClick={() => selectCategory(null)}
              type="button"
            >
              {t("catalog.all")}
            </button>
            {catalogCategories.map((category, index) => {
              const translationKey = categoryTranslationKey(category);
              const categoryLabel = translationKey ? t(translationKey, { defaultValue: category }) : category;

              return (
                <button
                  className={`h-10 shrink-0 rounded-md border px-4 text-sm font-black uppercase transition ${
                    activeCategory === category
                      ? "border-[#FF4F00] bg-[#FF4F00] text-white"
                      : "border-black/10 bg-white text-black/60 hover:border-[#FF4F00] hover:text-[#FF4F00] dark:border-white/10 dark:bg-white/5 dark:text-white/70"
                  }`}
                  key={`catalog-category-${index}-${category}`}
                  onClick={() => selectCategory(category)}
                  type="button"
                >
                  {categoryLabel}
                </button>
              );
            })}
          </div>

          {activeCategory && (
            <div className="mb-6 rounded-md border border-black/10 bg-white/80 px-4 py-3 text-sm font-bold text-black/60 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
              {(() => {
                const categoryKey = categoryTranslationKey(activeCategory);
                const categoryLabel = categoryKey ? t(categoryKey, { defaultValue: activeCategory }) : activeCategory;
                const subcategoryKey = activeSubcategory ? subcategoryTranslationKey(activeSubcategory) : "";
                const subcategoryLabel =
                  activeSubcategory && subcategoryKey
                    ? t(subcategoryKey, { defaultValue: activeSubcategory })
                    : activeSubcategory;

                return subcategoryLabel ? `${categoryLabel} / ${subcategoryLabel}` : categoryLabel;
              })()}
            </div>
          )}

          {searchTerm && (
            <div className="mb-6 rounded-md border border-black/10 bg-white/80 px-4 py-3 text-sm font-bold text-black/60 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
              {t("catalog.searchLabel")}: {searchTerm}
            </div>
          )}

          {isLoadingProducts && (
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  className="h-80 animate-pulse rounded-md border border-black/10 bg-white/70 dark:border-white/5 dark:bg-white/5"
                  key={index}
                />
              ))}
            </div>
          )}
          {!isLoadingProducts && productsError && (
            <p className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-700 dark:text-red-300">
              {productsError}
            </p>
          )}
          {!isLoadingProducts && !productsError && <ProductGrid products={products} />}
        </div>
      </section>
    </>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={null}>
      <CatalogPageContent />
    </Suspense>
  );
}
