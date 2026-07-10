"use client";

import { useLanguage } from "../lib/i18n/client";

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div
      aria-label={t("common.language", "Language")}
      className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1"
    >
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`rounded-xl px-3 py-2 text-xs font-black transition ${
          language === "en"
            ? "bg-emerald-400 text-black"
            : "text-gray-300 hover:bg-white/10 hover:text-white"
        }`}
      >
        EN
      </button>

      <button
        type="button"
        onClick={() => setLanguage("es")}
        className={`rounded-xl px-3 py-2 text-xs font-black transition ${
          language === "es"
            ? "bg-emerald-400 text-black"
            : "text-gray-300 hover:bg-white/10 hover:text-white"
        }`}
      >
        ES
      </button>
    </div>
  );
}
