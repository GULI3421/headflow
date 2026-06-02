"use client";

import Link from "next/link";
import { ArrowRight, Home, Layers, Sliders } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import "@/src/i18n/config";

const houseTypes = ["apartment", "insulated", "uninsulated"];
const ceilingOptions = ["standard", "high"];

export default function CalculatorPage() {
  const { t } = useTranslation();
  const [area, setArea] = useState<number>(100);
  const [houseType, setHouseType] = useState<string>("insulated");
  const [ceiling, setCeiling] = useState<string>("standard");

  const typeMultipliers: Record<string, number> = {
    apartment: 1,
    insulated: 1.2,
    uninsulated: 1.4,
  };
  const ceilingMultipliers: Record<string, number> = {
    standard: 1,
    high: 1.15,
  };
  const requiredPower = Math.round((area / 10) * typeMultipliers[houseType] * ceilingMultipliers[ceiling]);
  const estimatedBudget = area * 300;

  return (
    <div className="min-h-screen bg-white p-6 font-sans text-zinc-950 dark:bg-black dark:text-white md:p-12">
      <div className="mx-auto max-w-5xl pt-28">
        <div className="mb-10 text-center md:text-left">
          <h1 className="mb-3 text-3xl font-extrabold md:text-4xl">{t("calculatorPage.title")}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 md:text-base">{t("calculatorPage.description")}</p>
        </div>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3">
          <div className="space-y-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-950 md:p-8 lg:col-span-2">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <label className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-300">
                  <Sliders className="size-4 text-orange-500" />
                  {t("calculatorPage.area")}
                </label>
                <span className="text-2xl font-bold text-orange-500">{area} м²</span>
              </div>
              <input
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-orange-500 dark:bg-zinc-800"
                max="400"
                min="20"
                onChange={(event) => setArea(Number(event.target.value))}
                type="range"
                value={area}
              />
              <div className="mt-2 flex justify-between text-xs text-zinc-500">
                <span>{t("calculatorPage.minArea")}</span>
                <span>{t("calculatorPage.maxArea")}</span>
              </div>
            </div>

            <div>
              <label className="mb-4 flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-300">
                <Home className="size-4 text-orange-500" />
                {t("calculatorPage.houseType")}
              </label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {houseTypes.map((type) => (
                  <button
                    className={`rounded-xl border p-4 text-left transition-all ${
                      houseType === type
                        ? "border-orange-500 bg-orange-600/10 text-zinc-950 dark:text-white"
                        : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400 dark:hover:border-zinc-700"
                    }`}
                    key={type}
                    onClick={() => setHouseType(type)}
                    type="button"
                  >
                    <div className="mb-1 text-sm font-bold text-zinc-950 dark:text-white">
                      {t(`calculatorPage.houseTypes.${type}.title`)}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">{t(`calculatorPage.houseTypes.${type}.desc`)}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-4 flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-300">
                <Layers className="size-4 text-orange-500" />
                {t("calculatorPage.ceiling")}
              </label>
              <div className="flex gap-4">
                {ceilingOptions.map((option) => (
                  <button
                    className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                      ceiling === option
                        ? "border-orange-500 bg-orange-600/10 text-zinc-950 dark:text-white"
                        : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400 dark:hover:border-zinc-700"
                    }`}
                    key={option}
                    onClick={() => setCeiling(option)}
                    type="button"
                  >
                    {t(`calculatorPage.ceilings.${option}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="sticky top-24 space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-200/60 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
            <div>
              <div className="mb-1 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {t("calculatorPage.recommendedPower")}
              </div>
              <div className="text-4xl font-black tracking-tight text-orange-500">{requiredPower} кВт</div>
            </div>

            <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <div className="mb-1 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {t("calculatorPage.materialBudget")}
              </div>
              <div className="text-2xl font-bold">~ {estimatedBudget.toLocaleString()} KGS</div>
              <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">{t("calculatorPage.budgetNote")}</p>
            </div>

            <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <Link
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-orange-500"
                href="/catalog?category=Котлы"
              >
                <span>{t("calculatorPage.boilerCta")}</span>
                <ArrowRight className="size-4" />
              </Link>
              <Link
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                href="/catalog?category=Радиаторы"
              >
                <span>{t("calculatorPage.radiatorCta")}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
