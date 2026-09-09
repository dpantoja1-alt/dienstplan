"use client";

import { useState, useTransition } from "react";
import { minutesToHHMM, formatShiftRange } from "@/lib/shift";
import { deleteTemplate, toggleTemplateActive } from "./actions";
import { TemplateForm } from "./template-form";

export type TemplateView = {
  id: string;
  name: string;
  shortLabel: string;
  startMinutes: number;
  endMinutes: number;
  breakMinutes: number | null;
  color: string;
  active: boolean;
  shiftCount: number;
};

export function TemplateRow({ t }: { t: TemplateView }) {
  const [mode, setMode] = useState<"view" | "edit" | "confirmDelete">("view");
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function run(fn: () => Promise<unknown>) {
    setErr(null);
    start(async () => {
      try {
        await fn();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Fehler");
        setMode("view");
      }
    });
  }

  if (mode === "edit") {
    return (
      <li className="p-3">
        <TemplateForm
          submitLabel="Übernehmen"
          defaults={{
            id: t.id,
            name: t.name,
            shortLabel: t.shortLabel,
            start: minutesToHHMM(t.startMinutes),
            end: minutesToHHMM(t.endMinutes),
            breakMinutes: t.breakMinutes?.toString() ?? "",
            color: t.color,
          }}
          onDone={() => setMode("view")}
          onCancel={() => setMode("view")}
        />
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 p-3">
      <div className="flex items-center gap-3">
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
        <div>
          <div className="flex items-center gap-2">
            <span className={`font-medium ${t.active ? "" : "text-slate-400 line-through"}`}>
              {t.name}
            </span>
            <span className="rounded bg-slate-100 px-1.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {t.shortLabel}
            </span>
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {formatShiftRange(t.startMinutes, t.endMinutes)}
            {t.breakMinutes ? ` · ${t.breakMinutes} Min Pause` : ""}
            {t.shiftCount > 0 ? ` · ${t.shiftCount}× im Plan` : ""}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <button
          disabled={busy}
          onClick={() => run(() => toggleTemplateActive(t.id, !t.active))}
          className="text-slate-500 hover:underline dark:text-slate-400"
        >
          {t.active ? "Deaktivieren" : "Aktivieren"}
        </button>
        <button onClick={() => setMode("edit")} className="text-slate-600 hover:underline dark:text-slate-300">
          Bearbeiten
        </button>
        {mode === "confirmDelete" ? (
          <span className="flex items-center gap-2">
            <span className="text-xs">Sicher?</span>
            <button
              disabled={busy}
              onClick={() => run(() => deleteTemplate(t.id))}
              className="rounded bg-red-600 px-2 py-0.5 text-xs text-white"
            >
              Löschen
            </button>
            <button onClick={() => setMode("view")} className="text-xs">
              Abbrechen
            </button>
          </span>
        ) : (
          <button onClick={() => setMode("confirmDelete")} className="text-red-600 hover:underline dark:text-red-400">
            Löschen
          </button>
        )}
      </div>
      {err && <p className="w-full text-sm text-red-600 dark:text-red-400">{err}</p>}
    </li>
  );
}
