"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Award, CheckCircle2, Handshake, ShieldCheck, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useClientMounted } from "@/components/use-client-mounted";
import { listProductDocuments } from "@/src/lib/appwrite";
import "@/src/i18n/config";

const fadeIn = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const values = [
  {
    key: "quality",
    icon: Award,
  },
  {
    key: "reliability",
    icon: ShieldCheck,
  },
  {
    key: "professionalism",
    icon: Handshake,
  },
];

export default function AboutPage() {
  const { t } = useTranslation();
  const mounted = useClientMounted();
  const [productCount, setProductCount] = useState(0);

  useEffect(() => {
    if (!mounted) return;

    let ignore = false;

    async function loadProductStats() {
      try {
        const response = await listProductDocuments();

        if (!ignore) {
          setProductCount(response.total);
        }
      } catch {
        if (!ignore) {
          setProductCount(0);
        }
      }
    }

    loadProductStats();

    return () => {
      ignore = true;
    };
  }, [mounted]);

  const stats = useMemo(
    () => [
      { value: "10+", labelKey: "years" },
      { value: productCount > 0 ? `${productCount}+` : "0", labelKey: "stock" },
      { value: "", labelKey: "serviceCenter", icon: Wrench },
    ],
    [productCount],
  );

  if (!mounted) {
    return null;
  }

  return (
    <section className="relative overflow-hidden bg-white pt-28 text-slate-900 dark:bg-[#0a0a0a] dark:text-white md:pt-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,77,0,0.10),rgba(255,255,255,0.72)_32%,rgba(255,255,255,0.98)_70%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,79,0,0.22),rgba(15,15,15,0.42)_32%,rgba(15,15,15,0.98)_70%)]" />
      <div className="industrial-grid pointer-events-none absolute inset-0" />

      <div className="container-shell relative z-10 pb-20 pt-16 md:pb-28 md:pt-24">
        <motion.div
          animate="visible"
          className="mx-auto max-w-4xl text-center"
          initial="hidden"
          transition={{ duration: 0.65, ease: "easeOut" }}
          variants={fadeIn}
        >
          <span className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white/82">
            <CheckCircle2 size={16} className="text-[#FF4F00]" aria-hidden />
            {t("about.hero.eyebrow")}
          </span>
          <h1 className="mt-5 text-3xl font-black leading-[1.05] tracking-normal text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
            {t("about.hero.title")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-600 dark:text-gray-400 sm:text-lg">
            {t("about.hero.description")}
          </p>
        </motion.div>

        <motion.div
          className="mt-12 grid gap-4 md:grid-cols-3"
          initial="hidden"
          transition={{ duration: 0.6, ease: "easeOut", staggerChildren: 0.08 }}
          variants={fadeIn}
          viewport={{ once: true, amount: 0.25 }}
          whileInView="visible"
        >
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <motion.article
                className="rounded-md border border-gray-200 bg-gray-100 p-6 shadow-xl shadow-black/5 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-black/20"
                key={stat.labelKey}
                variants={fadeIn}
              >
                {Icon ? (
                  <div className="grid size-12 place-items-center rounded-md bg-[#FF4D00] text-white shadow-[0_0_24px_rgba(255,77,0,0.28)]">
                    <Icon size={24} aria-hidden />
                  </div>
                ) : (
                  <p className="text-4xl font-black text-[#FF4F00]">{stat.value}</p>
                )}
                <h2 className="mt-4 text-xl font-black leading-tight text-slate-900 dark:text-white">{t(`about.stats.${stat.labelKey}`)}</h2>
              </motion.article>
            );
          })}
        </motion.div>

        <div className="mt-20 grid gap-16 md:mt-28">
          <motion.div
            className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12"
            initial="hidden"
            transition={{ duration: 0.65, ease: "easeOut" }}
            variants={fadeIn}
            viewport={{ once: true, amount: 0.25 }}
            whileInView="visible"
          >
            <div>
              <p className="text-sm font-black uppercase text-[#FF4F00]">{t("about.mission.eyebrow")}</p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-slate-900 dark:text-white md:text-4xl">
                {t("about.mission.title")}
              </h2>
              <p className="mt-5 text-base leading-7 text-slate-600 dark:text-gray-400">
                {t("about.mission.text")}
              </p>
            </div>
            <div className="relative min-h-[320px] overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shadow-2xl shadow-orange-500/10 dark:border-white/10 dark:bg-white/5 dark:shadow-orange-500/20 md:min-h-[420px]">
              <Image
                alt={t("about.mission.imageAlt")}
                className="rounded-2xl object-cover"
                fill
                sizes="(min-width: 1024px) 560px, 100vw"
                src="/assets/main-2.png"
                unoptimized={true}
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-white/10 to-transparent dark:from-[#1A1A1A]/40" />
            </div>
          </motion.div>

          <motion.div
            className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12"
            initial="hidden"
            transition={{ duration: 0.65, ease: "easeOut" }}
            variants={fadeIn}
            viewport={{ once: true, amount: 0.25 }}
            whileInView="visible"
          >
            <div className="relative min-h-[320px] overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shadow-2xl shadow-orange-500/10 dark:border-white/10 dark:bg-white/5 md:min-h-[420px]">
              <Image
                alt={t("about.assortment.imageAlt")}
                className="rounded-2xl object-cover"
                fill
                sizes="(min-width: 1024px) 560px, 100vw"
                src="/assets/main-1.png"
                unoptimized={true}
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-white/10 to-transparent dark:from-[#1A1A1A]/35" />
            </div>
            <div>
              <p className="text-sm font-black uppercase text-[#FF4F00]">{t("about.assortment.eyebrow")}</p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-slate-900 dark:text-white md:text-4xl">
                {t("about.assortment.title")}
              </h2>
              <p className="mt-5 text-base leading-7 text-slate-600 dark:text-gray-400">
                {t("about.assortment.text")}
              </p>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="mt-20 md:mt-28"
          initial="hidden"
          transition={{ duration: 0.65, ease: "easeOut" }}
          variants={fadeIn}
          viewport={{ once: true, amount: 0.25 }}
          whileInView="visible"
        >
          <div className="max-w-2xl">
            <p className="text-sm font-black uppercase text-[#FF4F00]">{t("about.values.eyebrow")}</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-slate-900 dark:text-white md:text-4xl">
              {t("about.values.title")}
            </h2>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {values.map((value) => {
              const Icon = value.icon;

              return (
                <motion.article
                  className="rounded-md border border-gray-200 bg-gray-100 p-6 backdrop-blur transition hover:border-[#FF4D00]/50 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:border-[#FF4F00]/50 dark:hover:bg-white/[0.08]"
                  key={value.key}
                  transition={{ type: "spring", stiffness: 260, damping: 22 }}
                  whileHover={{ y: -4 }}
                >
                  <div className="grid size-12 place-items-center rounded-md border border-gray-200 bg-white text-[#FF4D00] dark:border-white/10 dark:bg-white/5 dark:text-[#FF4F00]">
                    <Icon size={24} aria-hidden />
                  </div>
                  <h3 className="mt-5 text-xl font-black text-slate-900 dark:text-white">{t(`about.values.items.${value.key}.title`)}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-gray-400">{t(`about.values.items.${value.key}.text`)}</p>
                </motion.article>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
