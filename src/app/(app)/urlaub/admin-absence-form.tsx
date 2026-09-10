"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { adminSaveAbsence, type AbsenceFormState } from "./actions";

const inputCls =
  "rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-500 dark:border-slate-600 dark:bg-slate-800";

export type AbsenceDefaults = {
  entryId?: string;
  userId: string;
  type: "VACATION" | "SICK" | "OTHER";
  start: string;
  end: string;
  halfDay: boolean;
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

export function AdminAbsenceForm({
  users,
  defaults,
  lockUser = false,
  submitLabel = "Eintragen",
  onDone,
  onCancel,
}: {
  users: { id: string; name: string }[];
  defaults: AbsenceDefaults;
  lockUser?: boolean;
  submitLabel?: string;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const [state, formAction] = useActionState<AbsenceFormState, FormData>(
    adminSaveAbsence,
    {},
  );
  const [start, setStart] = useState(defaults.start);
  const [end, setEnd] = useState(defaults.end);
  const singleDay = start !== "" && start === end;

  useEffect(() => {
    if (state.ok) onDone?.();
  }, [state.ok, onDone]);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900"
    >
      {defaults.entryId && <input type="hidden" name="entryId" value={defaults.entryId} />}
      {lockUser && <input type="hidden" name="userId" value={defaults.userId} />}

      <div className="flex flex-wrap gap-3">
        {!lockUser && (
          <label className="flex flex-col gap-1 text-xs font-medium">
            Mitarbeiter
            <select name="userId" defaultValue={defaults.userId} required className={inputCls}>
              <option value="">– wählen –</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-xs font-medium">
          Art
          <select name="type" defaultValue={defaults.type} className={inputCls}>
            <option value="VACATION">Urlaub</option>
            <option value="SICK">Krank</option>
            <option value="OTHER">Sonstiges</option>
          </select>
        </label>
      </div>

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
          <input type="checkbox" name="halfDay" defaultChecked={defaults.halfDay} /> halber Tag
        </label>
      )}

      <label className="flex flex-col gap-1 text-xs font-medium">
        Notiz
        <input name="note" defaultValue={defaults.note} maxLength={300} className={inputCls} />
      </label>

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
