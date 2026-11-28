"use client";

import { useCallback, useEffect, useState } from "react";

type EstimateStatus = "NEW" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
type TelegramStatus = "PENDING" | "SENT" | "FAILED";
type Estimate = {
  id: string;
  name: string;
  phone: string;
  totalAmount: number;
  parameters: {
    area: number;
    windows: number;
    ceilingHeight: number;
    insulation: string;
    heatingSource: string;
    includeChimney: boolean;
    includeUnderfloor: boolean;
    deliveryMode: string;
    includeInstallation: boolean;
  };
  breakdown: { label: string; detail: string; amount: number }[];
  status: EstimateStatus;
  telegramStatus: TelegramStatus;
  telegramError: string | null;
  telegramSentAt: string | null;
  createdAt: string;
};

const statusLabels: Record<EstimateStatus, string> = {
  NEW: "Новая",
  IN_PROGRESS: "В работе",
  COMPLETED: "Завершена",
  CANCELLED: "Отменена",
};

const telegramStatusLabels: Record<TelegramStatus, string> = {
  PENDING: "Ожидает подтверждения",
  SENT: "Отправлено",
  FAILED: "Ошибка отправки",
};

function formatMoney(value: number) {
  return `${value.toLocaleString("ru-RU")} KGS`;
}

export function AdminCalculatorEstimatesPanel() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const loadEstimates = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/calculator-estimates", { cache: "no-store" });
      const result = await response.json() as { estimates?: Estimate[]; nextCursor?: string | null; error?: string };
      if (!response.ok) throw new Error(result.error || "Не удалось загрузить сметы.");
      setEstimates(result.estimates ?? []);
      setNextCursor(result.nextCursor ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить сметы.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEstimates();
  }, [loadEstimates]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/calculator-estimates?cursor=${encodeURIComponent(nextCursor)}`,
        { cache: "no-store" },
      );
      const result = await response.json() as { estimates?: Estimate[]; nextCursor?: string | null; error?: string };
      if (!response.ok) throw new Error(result.error || "Не удалось загрузить следующие сметы.");
      setEstimates((current) => [...current, ...(result.estimates ?? [])]);
      setNextCursor(result.nextCursor ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить следующие сметы.");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <section className="mt-8 scroll-mt-24" id="calculator-estimates">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#FF4F00]">Расчёты с сайта</p>
          <h2 className="mt-1 text-2xl font-black">Заявки калькулятора</h2>
        </div>
        <button
          className="rounded-lg border border-black/10 px-4 py-2 text-sm font-bold transition hover:border-[#FF4F00] hover:text-[#FF4F00] disabled:opacity-60 dark:border-white/15"
          disabled={loading}
          onClick={() => void loadEstimates()}
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
          Загружаем сметы…
        </p>
      ) : estimates.length === 0 && !error ? (
        <p className="rounded-xl border border-black/10 bg-white p-5 text-sm text-black/55 dark:border-white/10 dark:bg-[#151515] dark:text-white/55">
          Заявок из калькулятора пока нет.
        </p>
      ) : (
        <div className="grid gap-4">
          {estimates.map((estimate) => (
            <article
              className="rounded-xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#151515]"
              key={estimate.id}
            >
              <div className="flex flex-col gap-3 border-b border-black/10 pb-4 dark:border-white/10 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="break-all text-base font-black">Смета №{estimate.id}</h3>
                  <p className="mt-1 text-sm text-black/55 dark:text-white/55">
                    Создана {new Date(estimate.createdAt).toLocaleString("ru-RU", { timeZone: "Asia/Bishkek" })}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-lg font-black text-[#FF4F00]">{formatMoney(estimate.totalAmount)}</p>
                  <p className="mt-1 text-sm font-semibold">Статус: {statusLabels[estimate.status]}</p>
                </div>
              </div>

              <div className="grid gap-4 border-b border-black/10 py-4 text-sm dark:border-white/10 md:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-black/45 dark:text-white/45">Клиент</p>
                  <p className="mt-1 font-bold">{estimate.name}</p>
                  <a className="mt-1 inline-block font-semibold text-[#d94300] hover:underline dark:text-[#ff7640]" href={`tel:${estimate.phone}`}>
                    {estimate.phone}
                  </a>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-black/45 dark:text-white/45">Telegram</p>
                  <p className={`mt-1 font-bold ${estimate.telegramStatus === "FAILED" ? "text-red-600 dark:text-red-400" : ""}`}>
                    {telegramStatusLabels[estimate.telegramStatus]}
                    {estimate.telegramSentAt && ` · ${new Date(estimate.telegramSentAt).toLocaleString("ru-RU", { timeZone: "Asia/Bishkek" })}`}
                  </p>
                  {estimate.telegramError && <p className="mt-1 break-words text-red-600 dark:text-red-400">{estimate.telegramError}</p>}
                </div>
              </div>

              <div className="grid gap-3 border-b border-black/10 py-4 text-sm dark:border-white/10 sm:grid-cols-2 lg:grid-cols-3">
                <p><span className="font-bold">Площадь:</span> {estimate.parameters.area} м²</p>
                <p><span className="font-bold">Окон:</span> {estimate.parameters.windows}</p>
                <p><span className="font-bold">Высота потолка:</span> {estimate.parameters.ceilingHeight} м</p>
                <p><span className="font-bold">Утепление:</span> {estimate.parameters.insulation}</p>
                <p><span className="font-bold">Отопление:</span> {estimate.parameters.heatingSource}</p>
                <p><span className="font-bold">Доставка:</span> {estimate.parameters.deliveryMode}</p>
                <p><span className="font-bold">Дымоход:</span> {estimate.parameters.includeChimney ? "Да" : "Нет"}</p>
                <p><span className="font-bold">Тёплый пол:</span> {estimate.parameters.includeUnderfloor ? "Да" : "Нет"}</p>
                <p><span className="font-bold">Монтаж:</span> {estimate.parameters.includeInstallation ? "Да" : "Нет"}</p>
              </div>

              <div className="grid gap-2 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wide text-black/45 dark:text-white/45">Детализация расчёта</h4>
                {estimate.breakdown.map((item) => (
                  <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm" key={item.label}>
                    <span><span className="font-bold">{item.label}:</span> {item.detail}</span>
                    <span className="font-bold">{formatMoney(item.amount)}</span>
                  </div>
                ))}
                <div className="mt-2 flex justify-between border-t border-black/10 pt-3 text-sm font-black dark:border-white/10">
                  <span>Итого</span>
                  <span className="text-[#FF4F00]">{formatMoney(estimate.totalAmount)}</span>
                </div>
              </div>
            </article>
          ))}
          {nextCursor && (
            <button
              className="mx-auto rounded-lg border border-black/10 px-5 py-2.5 text-sm font-bold transition hover:border-[#FF4F00] hover:text-[#FF4F00] disabled:opacity-60 dark:border-white/15"
              disabled={loadingMore}
              onClick={() => void loadMore()}
              type="button"
            >
              {loadingMore ? "Загружаем…" : "Загрузить ещё сметы"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
