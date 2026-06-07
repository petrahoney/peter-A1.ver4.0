import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./en.json";
import id from "./id.json";
import zh from "./zh.json";
import es from "./es.json";
import ar from "./ar.json";

export const LANGUAGES = [
  { code: "en", label: "English", native: "English", dir: "ltr" },
  { code: "id", label: "Indonesian", native: "Bahasa Indonesia", dir: "ltr" },
  { code: "zh", label: "Chinese", native: "中文", dir: "ltr" },
  { code: "es", label: "Spanish", native: "Español", dir: "ltr" },
  { code: "ar", label: "Arabic", native: "العربية", dir: "rtl" },
];

const LANG_STORAGE_KEY = "peter_ai.lang";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      id: { translation: id },
      zh: { translation: zh },
      es: { translation: es },
      ar: { translation: ar },
    },
    fallbackLng: "en",
    supportedLngs: LANGUAGES.map((l) => l.code),
    nonExplicitSupportedLngs: true,
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: LANG_STORAGE_KEY,
    },
    interpolation: { escapeValue: false },
  });

// Keep <html lang> and <html dir> in sync with the active language.
const applyHtmlAttrs = (lng) => {
  const meta = LANGUAGES.find((l) => l.code === lng) || LANGUAGES[0];
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("lang", meta.code);
    document.documentElement.setAttribute("dir", meta.dir);
  }
};
applyHtmlAttrs(i18n.language || "en");
i18n.on("languageChanged", applyHtmlAttrs);

export default i18n;
