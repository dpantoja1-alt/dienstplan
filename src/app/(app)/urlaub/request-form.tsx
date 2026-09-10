"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { requestVacation, type AbsenceFormState } from "./actions";

const inputCls =
  "rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-500 dark:border-slate-600 dark:bg-slate-800";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
    >
      {pending ? "Senden …" : "Antrag senden"}
    </button>
  );
}

export function RequestForm() {
  const [state, formAction] = useActionState<AbsenceFormState, FormData>(
    requestVacation,
    {},
  );
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [open, setOpen] = useState(false);
  const singleDay = start !== "" && start === end;

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      setStart("");
      setEnd("");
    }
  }, [state.ok]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
      >
        Urlaub beantragen
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium">
          Von
          <input
            type="date"
            name="start"
            required
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              if (!end || end < e.target.value) setEnd(e.target.value);
            }}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Bis
          <input
            type="date"
            name="end"
            required
            value={end}
            min={start || undefined}
            onChange={(e) => setEnd(e.target.value)}
            className={inputCls}
          />
        </label>
      </div>

      {singleDay && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="halfDay" /> nur ein halber Tag
        </label>
      )}

      <label className="flex flex-col gap-1 text-xs font-medium">
        Notiz (optional)
        <input name="note" maxLength={300} className={inputCls} />
      </label>

      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

      <div className="flex gap-2">
        <Submit />
        <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600">
          Abbrechen
        </button>
      </div>
    </form>
  );
}
