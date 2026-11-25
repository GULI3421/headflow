"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/src/i18n/config";

type OrderStatus = "NEW" | "IN_PROGRESS" | "COMPLETED";
type PublicOrder = {
  orderNumber: string;
  createdAt: string;
  status: OrderStatus;
  items: { name: string; variant: string | null; quantity: number }[];
  totalAmount: number;
};

function statusKey(status: OrderStatus) {
  if (status === "IN_PROGRESS") return "inProgress";
  if (status === "COMPLETED") return "completed";
  return "new";
}

export default function OrdersPage() {
  const { i18n, t } = useTranslation();
  const [orders, setOrders] = useState<PublicOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      ? "en"
      : "ru-RU";

  return (
    <div className="min-h-screen bg-white px-5 pb-20 pt-32 text-zinc-950 dark:bg-black dark:text-white md:px-10">
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

        {loading ? (
          <p className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            {t("ordersPage.loading")}
          </p>
        ) : orders.length === 0 && !error ? (
          <p className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            {t("ordersPage.empty")}
          </p>
        ) : orders.length > 0 ? (
          <div className="mt-8 grid gap-4">
            {orders.map((order) => (
              <article className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950" key={order.orderNumber}>
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
                  <div>
                    <h2 className="text-lg font-black">{t("ordersPage.number", { number: order.orderNumber })}</h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.createdAt))}
                    </p>
                  </div>
                  <span className="rounded-full border border-orange-500/25 bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-700 dark:text-orange-300">
                    {t(`ordersPage.status.${statusKey(order.status)}`)}
                  </span>
                </div>

                <ul className="grid gap-2 py-4 text-sm">
                  {order.items.map((item, index) => (
                    <li className="flex flex-wrap justify-between gap-x-4 gap-y-1" key={`${item.name}-${item.variant ?? ""}-${index}`}>
                      <span>
                        {item.name}
                        {item.variant ? ` · ${item.variant}` : ""}
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400">{t("ordersPage.quantity", { quantity: item.quantity })}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
                  <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">{t("ordersPage.total")}</span>
                  <span className="text-lg font-black text-[#FF4F00]">{order.totalAmount.toLocaleString(locale)} KGS</span>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
