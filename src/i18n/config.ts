import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ky from "./locales/ky.json";
import ru from "./locales/ru.json";

const resources = {
  ru: { translation: ru },
  en: { translation: en },
  ky: { translation: ky },
};

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: "ru",
      supportedLngs: ["ru", "en", "ky"],
      defaultNS: "translation",
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ["localStorage", "navigator", "htmlTag"],
        caches: ["localStorage"],
      },
    });
}

export default i18n;
