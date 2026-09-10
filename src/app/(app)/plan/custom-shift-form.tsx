"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { saveCustomShift, type ShiftFormState } from "./actions";

const inputCls =
  "rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-500 dark:border-slate-600 dark:bg-slate-800";

export type CustomShiftDefaults = {
  shiftId?: string;
  label: string;
  start: string;
  end: string;
  breakMinutes: string;
  note: string;
  color: string;
};

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-brand-ink transition hover:bg-brand-strong disabled:opacity-60"
    >
      {pending ? "Speichern …" : label}
    </button>
  );
}

export function CustomShiftForm({
  userId,
  dateKey,
  defaults,
  onDone,
  onCancel,
}: {
  userId: string;
  dateKey: string;
  defaults: CustomShiftDefaults;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const [state, formAction] = useActionState<ShiftFormState, FormData>(
    saveCustomShift,
    {},
  );

  useEffect(() => {
    if (state.ok) onDone?.();
  }, [state.ok, onDone]);

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="dateKey" value={dateKey} />
      {defaults.shiftId && <input type="hidden" name="shiftId" value={defaults.shiftId} />}
      <input type="hidden" name="color" value={defaults.color} />

      <div className="flex flex-wrap gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium">
          Bezeichnung
          <input name="label" defaultValue={defaults.label} required maxLength={40} className={`${inputCls} w-32`} placeholder="z. B. Aushilfe" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Von
          <input type="time" name="start" defaultValue={defaults.start} required className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Bis
          <input type="time" name="end" defaultValue={defaults.end} required className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Pause
          <input type="number" name="breakMinutes" min="0" max="240" step="5" placeholder="–" defaultValue={defaults.breakMinutes} className={`${inputCls} w-20`} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs font-medium">
        Notiz
        <input name="note" defaultValue={defaults.note} maxLength={200} className={inputCls} />
      </label>

      {!defaults.shiftId && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="saveAsTemplate" />
          Als Vorlage speichern (dann künftig als Knopf verfügbar)
        </label>
      )}

      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

      <div className="flex gap-2">
        <Submit label={defaults.shiftId ? "Übernehmen" : "Hinzufügen"} />
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600">
            Abbrechen
          </button>
        )}
      </div>
    </form>
  );
}
