"use client";

import { useSyncExternalStore } from "react";

type Pref = "auto" | "light" | "dark";

declare global {
  interface Window {
    __setTheme?: (p: Pref) => void;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener("themechange", cb);
  return () => window.removeEventListener("themechange", cb);
}

const OPTIONS: { value: Pref; label: string; title: string; icon: React.ReactNode }[] = [
  {
    value: "auto",
    label: "Auto",
    title: "Automatisch: tagsüber hell, nach Sonnenuntergang dunkel",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5M12 19.5V21M4.2 4.2l1 1M18.8 18.8l1 1M3 12h1.5M19.5 12H21M12 7.5a4.5 4.5 0 0 0 0 9Z M12 7.5a4.5 4.5 0 0 1 0 9" />,
  },
  {
    value: "light",
    label: "Hell",
    title: "Immer hell",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5M12 19.5V21M4.2 4.2l1 1M18.8 18.8l1 1M3 12h1.5M19.5 12H21M4.2 19.8l1-1M18.8 5.2l1-1M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />,
  },
  {
    value: "dark",
    label: "Dunkel",
    title: "Immer dunkel",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />,
  },
];

/** Umschalter Auto / Hell / Dunkel (gespeichert je Gerät). */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const pref = useSyncExternalStore<Pref>(
    subscribe,
    () => (document.documentElement.dataset.themePref as Pref) || "auto",
    () => "auto",
  );

  return (
    <div role="group" aria-label="Darstellung" className={`flex rounded-lg border border-side-line p-0.5 ${className}`}>
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          aria-pressed={pref === o.value}
          onClick={() => window.__setTheme?.(o.value)}
          className={
            "flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1 text-xs transition " +
            (pref === o.value
              ? "bg-side-active font-medium text-side-active-text"
              : "text-side-muted hover:text-side-text")
          }
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
            {o.icon}
          </svg>
          {o.label}
        </button>
      ))}
    </div>
  );
}
