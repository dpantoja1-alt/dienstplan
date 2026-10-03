"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { addWorkSchedule, deleteWorkSchedule, type WorkScheduleState } from "../actions";

export type WorkScheduleRow = {
  id: string;
  fromKey: string;
  weeklyHours: number;
  workDaysPerWeek: number;
  note: string | null;
  isBase: boolean;
  isCurrent: boolean;
};

const inputCls =
  "rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-500 dark:border-slate-600 dark:bg-slate-800";

function fmt(key: string) {
  return `${key.slice(8, 10)}.${key.slice(5, 7)}.${key.slice(0, 4)}`;
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-brand-ink transition hover:bg-brand-strong disabled:opacity-60"
    >
      {pending ? "Speichern …" : "Übernehmen"}
    </button>
  );
}

function Row({ r, next }: { r: WorkScheduleRow; next?: WorkScheduleRow }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, start] = useTransition();
  const range = r.isBase
    ? next
      ? `bis ${fmt(prevDay(next.fromKey))}`
      : "durchgehend"
    : `ab ${fmt(r.fromKey)}`;
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-sm last:border-b-0 dark:border-slate-800/60">
      <span>
        <span className="inline-block min-w-28 tabular-nums">{range}</span>
        <span className="font-medium tabular-nums">
          {r.weeklyHours.toLocaleString("de-DE")} Std. / {r.workDaysPerWeek} Tage
        </span>
        {r.isCurrent && (
          <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs dark:bg-slate-700">heute gültig</span>
        )}
        {r.note && <span className="ml-3 text-slate-500 dark:text-slate-400">{r.note}</span>}
      </span>
      {!r.isBase &&
        (confirm ? (
          <span className="flex items-center gap-2">
            <button
              disabled={busy}
              onClick={() => start(() => deleteWorkSchedule(r.id))}
              className="text-red-600 hover:underline dark:text-red-400"
            >
              wirklich entfernen
            </button>
            <button onClick={() => setConfirm(false)} className="text-slate-500 hover:underline">
              abbrechen
            </button>
          </span>
        ) : (
          <button onClick={() => setConfirm(true)} className="text-slate-500 hover:underline dark:text-slate-400">
            entfernen
          </button>
        ))}
    </li>
  );
}

function prevDay(key: string): string {
  const d = new Date(`${key}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function WorkSchedulePanel({
  userId,
  rows,
  current,
  todayKey,
}: {
  userId: string;
  rows: WorkScheduleRow[];
  current: { weeklyHours: number; workDaysPerWeek: number };
  todayKey: string;
}) {
  const [state, formAction] = useActionState<WorkScheduleState, FormData>(
    addWorkSchedule.bind(null, userId),
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <section className="mt-8 flex max-w-2xl flex-col gap-3">
      <h2 className="text-lg font-semibold">Arbeitszeit</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Änderungen gelten ab dem gewählten Tag. Frühere Monate im Stundenkonto bleiben so, wie sie
        waren. Für eine Korrektur von Anfang an das Eintrittsdatum wählen.
      </p>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
          Bisher keine Änderung – es gelten durchgehend{" "}
          <span className="font-medium">
            {current.weeklyHours.toLocaleString("de-DE")} Std. / {current.workDaysPerWeek} Tage
          </span>
          .
        </p>
      ) : (
        <ul className="rounded-lg border border-slate-200 dark:border-slate-800">
          {rows.map((r, i) => (
            <Row key={r.id} r={r} next={rows[i + 1]} />
          ))}
        </ul>
      )}

      <form
        ref={formRef}
        action={formAction}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900"
      >
        <label className="flex flex-col gap-1 text-xs font-medium">
          Gültig ab
          <input type="date" name="validFrom" required defaultValue={todayKey} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Wochenstunden
          <input
            name="weeklyHours"
            type="number"
            step="0.5"
            min="0"
            max="80"
            required
            defaultValue={current.weeklyHours}
            className={`${inputCls} w-24`}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Tage / Woche
          <input
            name="workDaysPerWeek"
            type="number"
            min="1"
            max="7"
            required
            defaultValue={current.workDaysPerWeek}
            className={`${inputCls} w-20`}
          />
        </label>
        <label className="flex min-w-40 flex-1 flex-col gap-1 text-xs font-medium">
          Notiz (optional)
          <input name="note" maxLength={200} placeholder="z. B. Wechsel in Teilzeit" className={inputCls} />
        </label>
        <Submit />
        {state.error && <p className="w-full text-sm text-red-600 dark:text-red-400">{state.error}</p>}
        {state.ok && <p className="w-full text-sm text-emerald-700 dark:text-emerald-400">Gespeichert.</p>}
      </form>
    </section>
  );
}
