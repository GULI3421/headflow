"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useClientMounted } from "@/components/use-client-mounted";
import { categoryHref } from "@/lib/catalog";
import "@/src/i18n/config";

const footerGroups = [
  {
    key: "boilers",
    links: [
      ["gas", categoryHref("Котлы")],
      ["electric", categoryHref("Котлы")],
      ["solidFuel", categoryHref("Котлы")],
    ],
  },
  {
    key: "radiators",
    links: [
      ["panel", categoryHref("Радиаторы")],
      ["vertical", categoryHref("Радиаторы")],
      ["design", categoryHref("Радиаторы")],
    ],
  },
  {
    key: "underfloor",
    links: [
      ["manifolds", categoryHref("Теплый пол")],
      ["pipes", categoryHref("Теплый пол")],
      ["thermostats", categoryHref("Теплый пол")],
    ],
  },
  {
    key: "services",
    links: [
      ["installation", "/installation"],
      ["calculator", "/calculator"],
      ["price", "/price.pdf"],
      ["warranty", "/contacts"],
    ],
  },
];

export function Footer() {
  const { t } = useTranslation();
  const mounted = useClientMounted();

  if (!mounted) {
    return null;
  }

  return (
    <footer className="border-t border-gray-200 bg-gray-50 pb-28 pt-14 text-slate-700 transition-colors duration-300 dark:border-white/5 dark:bg-[#0a0a0a] dark:text-gray-300 md:pb-14">
      <div className="container-shell grid gap-10 lg:grid-cols-[1fr_2.4fr]">
        <div>
          <Link href="/" className="flex items-center gap-3" aria-label={t("common.brand")}>
            <span className="grid size-12 place-items-center rounded-md bg-white">
              <Image
                alt={t("common.brand")}
                className="object-contain"
                height={36}
                src="/assets/logo.png"
                width={36}
              />
            </span>
            <span className="block leading-none">
              <span className="block text-base font-black uppercase text-slate-900 dark:text-white sm:text-xl">ЦЕНТР</span>
              <span className="mt-1 block text-xs font-bold uppercase tracking-widest text-[#FF4D00]">
                ОТОПЛЕНИЯ
              </span>
            </span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-slate-700 dark:text-gray-300">
            {t("footer.description")}
          </p>
          <p className="mt-5 text-sm font-semibold text-slate-700 dark:text-gray-300">{t("footer.address")}</p>
        </div>
        <nav className="grid grid-cols-2 gap-8 md:grid-cols-4" aria-label={t("footer.ariaLabel")}>
          {footerGroups.map((group) => (
            <div key={group.key}>
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                {t(`footer.groups.${group.key}.title`)}
              </h2>
              <div className="mt-4 grid gap-3">
                {group.links.map(([linkKey, href], index) =>
                  href.endsWith(".pdf") ? (
                    <a
                      className="text-sm font-semibold text-slate-700 transition hover:text-[#FF4D00] dark:text-gray-300"
                      href={href}
                      key={`${group.key}-${linkKey}-${index}-${href}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {t(`footer.groups.${group.key}.links.${linkKey}`)}
                    </a>
                  ) : (
                    <Link
                      className="text-sm font-semibold text-slate-700 transition hover:text-[#FF4D00] dark:text-gray-300"
                      href={href}
                      key={`${group.key}-${linkKey}-${index}-${href}`}
                    >
                      {t(`footer.groups.${group.key}.links.${linkKey}`)}
                    </Link>
                  ),
                )}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </footer>
  );
}
