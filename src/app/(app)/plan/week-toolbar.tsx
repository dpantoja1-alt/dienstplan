"use client";

import { useState, useTransition } from "react";
import { clearWeek, copyPreviousWeek } from "./actions";

export function WeekToolbar({ mondayKey }: { mondayKey: string }) {
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        disabled={busy}
        onClick={() =>
          start(async () => {
            setMsg(null);
            try {
              const res = await copyPreviousWeek(mondayKey);
              setMsg(
                res.created > 0
                  ? `${res.created} Schicht${res.created === 1 ? "" : "en"} aus der Vorwoche übernommen.`
                  : "Nichts zu übernehmen.",
              );
            } catch (e) {
              setMsg(e instanceof Error ? e.message : "Fehler");
            }
          })
        }
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:hover:bg-slate-800"
      >
        Vorwoche übernehmen
      </button>

      {confirmClear ? (
        <span className="flex items-center gap-2 text-sm">
          Ganze Woche leeren?
          <button
            disabled={busy}
            onClick={() =>
              start(async () => {
                setMsg(null);
                try {
                  await clearWeek(mondayKey);
                  setConfirmClear(false);
                } catch (e) {
                  setMsg(e instanceof Error ? e.message : "Fehler");
                }
              })
            }
            className="rounded bg-red-600 px-2 py-1 text-xs text-white"
          >
            Ja, leeren
          </button>
          <button onClick={() => setConfirmClear(false)} className="text-xs">
            Abbrechen
          </button>
        </span>
      ) : (
        <button
          onClick={() => setConfirmClear(true)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50 dark:border-slate-600 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          Woche leeren
        </button>
      )}

      {msg && <span className="text-sm text-slate-500 dark:text-slate-400">{msg}</span>}
    </div>
  );
}
