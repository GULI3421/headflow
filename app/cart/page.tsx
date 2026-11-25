"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { getProductImageUrl } from "@/src/lib/appwrite";
import { normalizePhone, validatePhone } from "@/lib/phone";
import type { OrderPdfData } from "@/lib/order-pdf";
import { listCartProductDocuments, type CartProductDocument } from "@/src/lib/products-api";
import "@/src/i18n/config";
import { useCartStore } from "@/store/cart-store";

type HydratedCartItem = {
  id: string;
  quantity: number;
  variantPower?: string;
  productData: CartProductDocument;
};

function productTitle(product: CartProductDocument, language: string, fallback: string) {
  if (language.startsWith("ky")) {
    return product.title_ky || product.title_ru || product.title_en || fallback;
  }

  if (language.startsWith("en")) {
    return product.title_en || product.title_ru || product.title_ky || fallback;
  }

  return product.title_ru || product.title_en || product.title_ky || fallback;
}

function productPrice(product: CartProductDocument) {
  return Number(product.price) || 0;
}

function productStock(product: CartProductDocument) {
  const stock = product.stockQuantity ?? product.stock;
  return typeof stock === "number" && Number.isFinite(stock) ? stock : undefined;
}

export default function CartPage() {
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language ?? "ru";
  const cartItems = useCartStore((state) => state.items);
  const hydrateCart = useCartStore((state) => state.hydrateCart);
  const updateCartQuantity = useCartStore((state) => state.updateQuantity);
  const removeCartItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const [productDataByCartId, setProductDataByCartId] = useState<Record<string, CartProductDocument>>({});
  const [loading, setLoading] = useState(true);
  const [cartLoadError, setCartLoadError] = useState("");
  const [unavailableCartIds, setUnavailableCartIds] = useState<string[]>([]);
  const [cartLoadAttempt, setCartLoadAttempt] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [comment, setComment] = useState("");
  const [lastOrder, setLastOrder] = useState<OrderPdfData | null>(null);
  const [pdfError, setPdfError] = useState("");
  const [orderError, setOrderError] = useState("");
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const cartProductIdentity = useMemo(
    () => JSON.stringify(cartItems.map((item) => [item.id, item.productId ?? item.id, item.variantPower ?? null])),
    [cartItems],
  );

  useEffect(() => {
    hydrateCart();
  }, [hydrateCart]);

  useEffect(() => {
    let ignore = false;

    async function fetchCartProducts() {
      try {
        if (cartItems.length === 0) {
          setProductDataByCartId({});
          setCartLoadError("");
          setUnavailableCartIds([]);
          setLoading(false);
          return;
        }

        const itemsToLoad = cartItems.filter((item) => !productDataByCartId[item.id]);
        if (itemsToLoad.length === 0) {
          setCartLoadError("");
          setUnavailableCartIds([]);
          setLoading(false);
          return;
        }

        setLoading(true);
        setCartLoadError("");
        setUnavailableCartIds([]);
        const ids = itemsToLoad.map((item) => item.productId ?? item.id).filter(Boolean);
        const response = await listCartProductDocuments(ids);

        if (ignore) return;

        const combined = itemsToLoad
          .map((cartRecord) => {
            const matched = response.documents.find((document) => document.id === (cartRecord.productId ?? cartRecord.id));
            const variant = cartRecord.variantPower
              ? matched?.powerVariants?.find((item) => item.power === cartRecord.variantPower)
              : undefined;

            return matched
              ? {
                  id: cartRecord.id,
                  productData: variant
                    ? {
                        ...matched,
                        price: variant.price,
                        oldPrice: variant.oldPrice,
                        old_price: variant.oldPrice,
                        stockQuantity: variant.stockQuantity,
                      }
                    : matched,
                }
              : null;
          })
          .filter((item): item is { id: string; productData: CartProductDocument } => item !== null);
        const unavailableIds = itemsToLoad
          .filter((item) => !combined.some((loaded) => loaded.id === item.id))
          .map((item) => item.id);
        setUnavailableCartIds(unavailableIds);
        setCartLoadError(unavailableIds.length > 0 ? t("cartPage.unavailableProducts") : "");

        for (const { id, productData } of combined) {
          const cartRecord = itemsToLoad.find((item) => item.id === id);
          const availableStock = productStock(productData);
          if (cartRecord && availableStock !== undefined && cartRecord.quantity > availableStock) {
            updateCartQuantity(id, availableStock, availableStock);
          }
        }

        setProductDataByCartId((current) => ({
          ...current,
          ...Object.fromEntries(combined.map(({ id, productData }) => [id, productData])),
        }));
      } catch (error) {
        console.error("Cart hydration error:", error);
        if (!ignore) {
          setCartLoadError(t("cartPage.productsLoadError"));
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
  }, [cartLoadAttempt, cartProductIdentity, t, updateCartQuantity]);

  const hydratedItems = useMemo(
    () => cartItems.flatMap((item) => {
      const productData = productDataByCartId[item.id];
      return productData
        ? [{ id: item.id, quantity: item.quantity, variantPower: item.variantPower, productData }]
        : [];
    }),
    [cartItems, productDataByCartId],
  );

  const total = useMemo(
    () => hydratedItems.reduce((sum, item) => sum + productPrice(item.productData) * item.quantity, 0),
    [hydratedItems],
  );
  const phoneError = phoneTouched ? validatePhone(phone) : "";

  function retryCartProducts() {
    setProductDataByCartId({});
    setCartLoadAttempt((attempt) => attempt + 1);
  }

  function removeUnavailableProducts() {
    unavailableCartIds.forEach((id) => removeCartItem(id));
  }

  function updateQuantity(id: string, delta: number) {
    const currentItem = cartItems.find((item) => item.id === id);
    if (!currentItem) return;

    const hydratedItem = hydratedItems.find((item) => item.id === id);
    updateCartQuantity(id, currentItem.quantity + delta, hydratedItem ? productStock(hydratedItem.productData) : undefined);
  }

  function removeItem(id: string) {
    removeCartItem(id);
  }

  async function handleWhatsAppSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || hydratedItems.length === 0) return;
    if (cartLoadError || hydratedItems.length !== cartItems.length) return;

    setPhoneTouched(true);
    if (validatePhone(phone)) return;
    const normalizedPhone = normalizePhone(phone);
    const whatsappWindow = window.open("about:blank", "_blank");

    const createdAt = new Date();
    const orderDate = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Bishkek",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(createdAt).replaceAll("-", "");
    const orderNumber = `CO-${orderDate}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    let order: OrderPdfData = {
      orderNumber,
      createdAt: createdAt.toISOString(),
      customerName: name.trim(),
      customerPhone: normalizedPhone,
      customerComment: comment.trim(),
      items: hydratedItems.map((item) => {
        const unitPrice = productPrice(item.productData);
        return {
          name: item.productData.title_ru || productTitle(item.productData, "ru", t("cartPage.fallbackProduct")),
          variant: item.variantPower,
          quantity: item.quantity,
          unitPrice,
          lineTotal: unitPrice * item.quantity,
        };
      }),
      total,
    };
    setPdfError("");
    setOrderError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerComment: order.customerComment,
          items: hydratedItems.map((item) => ({
            productId: item.productData.id,
            variant: item.variantPower,
            quantity: item.quantity,
          })),
        }),
      });
      const result = await response.json() as {
        order?: {
          createdAt: string;
          items: {
            name: string;
            variant: string | null;
            quantity: number;
            unitPrice: number;
            lineTotal: number;
          }[];
          totalAmount: number;
        };
        error?: string;
      };
      if (!response.ok || !result.order) throw new Error(result.error || "Не удалось сохранить заказ.");
      const savedOrder: OrderPdfData = {
        ...order,
        createdAt: result.order.createdAt,
        items: result.order.items.map(({ variant, ...item }) => ({
          ...item,
          variant: variant ?? undefined,
        })),
        total: result.order.totalAmount,
      };
      setLastOrder(savedOrder);
      order = savedOrder;
    } catch (error) {
      whatsappWindow?.close();
      console.error("Не удалось сохранить заказ", error);
      setOrderError(error instanceof Error ? error.message : "Не удалось сохранить заказ. Попробуйте ещё раз.");
      setSubmitting(false);
      return;
    }

    const itemsListText = hydratedItems
      .map((item, index) => {
        const savedItem = order.items[index];
        const lineTotal = savedItem.lineTotal;
        const title = productTitle(item.productData, language, t("cartPage.fallbackProduct"));
        const variant = savedItem.variant ? ` · ${savedItem.variant}` : "";
        return `${index + 1}. ${title}${variant} x ${savedItem.quantity} — ${lineTotal.toLocaleString("ru-RU")} KGS`;
      })
      .join("\n");

    const message = t("cartPage.whatsappMessage", {
      name,
      phone: order.customerPhone,
      items: itemsListText,
      total: order.total.toLocaleString("ru-RU"),
      orderNumber,
      commentLine: comment.trim() ? `\n${t("cartPage.comment")}: ${comment.trim()}` : "",
    });

    const whatsappUrl = `https://wa.me/996708605281?text=${encodeURIComponent(message)}`;
    if (whatsappWindow) {
      whatsappWindow.location.href = whatsappUrl;
    } else {
      window.open(whatsappUrl, "_blank");
    }

    await handleDownloadOrderPdf(order);

    try {
      await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: order.customerPhone,
          message: [comment.trim(), `Номер заказа: ${orderNumber}`].filter(Boolean).join("\n"),
          items: itemsListText,
          total: order.total.toLocaleString("ru-RU"),
          type: `${t("cartPage.telegramType")} № ${orderNumber}`,
        }),
      });
    } catch (error) {
      console.error("Failed to send Telegram order notification", error);
    }

    clearCart();
    setName("");
    setPhone("");
    setComment("");
    setSubmitting(false);
  }

  async function handleDownloadOrderPdf(order: OrderPdfData) {
    if (validatePhone(order.customerPhone)) {
      setPdfError("Нельзя скачать PDF: проверьте номер телефона в заказе.");
      return;
    }

    setPdfDownloading(true);
    setPdfError("");
    try {
      const { downloadOrderPdf } = await import("@/lib/order-pdf");
      await downloadOrderPdf(order);
    } catch (error) {
      console.error("Failed to download order PDF", error);
      setPdfError(t("cartPage.pdfError"));
    } finally {
      setPdfDownloading(false);
    }
  }

  if (loading && hydratedItems.length === 0) {
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

        {lastOrder && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-green-500/25 bg-green-500/[0.06] p-4">
            <div>
              <p role="status" className="font-bold text-green-700 dark:text-green-300">
                {t("cartPage.orderReady", { orderNumber: lastOrder.orderNumber })}
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t("cartPage.pdfReadyNote")}</p>
            </div>
            <button
              className="rounded-lg bg-[#FF4F00] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-500 disabled:cursor-wait disabled:opacity-60"
              disabled={pdfDownloading || Boolean(validatePhone(lastOrder.customerPhone))}
              onClick={() => handleDownloadOrderPdf(lastOrder)}
              type="button"
            >
              {pdfDownloading ? t("cartPage.downloadingPdf") : t("cartPage.downloadPdf")}
            </button>
          </div>
        )}
        {pdfError && (
          <p role="alert" className="mb-6 rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300">
            {pdfError}
          </p>
        )}
        {orderError && (
          <p role="alert" className="mb-6 rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300">
            {orderError}
          </p>
        )}
        {cartLoadError && (
          <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-800 dark:text-amber-200">
            <span>{cartLoadError}</span>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-md border border-current/20 px-3 py-1.5 text-xs font-bold hover:bg-black/5 dark:hover:bg-white/10"
                onClick={retryCartProducts}
                type="button"
              >
                {t("cartPage.retryProducts")}
              </button>
              {unavailableCartIds.length > 0 && (
                <button
                  className="rounded-md border border-current/20 px-3 py-1.5 text-xs font-bold hover:bg-black/5 dark:hover:bg-white/10"
                  onClick={removeUnavailableProducts}
                  type="button"
                >
                  {t("cartPage.removeUnavailableProducts")}
                </button>
              )}
            </div>
          </div>
        )}

        {cartItems.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 py-20 text-center dark:border-zinc-800 dark:bg-zinc-950">
            <p className="mb-6 text-zinc-500 dark:text-zinc-400">{t("cartPage.empty")}</p>
            <Link
              href="/catalog"
              className="inline-block rounded-xl bg-orange-600 px-6 py-3 font-medium text-white transition-colors hover:bg-orange-500"
            >
              {t("cartPage.backToCatalog")}
            </Link>
          </div>
        ) : hydratedItems.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {cartLoadError || t("cartPage.productsLoadError")}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <button
                className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-orange-500"
                onClick={retryCartProducts}
                type="button"
              >
                {t("cartPage.retryProducts")}
              </button>
              {unavailableCartIds.length > 0 && (
                <button
                  className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-bold transition hover:border-orange-500 dark:border-zinc-700"
                  onClick={removeUnavailableProducts}
                  type="button"
                >
                  {t("cartPage.removeUnavailableProducts")}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-4">
              {hydratedItems.map((item) => {
                const imageUrl = getProductImageUrl(
                  item.productData.image_id?.length ? item.productData.image_id : item.productData.imageUrl ?? "",
                );
                const price = productPrice(item.productData);
                const availableStock = productStock(item.productData);

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
                          {item.variantPower ? ` · ${item.variantPower}` : ""}
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
                          aria-label="Уменьшить количество"
                          className="rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                          type="button"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          aria-label="Увеличить количество"
                          disabled={availableStock !== undefined && item.quantity >= availableStock}
                          className="rounded p-1 text-zinc-500 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
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
                    aria-describedby={phoneError ? "cart-phone-error" : undefined}
                    aria-invalid={Boolean(phoneError)}
                    className={`h-12 rounded-xl border bg-white px-4 font-normal text-zinc-950 outline-none focus:border-orange-500 dark:bg-black dark:text-white ${
                      phoneError
                        ? "border-red-500 dark:border-red-500"
                        : "border-zinc-200 dark:border-zinc-800"
                    }`}
                    onChange={(event) => setPhone(event.target.value)}
                    onBlur={() => setPhoneTouched(true)}
                    placeholder={t("cartPage.phonePlaceholder")}
                    type="tel"
                    value={phone}
                  />
                  {phoneError && (
                    <span className="text-xs font-medium text-red-600 dark:text-red-400" id="cart-phone-error" role="alert">
                      {phoneError}
                    </span>
                  )}
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  {t("cartPage.comment")}
                  <textarea
                    className="min-h-24 resize-y rounded-xl border border-zinc-200 bg-white px-4 py-3 font-normal text-zinc-950 outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-black dark:text-white"
                    onChange={(event) => setComment(event.target.value)}
                    placeholder={t("cartPage.commentPlaceholder")}
                    value={comment}
                  />
                </label>
              </div>

              <button
                className="w-full rounded-xl bg-orange-600 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-orange-500 disabled:cursor-wait disabled:opacity-60"
                disabled={submitting || pdfDownloading || loading || Boolean(cartLoadError) || hydratedItems.length !== cartItems.length}
                type="submit"
              >
                {submitting ? t("cartPage.processing") : t("cartPage.submit")}
              </button>
              <p className="text-center text-xs leading-5 text-zinc-500">{t("cartPage.note")}</p>
              <Link className="block text-center text-sm font-semibold text-orange-600 underline-offset-4 hover:underline dark:text-orange-400" href="/orders">
                {t("cartPage.ordersLink")}
              </Link>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
