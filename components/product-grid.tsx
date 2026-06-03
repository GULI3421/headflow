"use client";

import { motion } from "framer-motion";
import { Heart, ShoppingCart } from "lucide-react";
import Link from "next/link";
import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import "@/src/i18n/config";
import { useClientMounted } from "@/components/use-client-mounted";
import type { Product } from "@/lib/products";
import { useCartStore } from "@/store/cart-store";
import { useFavorites } from "@/store/use-favorites";

type ProductGridProps = {
  products: Product[];
};

export function ProductGrid({ products }: ProductGridProps) {
  const mounted = useClientMounted();
  const addItem = useCartStore((state) => state.addItem);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { t, i18n } = useTranslation();

  if (!mounted) {
    return null;
  }

  return (
    <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-4">
      {products.map((product, index) => (
        <motion.article
          className="group relative min-w-[66%] snap-start overflow-hidden rounded-md border border-black/10 bg-white shadow-sm transition duration-300 hover:scale-105 hover:border-[#FF4D00] hover:shadow-[0_0_36px_rgba(255,77,0,0.16)] dark:border-white/5 dark:bg-[#151515] md:min-w-0"
          initial={{ opacity: 0, y: 18 }}
          key={`${product.id}-${index}`}
          transition={{ delay: index * 0.05 }}
          viewport={{ once: true, margin: "-80px" }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          {(() => {
            const translatedName = product.i18nKey ? t(`products.items.${product.i18nKey}.name`) : product.name;
            const translatedDescription = product.i18nKey
              ? t(`products.items.${product.i18nKey}.description`)
              : product.description;
            const productName = translatedName.startsWith("products.items.") ? product.name : translatedName;
            const productDescription = translatedDescription.startsWith("products.items.")
              ? product.description
              : translatedDescription;
            const favorited = isFavorite(product.id);

            function handleFavoriteClick(event: MouseEvent<HTMLButtonElement>) {
              event.preventDefault();
              event.stopPropagation();
              toggleFavorite(product.id);
            }

            return (
              <>
          <Link
            className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#F0F0EC] p-4 dark:bg-[#1D1D1D]"
            href={`/product/${product.id}`}
          >
            <div className="absolute left-1/2 top-1/2 size-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF4F00]/18 blur-2xl transition duration-300 group-hover:bg-[#FF4F00]/28" />
            <img
              alt={productName}
              className="relative z-10 max-h-full max-w-full object-contain object-center drop-shadow-2xl transition duration-500"
              src={product.image}
            />
            <div className="absolute left-3 top-3 text-[11px] font-black uppercase">
              <span
                className={
                  product.badgeKey === "new"
                    ? "rounded-md bg-[#FF4F00] px-2 py-1 text-white"
                    : "rounded-md border border-green-400/20 bg-green-400/10 px-2 py-1 text-green-300"
                }
              >
                {t(`products.badges.${product.badgeKey}`)}
              </span>
            </div>
            <div className="absolute inset-x-3 bottom-3 translate-y-3 rounded-md bg-white/92 p-3 text-[#151515] opacity-0 shadow-xl transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 dark:bg-[#0F0F0F]/92 dark:text-white">
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                <span>{t("products.labels.pressure")}: {product.pressure}</span>
                <span>{t("products.labels.power")}: {product.power}</span>
              </div>
            </div>
          </Link>
          <button
            aria-label={favorited ? t("products.removeFavorite") : t("products.addFavorite")}
            className="absolute right-3 top-3 z-20 grid size-10 place-items-center rounded-md border border-black/10 bg-white/90 text-zinc-400 shadow-lg transition-colors hover:text-[#FF4D00] dark:border-white/10 dark:bg-[#0F0F0F]/85"
            onClick={handleFavoriteClick}
            type="button"
          >
            <Heart className={favorited ? "fill-red-500 text-red-500" : "text-zinc-400 transition-colors hover:text-white"} size={19} aria-hidden />
          </button>
          <div className="p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-black/38 dark:text-white/38">{product.brand}</p>
            <Link href={`/product/${product.id}`}>
              <h3 className="mt-2 line-clamp-2 min-h-12 text-xl font-semibold leading-tight text-[#151515] transition hover:text-[#FF4D00] dark:text-white dark:hover:text-[#FF4D00]">
                {productName}
              </h3>
            </Link>
            <p className="mt-2 line-clamp-2 min-h-12 text-sm leading-6 text-black/55 dark:text-white/50">{productDescription}</p>
            <div className="mt-5 flex items-end justify-between gap-3">
              <span className="text-2xl font-black text-[#FF4D00]">
                {product.price.toLocaleString(i18n.language === "en" ? "en-US" : "ru-RU")} KGS
              </span>
            </div>
            <button
              className="mt-5 flex h-11 w-full translate-y-0 items-center justify-center gap-2 rounded-md bg-[#FF4D00] text-sm font-black uppercase text-white transition duration-300 hover:bg-[#e64800] md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100"
              onClick={() => addItem(product)}
              aria-label={t("products.addToCartAria", { brand: product.brand, name: productName })}
            >
              <ShoppingCart size={17} aria-hidden />
              {t("products.addToCart")}
            </button>
          </div>
              </>
            );
          })()}
        </motion.article>
      ))}
    </div>
  );
}
