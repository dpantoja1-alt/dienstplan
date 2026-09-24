"use client";

import { PencilIcon, TrashIcon, iconBtn, iconBtnDanger } from "@/components/icons";
import { useState, useTransition } from "react";
import type { ViewEntry } from "@/lib/time-entry-view";
import { formatMinutes } from "@/lib/worktime";
import { PLAN_DEVIATION_THRESHOLD_MINUTES } from "@/lib/shift";
import { adminDeleteEntry, adminSaveEntry, confirmEntry } from "./actions";
import { EntryForm } from "./entry-form";

export function AdminEntryRow({
  entry,
  showConfirm = true,
  dateLabel,
  plannedMinutes,
}: {
  entry: ViewEntry;
  showConfirm?: boolean;
  dateLabel?: string;
  /** Geplante Netto-Minuten für diesen Tag (Summe aller Schichten), falls eine Schicht existiert. */
  plannedMinutes?: number | null;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "confirmDelete">("view");
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const breakText =
    entry.effectiveBreak == null
      ? "–"
      : entry.breakOverride != null
        ? `${entry.effectiveBreak} Min (manuell)`
        : `${entry.effectiveBreak} Min`;

  const deviates =
    entry.netMinutes != null &&
    plannedMinutes != null &&
    Math.abs(entry.netMinutes - plannedMinutes) > PLAN_DEVIATION_THRESHOLD_MINUTES;

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

  return (
    <li className="px-3 py-2">
      {dateLabel && (
        <div className="pb-1 text-xs text-slate-400">{dateLabel}</div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium tabular-nums">
            {entry.startTime}{entry.endTime ? `–${entry.endTime}` : " … (läuft)"}
          </span>
          {entry.netMinutes != null && (
            <span
              className={`tabular-nums ${deviates ? "font-semibold text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-300"}`}
            >
              {formatMinutes(entry.netMinutes)}
            </span>
          )}
          {deviates && (
            <span className="text-xs font-medium text-red-600 dark:text-red-400">
              ⚠ weicht &gt;1 h vom Plan ab
            </span>
          )}
          <span className="text-xs text-slate-400">Pause {breakText}</span>
          {entry.source === "CLOCK" && <span className="text-xs text-slate-400">· Stempeluhr</span>}
          {entry.status === "CONFIRMED" && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
              bestätigt
            </span>
          )}
        </div>

        {mode === "view" && (
          <div className="flex items-center gap-2">
            <button onClick={() => setMode("edit")} className={iconBtn} title="Bearbeiten" aria-label="Bearbeiten">
              <PencilIcon />
            </button>
            {showConfirm && entry.status === "PENDING" && !entry.running && (
              <button
                disabled={busy}
                onClick={() => run(() => confirmEntry(entry.id))}
                className="rounded-md bg-emerald-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-60"
              >
                Bestätigen
              </button>
            )}
            <button onClick={() => setMode("confirmDelete")} className={iconBtnDanger} title="Löschen" aria-label="Löschen">
              <TrashIcon />
            </button>
          </div>
        )}
      </div>

      {entry.note && mode === "view" && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Notiz: {entry.note}</p>
      )}
      {entry.correctionNote && (
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
          Korrekturwunsch: {entry.correctionNote}
        </p>
      )}

      {mode === "edit" && (
        <div className="mt-2">
          <EntryForm
            action={adminSaveEntry}
            submitLabel="Speichern"
            hidden={{ entryId: entry.id, userId: entry.userId }}
            defaults={{
              start: entry.startInput,
              end: entry.endInput ?? "",
              breakMinutes: entry.breakOverride?.toString() ?? "",
              note: entry.note ?? "",
            }}
            onDone={() => setMode("view")}
            onCancel={() => setMode("view")}
          />
        </div>
      )}

      {mode === "confirmDelete" && (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span>Eintrag wirklich löschen?</span>
          <button
            disabled={busy}
            onClick={() => run(() => adminDeleteEntry(entry.id))}
            className="rounded-md bg-red-600 px-3 py-1 text-white disabled:opacity-60"
          >
            Ja, löschen
          </button>
          <button onClick={() => setMode("view")} className="rounded-md border border-slate-300 px-3 py-1 dark:border-slate-600">
            Nein
          </button>
        </div>
      )}
      {err && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{err}</p>}
    </li>
  );
}
