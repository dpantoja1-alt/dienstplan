"use client";

import { useState, useTransition } from "react";
import { deleteEmployee } from "../actions";

export function DeleteEmployee({
  userId,
  name,
  impact,
}: {
  userId: string;
  name: string;
  impact: { timeEntries: number; shifts: number; absences: number };
}) {
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const total = impact.timeEntries + impact.shifts + impact.absences;

  return (
    <section className="mt-10 rounded-lg border border-red-200 p-4 dark:border-red-900/50">
      <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">
        Mitarbeiter löschen
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Endgültig und nicht umkehrbar. Wenn der Mitarbeiter nur pausieren soll, nutze
        oben „Deaktivieren“.
      </p>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-3 rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          Löschen …
        </button>
      ) : (
        <div className="mt-3 flex flex-col gap-2 text-sm">
          {total > 0 ? (
            <p className="text-slate-700 dark:text-slate-200">
              Dabei werden auch mitgelöscht:
              {impact.timeEntries > 0 && ` ${impact.timeEntries} Zeiteintrag/e`}
              {impact.shifts > 0 && ` ${impact.shifts} Schicht/en`}
              {impact.absences > 0 && ` ${impact.absences} Abwesenheit/en`}
              .
            </p>
          ) : (
            <p className="text-slate-700 dark:text-slate-200">
              Es hängen keine Zeiten, Schichten oder Abwesenheiten an diesem Konto.
            </p>
          )}
          <label className="flex flex-col gap-1">
            Zur Bestätigung <span className="font-medium">{name}</span> eintippen:
            <input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800"
            />
          </label>
          {err && <p className="text-red-600 dark:text-red-400">{err}</p>}
          <div className="flex gap-2">
            <button
              disabled={busy || confirmName.trim() !== name}
              onClick={() =>
                start(async () => {
                  setErr(null);
                  try {
                    await deleteEmployee(userId);
                  } catch (e) {
                    setErr(e instanceof Error ? e.message : "Fehler");
                  }
                })
              }
              className="rounded-md bg-red-600 px-3 py-1.5 font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {busy ? "Löschen …" : "Endgültig löschen"}
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setConfirmName("");
                setErr(null);
              }}
              className="rounded-md border border-slate-300 px-3 py-1.5 dark:border-slate-600"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
