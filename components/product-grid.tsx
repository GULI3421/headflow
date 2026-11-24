"use client";

import { motion } from "framer-motion";
import { Heart, ShoppingCart } from "lucide-react";
import Link from "next/link";
import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import "@/src/i18n/config";
import { useClientMounted } from "@/components/use-client-mounted";
import type { Product } from "@/lib/products";
import { getStockStatus } from "@/lib/stock-status";
import { useCartStore } from "@/store/cart-store";
import { useFavorites } from "@/store/use-favorites";

type ProductGridProps = {
  products: Product[];
};

function cleanCardText(value: string) {
  return value.trim().replace(/,\s*$/u, "");
}

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
          className="group flex min-w-[66%] snap-start flex-col overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm transition hover:border-[#FF4D00]/45 hover:shadow-[0_12px_36px_rgba(0,0,0,0.12)] dark:border-white/10 dark:bg-[#151515] md:min-w-0"
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
            const productName = cleanCardText(
              translatedName.startsWith("products.items.") ? product.name : translatedName,
            );
            const productDescription = cleanCardText(translatedDescription.startsWith("products.items.")
              ? product.description
              : translatedDescription);
            const favorited = isFavorite(product.id);
            const stockStatus =
              typeof product.stockQuantity === "number"
                ? getStockStatus(product.stockQuantity)
                : null;

            function handleFavoriteClick(event: MouseEvent<HTMLButtonElement>) {
              event.preventDefault();
              event.stopPropagation();
              toggleFavorite(product.id);
            }

            return (
              <>
          <Link
            className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-[#F0F0EC] dark:bg-[#1D1D1D]"
            href={`/product/${product.id}`}
          >
            <img
              alt={productName}
              className="relative z-10 h-full w-full object-contain p-6 transition-transform duration-500 group-hover:scale-[1.03]"
              src={product.image}
            />
            {stockStatus && (
              <span
                className={`absolute left-3 top-3 z-20 max-w-[calc(100%-3.5rem)] whitespace-normal break-words rounded-md border bg-[#0F0F0F]/90 px-2.5 py-1.5 text-[10px] font-bold leading-tight backdrop-blur-sm ${stockStatus.photoClassName}`}
              >
                {stockStatus.label}
              </span>
            )}
          </Link>
          <button
            aria-label={favorited ? t("products.removeFavorite") : t("products.addFavorite")}
            className="absolute right-3 top-3 z-20 grid size-9 place-items-center rounded-full bg-[#0F0F0F]/75 text-white/75 backdrop-blur-sm transition-colors hover:text-[#FF4D00]"
            onClick={handleFavoriteClick}
            type="button"
          >
            <Heart className={favorited ? "fill-red-500 text-red-500" : "text-zinc-400 transition-colors hover:text-white"} size={19} aria-hidden />
          </button>
          <div className="flex flex-1 flex-col p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-black/45 dark:text-white/45">{product.brand}</p>
            <Link href={`/product/${product.id}`}>
              <h3 className="mt-2 line-clamp-2 min-h-12 text-lg font-bold leading-6 text-[#151515] transition-colors hover:text-[#FF4D00] dark:text-white dark:hover:text-[#FF4D00]">
                {productName}
              </h3>
            </Link>
            <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-black/55 dark:text-white/55">{productDescription}</p>
            <div className="mt-auto flex min-h-[4.75rem] flex-col justify-end gap-1 pt-5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-[1.4rem] font-black leading-tight text-[#FF4D00]">
                  {product.price.toLocaleString(i18n.language === "en" ? "en-US" : "ru-RU")} сом
                </span>
                {product.oldPrice && product.oldPrice > product.price && (
                  <span className="text-sm font-medium text-zinc-500 line-through">
                    {product.oldPrice.toLocaleString(i18n.language === "en" ? "en-US" : "ru-RU")} сом
                  </span>
                )}
              </div>
            </div>
            <button
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#FF4D00] text-sm font-bold text-white transition-colors hover:bg-[#e64800] disabled:cursor-not-allowed disabled:bg-zinc-400"
              onClick={() => addItem(product)}
              disabled={stockStatus?.key === "outOfStock"}
              aria-label={t("products.addToCartAria", { brand: product.brand, name: productName })}
            >
              <ShoppingCart size={17} aria-hidden />
              {stockStatus?.key === "outOfStock" ? "Нет в наличии" : t("products.addToCart")}
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
