"use client";

import { motion } from "framer-motion";
import { Calculator, Home, Loader2, Phone, Ruler, Send, ThermometerSun, Wrench } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  calculateHeatingEstimate,
  insulationMultipliers,
  type DeliveryMode,
  type HeatingSource,
  type InsulationLevel,
} from "@/lib/heating-estimate";
import { PhoneSuggestionInput, rememberPhoneSuggestion } from "@/components/phone-suggestion-input";
import { normalizePhone, validatePhone } from "@/lib/phone";
import "@/src/i18n/config";

const ceilingHeights = [2.5, 2.8, 3.0, 3.5];
const insulationLevels: InsulationLevel[] = ["poor", "standard", "high"];

function formatMoney(value: number) {
  return Math.round(value).toLocaleString("ru-RU");
}

export default function CalculatorPage() {
  const { i18n, t } = useTranslation();
  const [area, setArea] = useState(100);
  const [windows, setWindows] = useState<number | null>(null);
  const [ceilingHeight, setCeilingHeight] = useState(2.8);
  const [insulation, setInsulation] = useState<InsulationLevel>("standard");
  const [heatingSource, setHeatingSource] = useState<HeatingSource>("gas");
  const [includeInstallation, setIncludeInstallation] = useState(true);
  const [includeChimney, setIncludeChimney] = useState(true);
  const [includeUnderfloor, setIncludeUnderfloor] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("none");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "partial" | "error">("idle");
  const [submitError, setSubmitError] = useState("");
  const [submitNotice, setSubmitNotice] = useState("");

  const estimatedWindows = windows ?? Math.max(1, Math.ceil(area / 20));
  const estimate = useMemo(() => {
    return calculateHeatingEstimate({
      area,
      windows: estimatedWindows,
      ceilingHeight,
      insulation,
      heatingSource,
      includeChimney,
      includeUnderfloor,
      deliveryMode,
      includeInstallation,
    });
  }, [area, ceilingHeight, deliveryMode, estimatedWindows, heatingSource, includeChimney, includeInstallation, includeUnderfloor, insulation]);

  const currency = i18n.resolvedLanguage?.startsWith("en") ? "KGS" : "сом";
  const money = (value: number) => `${formatMoney(value)} ${currency}`;

  async function sendEstimate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitStatus("idle");
    setSubmitError("");
    setSubmitNotice("");

    const name = contactName.trim();
    const phoneValidationError = validatePhone(contactPhone);
    setNameError(name ? "" : t("calculatorPage.estimate.nameRequired"));
    setPhoneError(phoneValidationError);
    if (!name || phoneValidationError) return;

    const phone = normalizePhone(contactPhone);
    setSubmitStatus("loading");

    try {
      const response = await fetch("/api/calculator-estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          parameters: {
            area,
            windows: estimatedWindows,
            ceilingHeight,
            insulation,
            heatingSource,
            includeChimney,
            includeUnderfloor,
            deliveryMode,
            includeInstallation,
          },
        }),
      });

      const result = await response.json() as {
        saved?: boolean;
        estimateId?: string;
        telegramStatus?: "PENDING" | "SENT" | "FAILED";
        message?: string;
        error?: string;
        details?: unknown;
      };
      if (!response.ok || !result.saved) {
        const details = result.details === undefined ? "" : JSON.stringify(result.details, null, 2);
        throw new Error([result.error || t("calculatorPage.estimate.error"), details].filter(Boolean).join("\n"));
      }

      rememberPhoneSuggestion(phone);
      if (result.telegramStatus === "SENT") {
        setSubmitNotice(
          result.estimateId
            ? `Смета №${result.estimateId} сохранена в базе и отправлена в Telegram.`
            : t("calculatorPage.estimate.success"),
        );
        setSubmitStatus("success");
      } else {
        setSubmitError(result.message || "Смета сохранена, но статус уведомления в Telegram не подтверждён.");
        setSubmitStatus("partial");
      }
    } catch (error) {
      console.error("Failed to send calculator estimate", error);
      setSubmitError(
        error instanceof Error && error.message !== "Failed to fetch"
          ? error.message
          : t("calculatorPage.estimate.error"),
      );
      setSubmitStatus("error");
    }
  }

  const breakdownRows = [
    {
      label: t("calculatorPage.estimate.boiler"),
      detail: heatingSource === "none"
        ? t("calculatorPage.estimate.noBoiler")
        : `${t(`calculatorPage.sources.${heatingSource}`)}, ${estimate.recommendedBoilerKilowatts} kW`,
      value: money(estimate.boilerCost),
    },
    {
      label: t("calculatorPage.estimate.radiators"),
      detail: `${estimate.totalSections} ${t("calculatorPage.units.sections")}`,
      value: money(estimate.radiatorsCost),
    },
    {
      label: t("calculatorPage.estimate.pipes"),
      detail: `${estimate.pipeMeters} m`,
      value: money(estimate.pipesCost),
    },
    {
      label: t("calculatorPage.estimate.accessories"),
      detail: t("calculatorPage.estimate.accessoriesNote", {
        valves: estimate.ballValves,
        brackets: estimate.brackets,
        airVents: estimate.airVents,
      }),
      value: money(estimate.accessoriesCost),
    },
    {
      label: t("calculatorPage.estimate.extras"),
      detail: [
        estimate.chimneyCost ? `${t("calculatorPage.options.chimney")}: ${money(estimate.chimneyCost)}` : "",
        estimate.underfloorCost ? `${t("calculatorPage.options.underfloor")}: ${money(estimate.underfloorCost)}` : "",
        estimate.deliveryCost ? `${t("calculatorPage.deliveryOptions." + deliveryMode)}: ${money(estimate.deliveryCost)}` : "",
      ].filter(Boolean).join(" · ") || t("calculatorPage.estimate.noExtras"),
      value: money(estimate.extrasCost),
    },
    {
      label: t("calculatorPage.estimate.installation"),
      detail: includeInstallation ? t("calculatorPage.estimate.installationNote") : t("calculatorPage.estimate.notIncluded"),
      value: money(estimate.installationCost),
    },
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
            <p className="mb-5 rounded-lg bg-orange-500/[0.07] px-4 py-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              {t("calculatorPage.beginnerNote")}
            </p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{t("calculatorPage.area")}</span>
                <div className="relative">
                  <Ruler className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input
                    className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-14 text-sm font-bold outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-950"
                    min={1}
                    max={5000}
                    onChange={(event) => setArea(Math.min(5000, Math.max(1, Number(event.target.value) || 1)))}
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
                  max={100}
                  onChange={(event) => setWindows(Math.min(100, Math.max(1, Number(event.target.value) || 1)))}
                  type="number"
                  value={windows ?? estimatedWindows}
                />
                <span className="text-xs leading-5 text-zinc-500">
                  {windows === null ? t("calculatorPage.windowsEstimate", { windows: estimatedWindows }) : t("calculatorPage.windowsNote")}
                </span>
                {windows !== null && (
                  <button
                    className="justify-self-start text-xs font-bold text-orange-600 hover:underline dark:text-orange-400"
                    onClick={() => setWindows(null)}
                    type="button"
                  >
                    {t("calculatorPage.resetWindows")}
                  </button>
                )}
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
                        x{(height / 2.8).toFixed(2)}
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

              <label className="grid gap-2 md:col-span-2">
                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{t("calculatorPage.heatSource")}</span>
                <select
                  className="h-12 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-bold outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-950"
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === "none" || value === "gas" || value === "electric" || value === "solidFuel") {
                      setHeatingSource(value);
                    }
                  }}
                  value={heatingSource}
                >
                  {(["none", "gas", "electric", "solidFuel"] as const).map((source) => (
                    <option key={source} value={source}>{t(`calculatorPage.sources.${source}`)}</option>
                  ))}
                </select>
                <span className="text-xs leading-5 text-zinc-500">{t("calculatorPage.boilerNote")}</span>
              </label>

              <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
                {(heatingSource === "gas" || heatingSource === "solidFuel") && (
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                    <input
                      checked={includeChimney}
                      className="mt-1 size-4 accent-orange-500"
                      onChange={(event) => setIncludeChimney(event.target.checked)}
                      type="checkbox"
                    />
                    <span>
                      <span className="block text-sm font-black">{t("calculatorPage.options.chimney")}</span>
                      <span className="mt-1 block text-xs leading-5 text-zinc-500">{t("calculatorPage.options.chimneyNote")}</span>
                    </span>
                  </label>
                )}
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <input
                    checked={includeUnderfloor}
                    className="mt-1 size-4 accent-orange-500"
                    onChange={(event) => setIncludeUnderfloor(event.target.checked)}
                    type="checkbox"
                  />
                  <span>
                    <span className="block text-sm font-black">{t("calculatorPage.options.underfloor")}</span>
                    <span className="mt-1 block text-xs leading-5 text-zinc-500">{t("calculatorPage.options.underfloorNote")}</span>
                  </span>
                </label>
              </div>

              <label className="grid gap-2 md:col-span-2">
                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{t("calculatorPage.delivery")}</span>
                <select
                  className="h-12 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-bold outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-950"
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === "none" || value === "bishkek" || value === "region") {
                      setDeliveryMode(value);
                    }
                  }}
                  value={deliveryMode}
                >
                  {(["none", "bishkek", "region"] as const).map((mode) => (
                    <option key={mode} value={mode}>{t(`calculatorPage.deliveryOptions.${mode}`)}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-6 grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950 md:grid-cols-3">
              <div>
                <p className="flex items-center gap-2 text-xs font-black uppercase text-zinc-500">
                  <ThermometerSun size={15} aria-hidden />
                  {t("calculatorPage.estimate.recommendedBoiler")}
                </p>
                <p className="mt-2 text-2xl font-black">{estimate.recommendedBoilerKilowatts} kW</p>
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
                  area: estimate.area,
                  sectionsPerWindow: estimate.sectionsPerRadiator,
                  totalSections: estimate.totalSections,
                  windows: estimate.windows,
                }}
              />
            </div>

            <div className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
              {breakdownRows.map(({ label, detail, value }) => (
                <div className="flex items-start justify-between gap-4 px-4 py-4 text-sm" key={label}>
                  <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
                  <span className="max-w-[62%] text-right">
                    <span className="block font-black">{value}</span>
                    <span className="mt-1 block text-xs font-normal leading-5 text-zinc-500">{detail}</span>
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <p className="rounded-lg bg-zinc-100 p-3 text-xs leading-5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {t("calculatorPage.estimate.disclaimer")}
              </p>
              <p className="mt-4 text-xs font-black uppercase text-zinc-500">{t("calculatorPage.estimate.grandTotal")}</p>
              <p className="mt-2 text-3xl font-bold text-orange-500">{money(estimate.grandTotal)}</p>
            </div>

            <form className="mt-5 grid gap-3" noValidate onSubmit={sendEstimate}>
              <input
                aria-describedby={nameError ? "calculator-name-error" : undefined}
                aria-invalid={Boolean(nameError)}
                aria-label={t("calculatorPage.estimate.name")}
                className={`h-12 rounded-xl border bg-white px-4 text-sm outline-none transition focus:ring-2 dark:bg-zinc-950 ${
                  nameError
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-zinc-200 focus:border-orange-500 focus:ring-orange-500 dark:border-zinc-800"
                }`}
                onBlur={() => setNameError(contactName.trim() ? "" : t("calculatorPage.estimate.nameRequired"))}
                onChange={(event) => {
                  setContactName(event.target.value);
                  if (event.target.value.trim()) setNameError("");
                  setSubmitStatus("idle");
                }}
                placeholder={t("calculatorPage.estimate.name")}
                required
                value={contactName}
              />
              {nameError && <p className="text-sm text-red-600" id="calculator-name-error">{nameError}</p>}
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <PhoneSuggestionInput
                  aria-describedby={phoneError ? "calculator-phone-error" : undefined}
                  aria-invalid={Boolean(phoneError)}
                  aria-label={t("calculatorPage.estimate.phone")}
                  autoComplete="tel"
                  className={`h-12 w-full rounded-xl border bg-white pl-10 pr-4 text-sm outline-none transition focus:ring-2 dark:bg-zinc-950 ${
                    phoneError
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : "border-zinc-200 focus:border-orange-500 focus:ring-orange-500 dark:border-zinc-800"
                  }`}
                  onChange={(value) => {
                    setContactPhone(value);
                    setPhoneError(value.trim() ? validatePhone(value) : "");
                    setSubmitStatus("idle");
                  }}
                  onBlur={() => setPhoneError(validatePhone(contactPhone))}
                  placeholder={t("calculatorPage.estimate.phone")}
                  required
                  value={contactPhone}
                />
              </div>
              {phoneError && <p className="text-sm text-red-600" id="calculator-phone-error">{phoneError}</p>}

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
              <p className="mt-3 rounded-xl border border-green-500/25 bg-green-500/10 px-3 py-2 text-sm font-bold text-green-700 dark:text-green-300" role="status">
                {submitNotice || t("calculatorPage.estimate.success")}
              </p>
            )}
            {submitStatus === "error" && (
              <p className="mt-3 whitespace-pre-wrap break-words rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-700 dark:text-red-300" role="alert">
                {submitError || t("calculatorPage.estimate.error")}
              </p>
            )}
            {submitStatus === "partial" && (
              <p className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm font-bold text-amber-800 dark:text-amber-300" role="status">
                {submitError}
              </p>
            )}
          </motion.aside>
        </div>
      </div>
    </main>
  );
}
