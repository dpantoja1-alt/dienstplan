"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import type { EntryFormState } from "./actions";

const inputCls =
  "rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-500 dark:border-slate-600 dark:bg-slate-800";

export type EntryDefaults = {
  start: string;
  end: string;
  breakMinutes: string;
  note: string;
};

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
    >
      {pending ? "Speichern …" : label}
    </button>
  );
}

export function EntryForm({
  action,
  defaults,
  submitLabel = "Speichern",
  hidden,
  onDone,
  onCancel,
}: {
  action: (state: EntryFormState, fd: FormData) => Promise<EntryFormState>;
  defaults: EntryDefaults;
  submitLabel?: string;
  hidden?: Record<string, string>;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const [state, formAction] = useActionState(action, {});

  useEffect(() => {
    if (state.ok) onDone?.();
  }, [state.ok, onDone]);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
      {hidden &&
        Object.entries(hidden).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium">
          Von
          <input type="datetime-local" name="start" defaultValue={defaults.start} required className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Bis
          <input type="datetime-local" name="end" defaultValue={defaults.end} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Pause (Min)
          <input
            type="number"
            name="breakMinutes"
            min="0"
            max="600"
            step="5"
            placeholder="auto"
            defaultValue={defaults.breakMinutes}
            className={`${inputCls} w-24`}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-xs font-medium">
        Notiz
        <input type="text" name="note" defaultValue={defaults.note} maxLength={500} className={inputCls} />
      </label>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <div className="flex gap-2">
        <Submit label={submitLabel} />
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm transition hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
          >
            Abbrechen
          </button>
        )}
      </div>
    </form>
  );
}
