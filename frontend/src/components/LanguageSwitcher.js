import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, CaretDown, Check } from "@phosphor-icons/react";
import { LANGUAGES } from "../i18n";

/**
 * Champagne-gold dropdown to switch UI language.
 * variant="sidebar"  → compact pill, used in App.js sidebar bottom.
 * variant="settings" → fuller row card, used in Settings page.
 */
export default function LanguageSwitcher({ variant = "sidebar" }) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const current = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (code) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  const trigger =
    variant === "settings"
      ? "w-full justify-between px-4 py-3 text-sm bg-peter-navy/40 border border-peter-gold/20 rounded-md hover:border-peter-gold/40"
      : "w-full justify-between px-3 py-2 text-[11px] bg-peter-navy2/40 border border-peter-gold/15 rounded-md hover:border-peter-gold/30";

  return (
    <div ref={ref} className="relative" data-testid={`lang-switcher-${variant}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`group flex items-center gap-2 text-peter-ivory transition-colors ${trigger}`}
        data-testid="lang-switcher-trigger"
      >
        <Globe size={variant === "settings" ? 16 : 13} weight="light" className="text-peter-gold" />
        <span className="flex-1 text-left tracking-wide">
          {variant === "settings" ? (
            <span>
              <span className="text-peter-gold">{current.native}</span>
              <span className="text-peter-dim/70 ml-2 text-xs">({current.label})</span>
            </span>
          ) : (
            <span className="text-peter-ivory/90">{current.native}</span>
          )}
        </span>
        <CaretDown
          size={variant === "settings" ? 12 : 10}
          weight="bold"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          className="absolute z-40 mt-1.5 w-full min-w-[180px] bg-peter-black/95 border border-peter-gold/30 rounded-md shadow-lg backdrop-blur-md overflow-hidden"
          data-testid="lang-switcher-menu"
        >
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => choose(l.code)}
              data-testid={`lang-option-${l.code}`}
              className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${
                l.code === current.code
                  ? "bg-peter-gold/15 text-peter-gold"
                  : "text-peter-ivory hover:bg-peter-navy2/60"
              }`}
              dir={l.dir}
            >
              <span className="flex-1">
                <span className="font-medium">{l.native}</span>
                <span className="text-peter-dim/70 ml-2 text-[10px]">{l.label}</span>
              </span>
              {l.code === current.code ? (
                <Check size={12} weight="bold" className="text-peter-gold" />
              ) : null}
            </button>
          ))}
          <div className="px-3 py-2 text-[10px] text-peter-dim/70 border-t border-peter-gold/15">
            {t("settings.languageHint")}
          </div>
        </div>
      ) : null}
    </div>
  );
}
