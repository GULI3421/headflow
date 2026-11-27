"use client";

import { useCallback, useEffect, useState } from "react";
import { getOrderPdfFilename } from "@/lib/order-pdf";
type OrderStatus = "NEW" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
type AdminOrder = {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerComment: string | null;
  items: {
    name: string;
    variant: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  totalAmount: number;
  status: OrderStatus;
};

const statusLabels: Record<OrderStatus, string> = {
  NEW: "Новый",
  IN_PROGRESS: "В работе",
  COMPLETED: "Завершён",
  CANCELLED: "Отменён",
};

function formatMoney(value: number) {
  return `${value.toLocaleString("ru-RU")} KGS`;
}

export function AdminOrdersPanel({ onInventoryUpdated }: { onInventoryUpdated: () => Promise<void> }) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/orders", { cache: "no-store" });
      const result = await response.json() as { orders?: AdminOrder[]; nextCursor?: string | null; error?: string };
      if (!response.ok) throw new Error(result.error || "Не удалось загрузить заказы.");
      setOrders(result.orders ?? []);
      setNextCursor(result.nextCursor ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить заказы.");
    } finally {
      setLoading(false);
    }
  }, []);

  async function loadMoreOrders() {
    if (!nextCursor || loadingMore) return;

    setLoadingMore(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/orders?cursor=${encodeURIComponent(nextCursor)}`, { cache: "no-store" });
      const result = await response.json() as { orders?: AdminOrder[]; nextCursor?: string | null; error?: string };
      if (!response.ok) throw new Error(result.error || "Не удалось загрузить следующие заказы.");
      setOrders((current) => [...current, ...(result.orders ?? [])]);
      setNextCursor(result.nextCursor ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить следующие заказы.");
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function changeStatus(order: AdminOrder, status: OrderStatus) {
    setSavingId(order.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await response.json() as { order?: AdminOrder; error?: string };
      const updatedOrder = result.order;
      if (!response.ok || !updatedOrder) throw new Error(result.error || "Не удалось изменить статус заказа.");
      setOrders((current) => current.map((item) => item.id === order.id ? updatedOrder : item));
      if ((order.status === "COMPLETED") !== (status === "COMPLETED")) {
        await onInventoryUpdated();
      }
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Не удалось изменить статус заказа.");
    } finally {
      setSavingId(null);
    }
  }

  async function downloadPdf(order: AdminOrder) {
    setDownloadingId(order.id);
    setError("");
    try {
      const { downloadOrderPdf } = await import("@/lib/order-pdf");
      await downloadOrderPdf({
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerComment: order.customerComment ?? "",
        items: order.items.map((item) => ({
          ...item,
          variant: item.variant ?? undefined,
        })),
        total: order.totalAmount,
      });
    } catch (downloadError) {
      console.error("Не удалось скачать PDF заказа", downloadError);
      setError(downloadError instanceof Error ? downloadError.message : "Не удалось сформировать PDF заказа.");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <section className="mt-8 scroll-mt-24" id="orders">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#FF4F00]">Оформления с сайта</p>
          <h2 className="mt-1 text-2xl font-black">Заказы</h2>
        </div>
        <button
          className="rounded-lg border border-black/10 px-4 py-2 text-sm font-bold transition hover:border-[#FF4F00] hover:text-[#FF4F00] disabled:opacity-60 dark:border-white/15"
          disabled={loading}
          onClick={loadOrders}
          type="button"
        >
          Обновить список
        </button>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <p className="rounded-xl border border-black/10 bg-white p-5 text-sm text-black/55 dark:border-white/10 dark:bg-[#151515] dark:text-white/55">
          Загружаем заказы…
        </p>
      ) : orders.length === 0 && !error ? (
        <p className="rounded-xl border border-black/10 bg-white p-5 text-sm text-black/55 dark:border-white/10 dark:bg-[#151515] dark:text-white/55">
          Заказов пока нет.
        </p>
      ) : orders.length > 0 ? (
        <div className="grid gap-4">
          {orders.map((order) => (
            <article className="rounded-xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#151515]" key={order.id}>
              <div className="flex flex-col gap-4 border-b border-black/10 pb-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h3 className="break-all text-base font-black">{getOrderPdfFilename(order.orderNumber)}</h3>
                  <p className="mt-1 text-sm text-black/55 dark:text-white/55">
                    Оформлен {new Date(order.createdAt).toLocaleString("ru-RU", { timeZone: "Asia/Bishkek" })}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                  <p className="text-lg font-black text-[#FF4F00]">{formatMoney(order.totalAmount)}</p>
                  <button
                    className="h-10 rounded-lg bg-[#FF4F00] px-4 text-sm font-bold text-white transition hover:bg-[#e64800] disabled:cursor-wait disabled:opacity-60"
                    disabled={downloadingId === order.id}
                    onClick={() => void downloadPdf(order)}
                    type="button"
                  >
                    {downloadingId === order.id ? "Формируем PDF…" : "Скачать PDF"}
                  </button>
                </div>
              </div>

              <div className="border-b border-black/10 py-4 dark:border-white/10">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <label className="text-xs font-bold uppercase tracking-wide text-black/45 dark:text-white/45" htmlFor={`order-status-${order.id}`}>
                    Статус заказа
                  </label>
                  <select
                    className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold outline-none focus:border-[#FF4F00] dark:border-white/15 dark:bg-[#1d1d1d]"
                    disabled={savingId === order.id}
                    id={`order-status-${order.id}`}
                    onChange={(event) => {
                      const status = event.target.value;
                      if (status === "NEW" || status === "IN_PROGRESS" || status === "COMPLETED" || status === "CANCELLED") {
                        void changeStatus(order, status);
                      }
                    }}
                    value={order.status}
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-4 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-black/45 dark:text-white/45">Клиент</p>
                    <p className="mt-1 font-bold">{order.customerName}</p>
                    <a className="mt-1 inline-block font-semibold text-[#d94300] hover:underline dark:text-[#ff7640]" href={`tel:${order.customerPhone}`}>
                      {order.customerPhone}
                    </a>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-black/45 dark:text-white/45">Комментарий / адрес</p>
                    <p className="mt-1 whitespace-pre-wrap break-words">{order.customerComment || "Не указан"}</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-black/45 dark:text-white/45">
                    <tr>
                      <th className="py-3 pr-3">Товар и вариант</th>
                      <th className="py-3 px-3 text-right">Количество</th>
                      <th className="py-3 px-3 text-right">Цена за шт.</th>
                      <th className="py-3 pl-3 text-right">Сумма</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/10">
                    {order.items.map((item, index) => (
                      <tr key={`${item.name}-${item.variant ?? ""}-${index}`}>
                        <td className="py-3 pr-3 font-semibold">{item.name}{item.variant ? ` · ${item.variant}` : ""}</td>
                        <td className="py-3 px-3 text-right">{item.quantity}</td>
                        <td className="py-3 px-3 text-right">{formatMoney(item.unitPrice)}</td>
                        <td className="py-3 pl-3 text-right font-bold">{formatMoney(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex justify-end border-t border-black/10 pt-4 dark:border-white/10">
                <p className="text-right text-sm font-semibold text-black/55 dark:text-white/55">
                  Итого: <span className="ml-2 text-lg font-black text-[#FF4F00]">{formatMoney(order.totalAmount)}</span>
                </p>
              </div>
            </article>
          ))}
          {nextCursor && (
            <button
              className="mx-auto rounded-lg border border-black/10 px-5 py-2.5 text-sm font-bold transition hover:border-[#FF4F00] hover:text-[#FF4F00] disabled:opacity-60 dark:border-white/15"
              disabled={loadingMore}
              onClick={() => void loadMoreOrders()}
              type="button"
            >
              {loadingMore ? "Загружаем…" : "Загрузить ещё заказы"}
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}
