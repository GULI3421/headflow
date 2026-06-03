"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowUpRight } from "lucide-react";
import "@/src/i18n/config";
import { useClientMounted } from "@/components/use-client-mounted";
import { categories } from "@/lib/products";

export function CategorySection() {
  const { t } = useTranslation();
  const mounted = useClientMounted();

  if (!mounted) {
    return null;
  }

  return (
    <section className="bg-[#F5F5F5] py-16 md:py-24">
      <div className="container-shell">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black uppercase text-[#FF4F00]">{t("heatingCategories.eyebrow")}</p>
            <h2 className="mt-2 text-4xl font-black leading-tight md:text-5xl">
              {t("heatingCategories.title")}
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-black/58 md:text-base">
            {t("heatingCategories.description")}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {categories.map((category) => (
            <Link
              className="group overflow-hidden rounded-md border border-black/10 bg-white"
              href={category.href}
              key={category.href}
            >
              <div className="relative aspect-[16/11] overflow-hidden bg-[#1A1A1A]">
                <Image
                  alt={t(`heatingCategories.items.${category.i18nKey}.title`)}
                  className="object-cover opacity-88 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  src={category.image}
                />
              </div>
              <div className="flex min-h-40 flex-col justify-between p-5">
                <div>
                  <h3 className="text-2xl font-black">
                    {t(`heatingCategories.items.${category.i18nKey}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-black/55">
                    {t(`heatingCategories.items.${category.i18nKey}.summary`)}
                  </p>
                </div>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-black uppercase text-[#FF4F00]">
                  {t("heatingCategories.openCategory")}
                  <ArrowUpRight size={17} aria-hidden />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
