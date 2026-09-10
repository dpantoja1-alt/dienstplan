"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { saveTemplate, type TemplateFormState } from "./actions";

const inputCls =
  "rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-500 dark:border-slate-600 dark:bg-slate-800";

export type TemplateDefaults = {
  id?: string;
  name: string;
  shortLabel: string;
  start: string;
  end: string;
  breakMinutes: string;
  color: string;
};

const COLORS = [
  "#64748b",
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

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

export function TemplateForm({
  defaults,
  submitLabel = "Speichern",
  onDone,
  onCancel,
}: {
  defaults: TemplateDefaults;
  submitLabel?: string;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const [state, formAction] = useActionState<TemplateFormState, FormData>(
    saveTemplate,
    {},
  );

  useEffect(() => {
    if (state.ok) onDone?.();
  }, [state.ok, onDone]);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900"
    >
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium">
          Name
          <input name="name" defaultValue={defaults.name} required className={inputCls} placeholder="Frühschicht" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Kürzel
          <input name="shortLabel" defaultValue={defaults.shortLabel} required maxLength={12} className={`${inputCls} w-24`} placeholder="Früh" />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium">
          Von
          <input type="time" name="start" defaultValue={defaults.start} required className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Bis
          <input type="time" name="end" defaultValue={defaults.end} required className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Pause (Min)
          <input type="number" name="breakMinutes" min="0" max="240" step="5" placeholder="–" defaultValue={defaults.breakMinutes} className={`${inputCls} w-24`} />
        </label>
      </div>

      <fieldset className="flex flex-col gap-1 text-xs font-medium">
        Farbe
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c, i) => (
            <label key={c} className="cursor-pointer">
              <input
                type="radio"
                name="color"
                value={c}
                defaultChecked={defaults.color ? defaults.color === c : i === 0}
                className="peer sr-only"
              />
              <span
                className="block h-6 w-6 rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-slate-900 dark:peer-checked:ring-white dark:ring-offset-slate-900"
                style={{ backgroundColor: c }}
              />
            </label>
          ))}
        </div>
      </fieldset>

      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

      <div className="flex gap-2">
        <Submit label={submitLabel} />
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600">
            Abbrechen
          </button>
        )}
      </div>
    </form>
  );
}
