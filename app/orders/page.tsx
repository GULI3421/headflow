"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Loader2 } from "lucide-react";
import "@/src/i18n/config";

type PublicOrder = {
  orderNumber: string;
  createdAt: string;
  items: { name: string; variant: string | null; quantity: number }[];
  totalAmount: number;
};

export default function OrdersPage() {
  const { i18n, t } = useTranslation();
  const [orders, setOrders] = useState<PublicOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfError, setPdfError] = useState("");
  const [downloadingOrderNumber, setDownloadingOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadOrders() {
      try {
        const response = await fetch("/api/orders", { cache: "no-store" });
        const result = await response.json() as { orders?: PublicOrder[]; error?: string };
        if (!response.ok) throw new Error(result.error || t("ordersPage.loadError"));
        if (!ignore) {
          setOrders(result.orders ?? []);
          setError("");
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : t("ordersPage.loadError"));
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadOrders();
    return () => {
      ignore = true;
    };
  }, [t]);

  const locale = i18n.resolvedLanguage?.startsWith("ky")
    ? "ky-KG"
    : i18n.resolvedLanguage?.startsWith("en")
      ? "en-GB"
      : "ru-RU";

  async function downloadOrderPdf(order: PublicOrder) {
    setDownloadingOrderNumber(order.orderNumber);
    setPdfError("");

    try {
      const { downloadOrderSummaryPdf } = await import("@/lib/order-pdf");
      await downloadOrderSummaryPdf({
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        items: order.items.map(({ name, variant, quantity }) => ({
          name,
          variant: variant ?? undefined,
          quantity,
        })),
        total: order.totalAmount,
      });
    } catch (downloadError) {
      console.error("Не удалось скачать публичный PDF заказа", downloadError);
      setPdfError(downloadError instanceof Error ? downloadError.message : t("ordersPage.pdfError"));
    } finally {
      setDownloadingOrderNumber(null);
    }
  }

  return (
    <div className="min-h-screen bg-white px-5 pb-20 pt-36 text-zinc-950 dark:bg-black dark:text-white md:px-10 md:pt-40">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#FF4F00]">Центр отопления</p>
            <h1 className="mt-2 text-3xl font-black md:text-4xl">{t("ordersPage.title")}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {t("ordersPage.description")}
            </p>
          </div>
          <Link className="rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-500" href="/cart">
            {t("ordersPage.cartLink")}
          </Link>
        </div>

        {error && (
          <p role="alert" className="mt-6 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
        {pdfError && (
          <p role="alert" className="mt-6 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300">
            {pdfError}
          </p>
        )}

        {loading ? (
          <p className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            {t("ordersPage.loading")}
          </p>
        ) : orders.length === 0 && !error ? (
          <p className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            {t("ordersPage.empty")}
          </p>
        ) : orders.length > 0 ? (
          <div className="mt-8 overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
            <table aria-label={t("ordersPage.tableLabel")} className="w-full min-w-[640px] border-collapse text-left">
              <thead className="bg-zinc-100 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="w-20 px-5 py-4" scope="col">{t("ordersPage.rowNumber")}</th>
                  <th className="px-5 py-4" scope="col">{t("ordersPage.date")}</th>
                  <th className="px-5 py-4" scope="col">{t("ordersPage.amount")}</th>
                  <th className="w-36 px-5 py-4 text-right" scope="col">{t("ordersPage.downloadPdf")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {orders.map((order, index) => (
                  <tr className="transition-colors hover:bg-orange-500/[0.04]" key={order.orderNumber}>
                    <td className="px-5 py-4 text-sm font-bold text-zinc-500 dark:text-zinc-400">{index + 1}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold">
                      {new Intl.DateTimeFormat(locale, {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Bishkek",
                      }).format(new Date(order.createdAt)).replace(", ", " ")}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm font-black text-[#FF4F00]">
                      {new Intl.NumberFormat(locale).format(order.totalAmount)} сом
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        aria-label={`${t("ordersPage.downloadPdf")} ${index + 1}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#FF4F00] px-3 py-2 text-sm font-bold text-white transition hover:bg-orange-500 disabled:cursor-wait disabled:opacity-60"
                        disabled={downloadingOrderNumber !== null}
                        onClick={() => void downloadOrderPdf(order)}
                        type="button"
                      >
                        {downloadingOrderNumber === order.orderNumber
                          ? <Loader2 className="animate-spin" size={16} aria-hidden />
                          : <Download size={16} aria-hidden />}
                        <span>{t("ordersPage.downloadPdf")}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
