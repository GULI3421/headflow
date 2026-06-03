"use client";

import "@/src/i18n/config";
import { useClientMounted } from "@/components/use-client-mounted";
import { useTranslation } from "react-i18next";

const languages = [
  { code: "ru", label: "RU" },
  { code: "en", label: "EN" },
  { code: "ky", label: "KY" },
];

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const mounted = useClientMounted();
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language ?? "ru";

  if (!mounted) {
    return null;
  }

  return (
    <div
      aria-label={t("header.language")}
      className="flex h-10 items-center rounded-md border border-black/10 bg-black/5 p-1 dark:border-white/15 dark:bg-white/10"
      role="group"
    >
      {languages.map((language) => {
        const isActive = currentLanguage.startsWith(language.code);

        return (
          <button
            className={`h-8 rounded px-2 text-xs font-black transition ${
              isActive ? "bg-[#FF4D00] text-white" : "text-black/58 hover:bg-black/5 hover:text-black dark:text-white/62 dark:hover:bg-white/10 dark:hover:text-white"
            }`}
            key={language.code}
            onClick={() => i18n.changeLanguage(language.code)}
            type="button"
          >
            {language.label}
          </button>
        );
      })}
    </div>
  );
}
