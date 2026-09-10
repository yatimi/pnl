"use client";
// Created by Tommy.
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  isLanguage,
  locales,
  translate,
  type Language,
  type TranslationKey,
} from "@/lib/i18n";
const LanguageContext = createContext<{
  language: Language;
  locale: string;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
} | null>(null);
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, updateLanguage] = useState<Language>("en");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pnl-language");
      if (isLanguage(saved)) updateLanguage(saved);
    } catch {
      /* Storage is optional for this preference. */
    }
  }, []);
  const setLanguage = useCallback((next: Language) => {
    updateLanguage(next);
    try {
      localStorage.setItem("pnl-language", next);
    } catch {
      /* Keep the current session usable without storage. */
    }
  }, []);
  const t = useCallback(
    (key: TranslationKey, values?: Record<string, string | number>) =>
      translate(language, key, values),
    [language],
  );
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t("pageTitle");
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", t("pageDescription"));
  }, [language, t]);
  return (
    <LanguageContext.Provider
      value={{ language, locale: locales[language], setLanguage, t }}
    >
      {children}
    </LanguageContext.Provider>
  );
}
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("LanguageProvider is required.");
  return context;
}
