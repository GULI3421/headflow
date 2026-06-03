"use client";

import { Query } from "appwrite";
import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import {
  appwriteConfig,
  AppwriteProductDocument,
  databases,
  getProductImageUrl,
} from "@/src/lib/appwrite";
import "@/src/i18n/config";
import { useCartStore } from "@/store/cart-store";

type HydratedCartItem = {
  id: string;
  quantity: number;
  productData: AppwriteProductDocument;
};

function productTitle(product: AppwriteProductDocument, language: string, fallback: string) {
  if (language.startsWith("ky")) {
    return product.title_ky || product.title_ru || product.title_en || fallback;
  }

  if (language.startsWith("en")) {
    return product.title_en || product.title_ru || product.title_ky || fallback;
  }

  return product.title_ru || product.title_en || product.title_ky || fallback;
}

function productPrice(product: AppwriteProductDocument) {
  return Number(product.price) || 0;
}

export default function CartPage() {
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language ?? "ru";
  const cartItems = useCartStore((state) => state.items);
  const hydrateCart = useCartStore((state) => state.hydrateCart);
  const updateCartQuantity = useCartStore((state) => state.updateQuantity);
  const removeCartItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const [hydratedItems, setHydratedItems] = useState<HydratedCartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    hydrateCart();
  }, [hydrateCart]);

  useEffect(() => {
    let ignore = false;

    async function fetchCartProducts() {
      setLoading(true);

      try {
        if (cartItems.length === 0) {
          setHydratedItems([]);
          return;
        }

        const ids = cartItems.map((item) => item.id).filter(Boolean);
        const response = await databases.listDocuments<AppwriteProductDocument>({
          databaseId: appwriteConfig.databaseId,
          collectionId: appwriteConfig.productsCollectionId,
          queries: [Query.equal("$id", ids), Query.limit(ids.length)],
        });

        if (ignore) return;

        const combined = cartItems
          .map((localItem) => {
            const matched = response.documents.find((document) => document.$id === localItem.id);

            return matched
              ? {
                  id: localItem.id,
                  quantity: localItem.quantity,
                  productData: matched,
                }
              : null;
          })
          .filter((item): item is HydratedCartItem => item !== null);

        setHydratedItems(combined);
      } catch (error) {
        console.error("Cart hydration error:", error);
        if (!ignore) {
          setHydratedItems([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchCartProducts();

    return () => {
      ignore = true;
    };
  }, [cartItems]);

  const total = useMemo(
    () => hydratedItems.reduce((sum, item) => sum + productPrice(item.productData) * item.quantity, 0),
    [hydratedItems],
  );

  function updateQuantity(id: string, delta: number) {
    const currentItem = cartItems.find((item) => item.id === id);
    if (!currentItem) return;

    updateCartQuantity(id, currentItem.quantity + delta);
  }

  function removeItem(id: string) {
    removeCartItem(id);
  }

  async function handleWhatsAppSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const itemsListText = hydratedItems
      .map((item, index) => {
        const lineTotal = productPrice(item.productData) * item.quantity;
        return `${index + 1}. ${productTitle(item.productData, language, t("cartPage.fallbackProduct"))} x ${
          item.quantity
        } — ${lineTotal.toLocaleString("ru-RU")} KGS`;
      })
      .join("\n");

    const message = t("cartPage.whatsappMessage", {
      name,
      phone,
      items: itemsListText,
      total: total.toLocaleString("ru-RU"),
    });

    try {
      await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          items: itemsListText,
          total: total.toLocaleString("ru-RU"),
          type: t("cartPage.telegramType"),
        }),
      });
    } catch (error) {
      console.error("Failed to send Telegram order notification", error);
    }

    window.open(`https://wa.me/996708605281?text=${encodeURIComponent(message)}`, "_blank");
    clearCart();
    setHydratedItems([]);
    setName("");
    setPhone("");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white py-20 text-center text-zinc-950 dark:bg-black dark:text-white">
        {t("cartPage.loading")}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6 text-zinc-950 dark:bg-black dark:text-white md:p-12">
      <div className="mx-auto max-w-6xl pt-28">
        <h1 className="mb-8 flex items-center gap-3 text-3xl font-extrabold">
          <ShoppingBag className="text-orange-500" aria-hidden />
          {t("cartPage.title")}
        </h1>

        {hydratedItems.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 py-20 text-center dark:border-zinc-800 dark:bg-zinc-950">
            <p className="mb-6 text-zinc-500 dark:text-zinc-400">{t("cartPage.empty")}</p>
            <Link
              href="/catalog"
              className="inline-block rounded-xl bg-orange-600 px-6 py-3 font-medium text-white transition-colors hover:bg-orange-500"
            >
              {t("cartPage.backToCatalog")}
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-4">
              {hydratedItems.map((item) => {
                const imageUrl = getProductImageUrl(
                  item.productData.image_id?.length ? item.productData.image_id : item.productData.imageUrl ?? "",
                );
                const price = productPrice(item.productData);

                return (
                  <div
                    className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:items-center"
                    key={item.id}
                  >
                    <Link
                      className="flex aspect-square w-full items-center justify-center rounded-lg bg-white p-3 sm:size-24 sm:shrink-0"
                      href={`/product/${item.id}`}
                    >
                      <img
                        alt={productTitle(item.productData, language, t("cartPage.fallbackProduct"))}
                        className="max-h-full max-w-full object-contain"
                        src={imageUrl}
                      />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link href={`/product/${item.id}`}>
                        <h2 className="line-clamp-2 text-lg font-bold text-zinc-950 transition hover:text-orange-500 dark:text-white">
                          {productTitle(item.productData, language, t("cartPage.fallbackProduct"))}
                        </h2>
                      </Link>
                      <p className="mt-2 text-sm text-zinc-500">
                        {t("cartPage.unitPrice", { price: price.toLocaleString("ru-RU") })}
                      </p>
                    </div>

                    <div className="flex w-full items-center justify-between gap-6 border-t border-zinc-200 pt-3 dark:border-zinc-800 sm:w-auto sm:justify-end sm:border-t-0 sm:pt-0">
                      <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                          type="button"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                          type="button"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-zinc-950 dark:text-white sm:text-base">
                          {(price * item.quantity).toLocaleString("ru-RU")} KGS
                        </span>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-zinc-500 transition-colors hover:text-red-500"
                          type="button"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <form
              className="h-fit space-y-6 rounded-xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-950"
              onSubmit={handleWhatsAppSubmit}
            >
              <h2 className="border-b border-zinc-200 pb-3 text-xl font-bold dark:border-zinc-800">{t("cartPage.summary")}</h2>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">{t("cartPage.positions")}</span>
                <span className="font-semibold">{hydratedItems.length}</span>
              </div>
              <div className="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <span className="text-zinc-500 dark:text-zinc-400">{t("cartPage.total")}</span>
                <span className="text-xl font-black text-orange-500">{total.toLocaleString("ru-RU")} KGS</span>
              </div>

              <div className="space-y-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <p className="text-sm font-bold text-zinc-950 dark:text-white">{t("cartPage.contacts")}</p>
                <label className="grid gap-2 text-sm font-bold">
                  {t("cartPage.name")}
                  <input
                    className="h-12 rounded-xl border border-zinc-200 bg-white px-4 font-normal text-zinc-950 outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-black dark:text-white"
                    onChange={(event) => setName(event.target.value)}
                    placeholder={t("cartPage.namePlaceholder")}
                    required
                    value={name}
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  {t("cartPage.phone")}
                  <input
                    className="h-12 rounded-xl border border-zinc-200 bg-white px-4 font-normal text-zinc-950 outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-black dark:text-white"
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder={t("cartPage.phonePlaceholder")}
                    required
                    type="tel"
                    value={phone}
                  />
                </label>
              </div>

              <button
                className="w-full rounded-xl bg-orange-600 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-orange-500"
                type="submit"
              >
                {t("cartPage.submit")}
              </button>
              <p className="text-center text-xs leading-5 text-zinc-500">{t("cartPage.note")}</p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
