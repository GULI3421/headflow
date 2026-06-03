"use client";

import { motion } from "framer-motion";
import { Calculator, Home, Loader2, Phone, Ruler, Send, ThermometerSun, Wrench } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import "@/src/i18n/config";

const ceilingHeights = [2.5, 2.8, 3.0, 3.5];
const insulationLevels = ["poor", "standard", "high"] as const;

const insulationMultipliers: Record<(typeof insulationLevels)[number], number> = {
  poor: 1.2,
  standard: 1,
  high: 0.8,
};

const prices = {
  radiatorSection: 1200,
  pipeMeter: 90,
  ballValve: 350,
  bracket: 80,
  mayevskyValve: 150,
  installationPerSquareMeter: 450,
  installationPerRadiator: 800,
};

function formatMoney(value: number) {
  return Math.round(value).toLocaleString("ru-RU");
}

export default function CalculatorPage() {
  const { t } = useTranslation();
  const [area, setArea] = useState(100);
  const [windows, setWindows] = useState(5);
  const [ceilingHeight, setCeilingHeight] = useState(2.8);
  const [insulation, setInsulation] = useState<(typeof insulationLevels)[number]>("standard");
  const [includeInstallation, setIncludeInstallation] = useState(true);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const estimate = useMemo(() => {
    const safeArea = Math.max(1, area);
    const radiatorCount = Math.max(1, windows);
    const baseWatts = safeArea * 100;
    const ceilingMultiplier = ceilingHeight > 2.8 ? 1.15 : 1;
    const insulationMultiplier = insulationMultipliers[insulation];
    const totalWatts = baseWatts * ceilingMultiplier * insulationMultiplier;
    const totalKilowatts = totalWatts / 1000;
    const totalSections = Math.ceil(totalWatts / 150);
    const sectionsPerRadiator = Math.max(1, Math.round(totalSections / radiatorCount));
    const pipeMeters = Math.ceil(safeArea * 2.5);
    const ballValves = radiatorCount * 2;
    const brackets = radiatorCount * 4;
    const mayevskyValves = radiatorCount;
    const radiatorsCost = totalSections * prices.radiatorSection;
    const fittingsCost =
      pipeMeters * prices.pipeMeter +
      ballValves * prices.ballValve +
      brackets * prices.bracket +
      mayevskyValves * prices.mayevskyValve;
    const installationCost = includeInstallation
      ? safeArea * prices.installationPerSquareMeter + radiatorCount * prices.installationPerRadiator
      : 0;

    return {
      radiatorCount,
      ceilingMultiplier,
      insulationMultiplier,
      totalWatts,
      totalKilowatts,
      totalSections,
      sectionsPerRadiator,
      pipeMeters,
      ballValves,
      brackets,
      mayevskyValves,
      radiatorsCost,
      fittingsCost,
      installationCost,
      grandTotal: radiatorsCost + fittingsCost + installationCost,
    };
  }, [area, ceilingHeight, includeInstallation, insulation, windows]);

  async function sendEstimate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitStatus("loading");

    const items = [
      `${t("calculatorPage.summary.area")}: ${area} m2`,
      `${t("calculatorPage.summary.windows")}: ${estimate.radiatorCount}`,
      `${t("calculatorPage.summary.ceiling")}: ${ceilingHeight} m`,
      `${t("calculatorPage.summary.insulation")}: ${t(`calculatorPage.insulation.${insulation}.title`)}`,
      `${t("calculatorPage.summary.power")}: ${estimate.totalKilowatts.toFixed(2)} kW`,
      `${t("calculatorPage.summary.radiators")}: ${estimate.radiatorCount} x ${estimate.sectionsPerRadiator} ${t("calculatorPage.units.sections")}`,
      `${t("calculatorPage.summary.totalSections")}: ${estimate.totalSections}`,
      `${t("calculatorPage.summary.pipes")}: ${estimate.pipeMeters} m`,
      `${t("calculatorPage.summary.fittings")}: ${estimate.ballValves} ${t("calculatorPage.units.valves")}, ${estimate.brackets} ${t("calculatorPage.units.brackets")}, ${estimate.mayevskyValves} ${t("calculatorPage.units.mayevsky")}`,
      `${t("calculatorPage.summary.installation")}: ${includeInstallation ? t("common.yes", { defaultValue: "Yes" }) : t("common.no", { defaultValue: "No" })}`,
    ].join("\n");

    try {
      const response = await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactName || t("calculatorPage.estimate.clientFallback"),
          phone: contactPhone || t("calculatorPage.estimate.phoneFallback"),
          items,
          total: estimate.grandTotal,
          type: t("calculatorPage.estimate.telegramType"),
        }),
      });

      if (!response.ok) {
        throw new Error("Telegram estimate request failed");
      }

      setSubmitStatus("success");
    } catch (error) {
      console.error("Failed to send calculator estimate", error);
      setSubmitStatus("error");
    }
  }

  const breakdownRows = [
    [t("calculatorPage.estimate.power"), `${estimate.totalKilowatts.toFixed(2)} kW`],
    [t("calculatorPage.estimate.radiators"), `${formatMoney(estimate.radiatorsCost)} KGS`],
    [t("calculatorPage.estimate.fittings"), `${formatMoney(estimate.fittingsCost)} KGS`],
    [t("calculatorPage.estimate.installation"), `${formatMoney(estimate.installationCost)} KGS`],
  ];
  const recommendationVariant = area >= 120 ? "largeArea" : "default";

  return (
    <main className="min-h-screen bg-zinc-50 pt-28 text-zinc-950 dark:bg-[#0a0a0a] dark:text-zinc-50">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <motion.header animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 14 }} transition={{ duration: 0.3 }}>
          <div className="inline-flex items-center gap-2 rounded-md border border-orange-500/25 bg-orange-500/10 px-3 py-2 text-sm font-black uppercase text-orange-600 dark:text-orange-400">
            <Calculator size={16} aria-hidden />
            {t("calculatorPage.eyebrow")}
          </div>
          <h1 className="mt-5 text-3xl font-black leading-tight md:text-5xl">{t("calculatorPage.title")}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400 md:text-base">
            {t("calculatorPage.description")}
          </p>
        </motion.header>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <motion.section
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 lg:col-span-7"
            initial={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-md bg-orange-500 text-white">
                <Home size={22} aria-hidden />
              </div>
              <div>
                <p className="text-xs font-black uppercase text-zinc-500">{t("calculatorPage.steps.object")}</p>
                <h2 className="text-xl font-black">{t("calculatorPage.inputsTitle")}</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{t("calculatorPage.area")}</span>
                <div className="relative">
                  <Ruler className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input
                    className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-14 text-sm font-bold outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-950"
                    min={1}
                    onChange={(event) => setArea(Number(event.target.value) || 1)}
                    type="number"
                    value={area}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-500">m2</span>
                </div>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{t("calculatorPage.windows")}</span>
                <input
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-bold outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-950"
                  min={1}
                  onChange={(event) => setWindows(Number(event.target.value) || 1)}
                  type="number"
                  value={windows}
                />
              </label>

              <div className="grid gap-2 md:col-span-2">
                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{t("calculatorPage.ceiling")}</span>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {ceilingHeights.map((height) => (
                    <button
                      className={`rounded-xl border p-4 text-left transition ${
                        ceilingHeight === height
                          ? "border-orange-500 bg-orange-500/10 text-orange-600 ring-2 ring-orange-500 dark:text-orange-400"
                          : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                      }`}
                      key={height}
                      onClick={() => setCeilingHeight(height)}
                      type="button"
                    >
                      <span className="block text-lg font-black">{height} m</span>
                      <span className="mt-1 block text-xs text-zinc-500">
                        {height > 2.8 ? "x1.15" : "x1.00"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 md:col-span-2">
                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{t("calculatorPage.insulationLabel")}</span>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {insulationLevels.map((level) => (
                    <button
                      className={`rounded-xl border p-4 text-left transition ${
                        insulation === level
                          ? "border-orange-500 bg-orange-500/10 text-orange-600 ring-2 ring-orange-500 dark:text-orange-400"
                          : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                      }`}
                      key={level}
                      onClick={() => setInsulation(level)}
                      type="button"
                    >
                      <span className="block text-sm font-black uppercase">
                        {t(`calculatorPage.insulation.${level}.title`)}
                      </span>
                      <span className="mt-2 block text-xs text-zinc-500">x{insulationMultipliers[level].toFixed(1)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950 md:grid-cols-3">
              <div>
                <p className="flex items-center gap-2 text-xs font-black uppercase text-zinc-500">
                  <ThermometerSun size={15} aria-hidden />
                  {t("calculatorPage.cards.power")}
                </p>
                <p className="mt-2 text-2xl font-black">{estimate.totalKilowatts.toFixed(2)} kW</p>
              </div>
              <div>
                <p className="flex items-center gap-2 text-xs font-black uppercase text-zinc-500">
                  <Home size={15} aria-hidden />
                  {t("calculatorPage.summary.totalSections")}
                </p>
                <p className="mt-2 text-2xl font-black">{estimate.totalSections}</p>
              </div>
              <div>
                <p className="flex items-center gap-2 text-xs font-black uppercase text-zinc-500">
                  <Wrench size={15} aria-hidden />
                  {t("calculatorPage.materials.pipe")}
                </p>
                <p className="mt-2 text-2xl font-black">{estimate.pipeMeters} m</p>
              </div>
            </div>

            <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <span>
                <span className="block text-sm font-black">{t("calculatorPage.estimate.includeInstallation")}</span>
                <span className="mt-1 block text-xs leading-5 text-zinc-500">
                  {t("calculatorPage.estimate.installationNote")}
                </span>
              </span>
              <input
                checked={includeInstallation}
                className="size-5 accent-orange-500"
                onChange={(event) => setIncludeInstallation(event.target.checked)}
                type="checkbox"
              />
            </label>
          </motion.section>

          <motion.aside
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-5 lg:sticky lg:top-24 lg:h-fit"
            initial={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="mb-4 rounded-xl bg-orange-500/10 p-4 text-sm leading-relaxed text-orange-700 dark:text-orange-300">
              <Trans
                components={{
                  strong: <span className="font-semibold" />,
                }}
                i18nKey={`calculatorPage.recommendation.${recommendationVariant}`}
                values={{
                  area: Math.max(1, area),
                  sectionsPerWindow: estimate.sectionsPerRadiator,
                  totalSections: estimate.totalSections,
                  windows: estimate.radiatorCount,
                }}
              />
            </div>

            <div className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
              {breakdownRows.map(([label, value]) => (
                <div className="flex items-center justify-between gap-4 px-4 py-4 text-sm" key={label}>
                  <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
                  <span className="text-right font-black">{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <p className="text-xs font-black uppercase text-zinc-500">{t("calculatorPage.estimate.grandTotal")}</p>
              <p className="mt-2 text-3xl font-bold text-orange-500">{formatMoney(estimate.grandTotal)} KGS</p>
            </div>

            <form className="mt-5 grid gap-3" onSubmit={sendEstimate}>
              <input
                className="h-12 rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-950"
                onChange={(event) => setContactName(event.target.value)}
                placeholder={t("calculatorPage.estimate.name")}
                value={contactName}
              />
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-950"
                  onChange={(event) => setContactPhone(event.target.value)}
                  placeholder={t("calculatorPage.estimate.phone")}
                  value={contactPhone}
                />
              </div>

              <button
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 font-medium text-white transition-all hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={submitStatus === "loading"}
                type="submit"
              >
                {submitStatus === "loading" ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <Send size={18} aria-hidden />}
                {t("calculatorPage.estimate.send")}
              </button>
            </form>

            {submitStatus === "success" && (
              <p className="mt-3 rounded-xl border border-green-500/25 bg-green-500/10 px-3 py-2 text-sm font-bold text-green-700 dark:text-green-300">
                {t("calculatorPage.estimate.success")}
              </p>
            )}
            {submitStatus === "error" && (
              <p className="mt-3 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-700 dark:text-red-300">
                {t("calculatorPage.estimate.error")}
              </p>
            )}
          </motion.aside>
        </div>
      </div>
    </main>
  );
}
