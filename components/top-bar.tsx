"use client";

import { MapPin, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useClientMounted } from "@/components/use-client-mounted";
import "@/src/i18n/config";

export function TopBar() {
  const { t } = useTranslation();
  const mounted = useClientMounted();

  if (!mounted) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-8 border-b border-black/10 bg-white/95 text-[11px] text-black/62 backdrop-blur dark:border-white/5 dark:bg-[#0A0A0A]/95 dark:text-white/68">
      <div className="container-shell flex h-full items-center justify-center md:justify-between">
        <div className="hidden items-center gap-2 md:flex">
          <MapPin size={14} className="text-[#FF4F00]" aria-hidden />
          <span>{t("topBar.address")}</span>
        </div>
        <div className="flex items-center gap-2 font-semibold text-black/72 dark:text-white/82">
          <Phone size={14} className="text-[#FF4F00]" aria-hidden />
          <a className="transition hover:text-white" href="tel:+996708605281">
            {t("topBar.contact")}: +996 (708) 605-281
          </a>
          <span className="text-black/25 dark:text-white/25">|</span>
          <a className="transition hover:text-white" href="tel:+996700851996">
            +996 (700) 851-996
          </a>
          <span className="text-black/25 dark:text-white/25">|</span>
          <a className="transition hover:text-white" href="tel:+996500039452">
            +996 (500) 039-452
          </a>
        </div>
        <nav
          className="hidden items-center gap-3 font-semibold uppercase tracking-normal md:flex"
          aria-label={t("topBar.secondaryNav")}
        >
          <a className="transition hover:text-white" href="/about">
            {t("header.about")}
          </a>
          <a className="transition hover:text-white" href="/contacts">
            {t("header.contacts")}
          </a>
          <a className="text-[#FF4F00] transition hover:text-white" href="/price.pdf" rel="noreferrer" target="_blank">
            {t("header.downloadPrice")}
          </a>
        </nav>
      </div>
    </div>
  );
}
