"use client";

import { useState, useTransition } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ViewEntry } from "@/lib/time-entry-view";
import { formatMinutes } from "@/lib/worktime";
import {
  deleteOwnEntry,
  requestCorrection,
  updateOwnEntry,
  type EntryFormState,
} from "./actions";
import { EntryForm } from "./entry-form";

function StatusBadge({ entry }: { entry: ViewEntry }) {
  if (entry.running) {
    return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">läuft</Badge>;
  }
  return entry.status === "CONFIRMED" ? (
    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">bestätigt</Badge>
  ) : (
    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">offen</Badge>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{children}</span>;
}

function CorrectionButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-brand-ink disabled:opacity-60">
      {pending ? "…" : "Korrektur einreichen"}
    </button>
  );
}

export function OwnEntryRow({ entry }: { entry: ViewEntry }) {
  const [mode, setMode] = useState<"view" | "edit" | "correct" | "confirmDelete">("view");
  const [deleting, startDelete] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const [corrState, corrAction] = useActionState<EntryFormState, FormData>(
    requestCorrection.bind(null, entry.id),
    {},
  );
  if (corrState.ok && mode === "correct") setMode("view");

  const breakText =
    entry.effectiveBreak == null
      ? "–"
      : entry.breakOverride != null
        ? `${entry.effectiveBreak} Min (manuell)`
        : `${entry.effectiveBreak} Min`;

  return (
    <li className="px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium tabular-nums">
            {entry.startTime}{entry.endTime ? `–${entry.endTime}` : " …"}
          </span>
          {entry.netMinutes != null && (
            <span className="tabular-nums text-slate-600 dark:text-slate-300">
              {formatMinutes(entry.netMinutes)}
            </span>
          )}
          <span className="text-xs text-slate-400">Pause {breakText}</span>
          {entry.source === "CLOCK" && (
            <span className="text-xs text-slate-400">· Stempeluhr</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge entry={entry} />
          {!entry.running && mode === "view" && (
            <div className="flex gap-1">
              {entry.status === "PENDING" ? (
                <>
                  <button onClick={() => setMode("edit")} className="text-sm text-slate-600 hover:underline dark:text-slate-300">
                    Bearbeiten
                  </button>
                  <button onClick={() => setMode("confirmDelete")} className="text-sm text-red-600 hover:underline dark:text-red-400">
                    Löschen
                  </button>
                </>
              ) : (
                <button onClick={() => setMode("correct")} className="text-sm text-slate-600 hover:underline dark:text-slate-300">
                  Korrektur vorschlagen
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {entry.note && mode === "view" && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Notiz: {entry.note}</p>
      )}
      {entry.correctionNote && (
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
          Korrekturhinweis: {entry.correctionNote}
        </p>
      )}

      {mode === "edit" && (
        <div className="mt-2">
          <EntryForm
            action={updateOwnEntry.bind(null, entry.id)}
            submitLabel="Übernehmen"
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

      {mode === "correct" && (
        <form action={corrAction} className="mt-2 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <label className="text-xs font-medium">
            Was stimmt nicht?
            <input name="reason" required minLength={3} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800" />
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Der Eintrag wird wieder geöffnet; danach kannst du ihn anpassen. Der Admin bestätigt erneut.
          </p>
          {corrState.error && <p className="text-sm text-red-600 dark:text-red-400">{corrState.error}</p>}
          <div className="flex gap-2">
            <CorrectionButton />
            <button type="button" onClick={() => setMode("view")} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600">
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {mode === "confirmDelete" && (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span>Eintrag wirklich löschen?</span>
          <button
            disabled={deleting}
            onClick={() =>
              startDelete(async () => {
                setErr(null);
                try {
                  await deleteOwnEntry(entry.id);
                } catch (e) {
                  setErr(e instanceof Error ? e.message : "Fehler");
                  setMode("view");
                }
              })
            }
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
