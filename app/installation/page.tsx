"use client";

import { ID } from "appwrite";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, CheckCircle2, Flame, Hammer, Heater, Layers3, PenTool, Route, Send } from "lucide-react";
import { appwriteConfig, databases } from "@/src/lib/appwrite";
import "@/src/i18n/config";

const services = [
  {
    key: "boilers",
    icon: Flame,
  },
  {
    key: "radiators",
    icon: Heater,
  },
  {
    key: "floor",
    icon: Layers3,
  },
  {
    key: "pipes",
    icon: Route,
  },
];

export default function InstallationPage() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    message: "",
  });
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitStatus("loading");

    try {
      await databases.createDocument({
        databaseId: appwriteConfig.databaseId,
        collectionId: appwriteConfig.leadsCollectionId,
        documentId: ID.unique(),
        data: {
          name: formData.name,
          phone: formData.phone,
          message: formData.message || t("installationPage.defaultMessage"),
        },
      });

      try {
        await fetch("/api/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            phone: formData.phone,
            message: formData.message || t("installationPage.defaultMessage"),
            type: t("header.nav.installation"),
          }),
        });
      } catch (telegramError) {
        console.error("Failed to send Telegram installation notification", telegramError);
      }

      setFormData({ name: "", phone: "", message: "" });
      setSubmitStatus("success");
    } catch (error) {
      console.error("Failed to submit installation request", error);
      setSubmitStatus("error");
    }
  }

  return (
    <section className="min-h-screen bg-white text-zinc-950 dark:bg-black dark:text-white">
      <div className="border-b border-zinc-200 bg-[radial-gradient(circle_at_top,rgba(234,88,12,0.16),transparent_38%)] px-4 pb-16 pt-36 dark:border-zinc-800 dark:bg-[radial-gradient(circle_at_top,rgba(234,88,12,0.22),transparent_38%)]">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-md border border-orange-500/25 bg-orange-500/10 px-3 py-2 text-sm font-black uppercase text-orange-500">
              <Hammer size={16} aria-hidden />
              {t("installationPage.eyebrow")}
            </p>
            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight md:text-6xl">
              {t("installationPage.title")}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400 md:text-lg">
              {t("installationPage.description")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-orange-600 px-6 text-sm font-black uppercase text-white transition hover:bg-orange-500"
                href="#installation-request"
              >
                {t("installationPage.request")}
                <ArrowRight size={18} aria-hidden />
              </a>
              <a
                className="inline-flex h-12 items-center justify-center rounded-md border border-zinc-700 px-6 text-sm font-black uppercase text-zinc-200 transition hover:border-orange-500 hover:text-white"
                href="tel:+996708605281"
              >
                {t("installationPage.call")}
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-2xl shadow-zinc-200/60 dark:border-zinc-800 dark:bg-zinc-950/80 dark:shadow-black/40">
            <div className="grid gap-4">
              {(t("installationPage.benefits", { returnObjects: true }) as string[]).map((item) => (
                <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-black/45" key={item}>
                  <CheckCircle2 className="text-orange-500" size={20} aria-hidden />
                  <span className="font-bold text-zinc-700 dark:text-zinc-200">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
        <div className="mb-8">
          <p className="text-sm font-black uppercase text-orange-500">{t("installationPage.servicesEyebrow")}</p>
          <h2 className="mt-2 text-3xl font-black md:text-4xl">{t("installationPage.servicesTitle")}</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => {
            const Icon = service.icon;

            return (
              <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950" key={service.key}>
                <div className="grid size-12 place-items-center rounded-xl bg-orange-500/10 text-orange-500">
                  <Icon size={24} aria-hidden />
                </div>
                <h3 className="mt-5 text-xl font-black">{t(`installationPage.services.${service.key}.title`)}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-500">{t(`installationPage.services.${service.key}.description`)}</p>
              </article>
            );
          })}
        </div>
      </div>

      <div className="border-y border-zinc-200 bg-zinc-50 px-4 py-16 dark:border-zinc-800 dark:bg-zinc-950/70 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <p className="text-sm font-black uppercase text-orange-500">{t("installationPage.stepsEyebrow")}</p>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">{t("installationPage.stepsTitle")}</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {(t("installationPage.steps", { returnObjects: true }) as string[]).map((step, index) => (
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-black" key={step}>
                <div className="grid size-10 place-items-center rounded-full bg-orange-600 text-sm font-black">
                  {index + 1}
                </div>
                <h3 className="mt-5 text-lg font-black">{step}</h3>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-16 md:py-20" id="installation-request">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-black uppercase text-orange-500">{t("installationPage.formEyebrow")}</p>
            <h2 className="mt-2 text-3xl font-black leading-tight md:text-4xl">{t("installationPage.formTitle")}</h2>
            <p className="mt-4 text-sm leading-7 text-zinc-400 md:text-base">
              {t("installationPage.formDescription")}
            </p>
          </div>

          <form className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl shadow-zinc-200/60 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/30" onSubmit={handleSubmit}>
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-xl bg-orange-600 text-white">
                <PenTool size={22} aria-hidden />
              </div>
              <div>
                <p className="text-xs font-black uppercase text-zinc-500">{t("installationPage.contacts")}</p>
                <h3 className="text-xl font-black">{t("installationPage.leaveRequest")}</h3>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              <input
                className="h-12 rounded-md border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none placeholder:text-zinc-500 focus:border-orange-500 dark:border-zinc-800 dark:bg-black dark:text-white"
                onChange={(event) => setFormData((value) => ({ ...value, name: event.target.value }))}
                placeholder={t("installationPage.namePlaceholder")}
                required
                value={formData.name}
              />
              <input
                className="h-12 rounded-md border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none placeholder:text-zinc-500 focus:border-orange-500 dark:border-zinc-800 dark:bg-black dark:text-white"
                onChange={(event) => setFormData((value) => ({ ...value, phone: event.target.value }))}
                placeholder={t("installationPage.phonePlaceholder")}
                required
                type="tel"
                value={formData.phone}
              />
              <textarea
                className="min-h-32 resize-none rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-500 focus:border-orange-500 dark:border-zinc-800 dark:bg-black dark:text-white"
                onChange={(event) => setFormData((value) => ({ ...value, message: event.target.value }))}
                placeholder={t("installationPage.messagePlaceholder")}
                value={formData.message}
              />
            </div>

            {submitStatus === "success" && (
              <p className="mt-4 rounded-md border border-green-500/25 bg-green-500/10 px-3 py-2 text-sm font-bold text-green-300">
                {t("installationPage.success")}
              </p>
            )}
            {submitStatus === "error" && (
              <p className="mt-4 rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-300">
                {t("installationPage.error")}
              </p>
            )}

            <button
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-orange-600 text-sm font-black uppercase text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-65"
              disabled={submitStatus === "loading"}
              type="submit"
            >
              {submitStatus === "loading" ? t("installationPage.loading") : t("installationPage.submit")}
              {submitStatus === "loading" ? (
                <span className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-hidden />
              ) : (
                <Send size={18} aria-hidden />
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
