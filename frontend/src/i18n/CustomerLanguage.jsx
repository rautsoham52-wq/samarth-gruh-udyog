import { useEffect, useMemo, useState } from "react";
import { LanguageContext, translations, useCustomerLanguage } from "./customerLanguageContext";

export function CustomerLanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    try {
      return window.localStorage.getItem("navratri-customer-language") === "mr"
        ? "mr"
        : "en";
    } catch {
      return "en";
    }
  });

  const value = useMemo(() => ({
    language,
    setLanguage: (nextLanguage) => {
      setLanguage(nextLanguage);
      try {
        window.localStorage.setItem("navratri-customer-language", nextLanguage);
      } catch {
        // Keep the in-memory selection if browser storage is unavailable.
      }
    },
    t: (key, values = {}) => {
      const message = translations[language][key] ?? translations.en[key] ?? key;
      return message.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ""));
    },
  }), [language]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useCustomerLanguage();
  return (
    <div className="language-switcher" role="group" aria-label={t("language")}>
      <button
        type="button"
        className={language === "en" ? "language-option active" : "language-option"}
        aria-pressed={language === "en"}
        onClick={() => setLanguage("en")}
      >
        English
      </button>
      <button
        type="button"
        className={language === "mr" ? "language-option active" : "language-option"}
        aria-pressed={language === "mr"}
        onClick={() => setLanguage("mr")}
      >
        मराठी
      </button>
    </div>
  );
}
