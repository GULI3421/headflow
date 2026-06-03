"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AdvantagesSection } from "@/components/advantages-section";
import { CategorySection } from "@/components/category-section";
import { Hero } from "@/components/hero";
import { ProductGrid } from "@/components/product-grid";
import { SidebarCatalog } from "@/components/sidebar-catalog";
import { TrustBlocks } from "@/components/trust-blocks";
import { useClientMounted } from "@/components/use-client-mounted";
import type { Product } from "@/lib/products";
import { listProductDocuments, mapAppwriteProduct } from "@/src/lib/appwrite";
import { useTranslation } from "react-i18next";
import "@/src/i18n/config";

export default function HomePage() {
  const mounted = useClientMounted();
  const { i18n } = useTranslation();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(false);

  useEffect(() => {
    if (!mounted) return;

    let ignore = false;

    async function loadFeaturedProducts() {
      setIsLoadingFeatured(true);

      try {
        const response = await listProductDocuments(null, null, 8);

        if (!ignore) {
          setFeaturedProducts(response.documents.map((product) => mapAppwriteProduct(product, i18n.language)));
        }
      } catch {
        if (!ignore) {
          setFeaturedProducts([]);
        }
      } finally {
        if (!ignore) {
          setIsLoadingFeatured(false);
        }
      }
    }

    loadFeaturedProducts();

    return () => {
      ignore = true;
    };
  }, [i18n.language, mounted]);

  if (!mounted) {
    return null;
  }

  return (
    <>
      <SidebarCatalog />

      <div className="lg:pl-[70px]">
        <Hero />

        <section className="bg-[#F7F7F4] py-14 text-[#151515] dark:bg-[#0F0F0F] dark:text-white md:py-20">
          <div className="container-shell">
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-black uppercase text-[#FF4F00]">Популярные товары</p>
                <h2 className="mt-2 text-4xl font-black leading-tight md:text-5xl">Быстрый выбор оборудования</h2>
              </div>
              <Link className="text-sm font-black uppercase text-[#FF4D00]" href="/catalog">
                Смотреть весь каталог
              </Link>
            </div>

            {isLoadingFeatured && (
              <div className="grid min-h-52 place-items-center rounded-md border border-black/10 bg-white/60 dark:border-white/10 dark:bg-white/5">
                <Loader2 className="animate-spin text-[#FF4D00]" size={28} aria-hidden />
              </div>
            )}
            {!isLoadingFeatured && featuredProducts.length > 0 && <ProductGrid products={featuredProducts} />}
          </div>
        </section>

        <AdvantagesSection />
        <CategorySection />
        <TrustBlocks />
      </div>
    </>
  );
}
