"use client";

import { useEffect, useState, useTransition } from "react";
import { clockIn, clockOut } from "./actions";

export function StampClock({ openSinceISO }: { openSinceISO: string | null }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!openSinceISO) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [openSinceISO]);

  const elapsed = openSinceISO
    ? Math.max(0, Math.floor((now - new Date(openSinceISO).getTime()) / 1000))
    : 0;
  const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  function run(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler");
      }
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      {openSinceISO ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Eingestempelt – läuft seit{" "}
              {new Date(openSinceISO).toLocaleTimeString("de-DE", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div className="font-mono text-2xl tabular-nums">
              {hh}:{mm}:{ss}
            </div>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(clockOut)}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            Ausstempeln
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Nicht eingestempelt
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(clockIn)}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            Einstempeln
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
