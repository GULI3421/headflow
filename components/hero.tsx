"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ID } from "appwrite";
import { ArrowRight, Flame, Gauge } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useClientMounted } from "@/components/use-client-mounted";
import { appwriteConfig, databases } from "@/src/lib/appwrite";
import "@/src/i18n/config";

const successMessage = "Заявка успешно отправлена! Мы свяжемся с вами.";

export function Hero() {
  const [area, setArea] = useState(120);
  const [calculatorForm, setCalculatorForm] = useState({
    name: "",
    phone: "",
  });
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const boilerPower = useMemo(() => Math.ceil((area * 0.1 + 2) / 2) * 2, [area]);
  const { t } = useTranslation();
  const mounted = useClientMounted();

  if (!mounted) {
    return null;
  }

  async function handleCalculatorSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitStatus("loading");

    try {
      await databases.createDocument({
        databaseId: appwriteConfig.databaseId,
        collectionId: appwriteConfig.leadsCollectionId,
        documentId: ID.unique(),
        data: {
          name: calculatorForm.name,
          phone: calculatorForm.phone,
          message: `Calculator request. Area: ${area} m2. Recommended power: ${boilerPower} kW.`,
        },
      });

      try {
        await fetch("/api/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: calculatorForm.name,
            phone: calculatorForm.phone,
            message: `Площадь: ${area} m2. Рекомендуемая мощность: ${boilerPower} kW.`,
            type: "calculator",
          }),
        });
      } catch (telegramError) {
        console.error("Failed to send Telegram calculator notification", telegramError);
      }

      setCalculatorForm({ name: "", phone: "" });
      setSubmitStatus("success");
    } catch (error) {
      console.error("Failed to submit calculator form", error);
      setSubmitStatus("error");
    }
  }

  return (
    <section className="relative overflow-hidden bg-[#F7F7F4] pt-28 text-[#151515] dark:bg-[#0F0F0F] dark:text-white md:pt-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,77,0,0.12),rgba(247,247,244,0.35)_34%,rgba(247,247,244,0.98)_72%)] dark:bg-[radial-gradient(circle_at_center,rgba(255,79,0,0.20),rgba(15,15,15,0.35)_34%,rgba(15,15,15,0.98)_72%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(15,15,15,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(15,15,15,0.045)_1px,transparent_1px)] bg-[size:42px_42px] dark:bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)]" />
      <div className="container-shell grid min-h-[720px] items-center gap-10 pb-16 lg:grid-cols-[1fr_500px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="relative z-10 flex max-w-3xl flex-col items-start"
        >
          <span className="mb-5 inline-flex items-center gap-2 rounded-md border border-black/10 bg-white/75 px-3 py-2 text-sm font-bold text-black/72 shadow-sm dark:border-white/15 dark:bg-white/10 dark:text-white/82">
            <Flame size={16} className="text-[#FF4F00]" aria-hidden />
            {t("hero.eyebrow")}
          </span>
          <h1 className="max-w-3xl text-3xl font-black leading-[1.02] tracking-normal sm:text-5xl lg:text-6xl">
            {t("hero.title")}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-black/62 dark:text-white/68 sm:text-lg">
            {t("hero.description")}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#FF4D00] px-6 text-sm font-black uppercase tracking-normal text-white shadow-[0_10px_30px_rgba(255,77,0,0.22)] transition hover:bg-[#e64800]"
              href="/catalog"
            >
              {t("hero.catalog")}
              <ArrowRight size={18} aria-hidden />
            </a>
            <a
              className="inline-flex h-12 items-center justify-center rounded-md border border-black/15 px-6 text-sm font-black uppercase tracking-normal text-[#151515] transition hover:bg-black/5 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
              href="#consultation"
            >
              {t("hero.callback")}
            </a>
          </div>

          <form
            className="mt-5 w-full max-w-sm rounded-md border border-black/10 bg-white/95 p-4 text-[#1A1A1A] shadow-2xl shadow-black/10 backdrop-blur-md dark:border-white/10 dark:bg-white/90"
            id="calculator"
            onSubmit={handleCalculatorSubmit}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase text-black/45">{t("hero.calculator.eyebrow")}</p>
                <h2 className="mt-1 text-lg font-black leading-tight">
                  {t("hero.calculator.recommendedPower", { power: boilerPower })}
                </h2>
              </div>
              <div className="grid size-10 shrink-0 place-items-center rounded-md bg-[#1A1A1A] text-[#FF4F00]">
                <Gauge size={20} aria-hidden />
              </div>
            </div>
            <label className="mt-4 block text-xs font-bold" htmlFor="area">
              {t("hero.calculator.area")}
            </label>
            <input
              className="mt-2 h-10 w-full rounded-md border border-black/10 bg-white/75 px-3 text-base font-black outline-none ring-0 transition focus:border-[#FF4D00] focus:bg-white focus:shadow-[0_0_0_3px_rgba(255,77,0,0.14)]"
              id="area"
              min={35}
              max={420}
              onChange={(event) => setArea(Number(event.target.value))}
              type="number"
              value={area}
            />
            <p className="mt-3 text-xs leading-5 text-black/55">
              {t("hero.calculator.note")}
            </p>
            <div className="mt-4 grid gap-3">
              <input
                className="h-10 w-full rounded-md border border-black/10 bg-white/75 px-3 text-sm font-semibold outline-none ring-0 transition placeholder:text-black/40 focus:border-[#FF4D00] focus:bg-white focus:shadow-[0_0_0_3px_rgba(255,77,0,0.14)]"
                onChange={(event) => setCalculatorForm((value) => ({ ...value, name: event.target.value }))}
                placeholder={t("contacts.form.name")}
                required
                type="text"
                value={calculatorForm.name}
              />
              <input
                className="h-10 w-full rounded-md border border-black/10 bg-white/75 px-3 text-sm font-semibold outline-none ring-0 transition placeholder:text-black/40 focus:border-[#FF4D00] focus:bg-white focus:shadow-[0_0_0_3px_rgba(255,77,0,0.14)]"
                onChange={(event) => setCalculatorForm((value) => ({ ...value, phone: event.target.value }))}
                placeholder={t("contacts.form.phone")}
                required
                type="tel"
                value={calculatorForm.phone}
              />
            </div>
            {submitStatus === "success" && (
              <p className="mt-3 rounded-md border border-green-500/25 bg-green-500/10 px-3 py-2 text-xs font-bold text-green-700">
                {successMessage}
              </p>
            )}
            {submitStatus === "error" && (
              <p className="mt-3 rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-700">
                {t("contacts.form.error")}
              </p>
            )}
            <button
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#FF4D00] px-4 text-xs font-black uppercase text-white transition hover:bg-[#e64800] disabled:cursor-not-allowed disabled:opacity-65"
              disabled={submitStatus === "loading"}
              type="submit"
            >
              {submitStatus === "loading" ? t("contacts.form.loading") : t("hero.calculator.submit")}
              {submitStatus === "loading" && (
                <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
              )}
            </button>
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.12, duration: 0.65, ease: "easeOut" }}
          className="relative z-10 min-h-[520px]"
        >
          <div className="absolute inset-0 overflow-hidden rounded-2xl border border-white/10 bg-[#111] shadow-2xl">
            <Image
              alt={t("hero.imageAlt")}
              className="rounded-2xl object-cover shadow-2xl shadow-orange-500/10"
              fill
              priority={true}
              sizes="(min-width: 1024px) 500px, 100vw"
              src="/assets/image2.png"
              unoptimized={true}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/90 via-[#1A1A1A]/30 to-transparent rounded-2xl" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
