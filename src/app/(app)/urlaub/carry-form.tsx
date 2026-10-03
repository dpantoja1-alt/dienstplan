"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveVacationCarry, type AbsenceFormState } from "./actions";

const inputCls =
  "rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-500 dark:border-slate-600 dark:bg-slate-800";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-brand-ink transition hover:bg-brand-strong disabled:opacity-60"
    >
      {pending ? "Speichern …" : "Speichern"}
    </button>
  );
}

/** Übertrag aus dem Vorjahr ins Jahr `year` festlegen (Tage leer = automatisch). */
export function CarryForm({
  userId,
  year,
  autoDays,
  days,
  expiresKey,
  note,
}: {
  userId: string;
  year: number;
  autoDays: number | null; // automatisch berechneter Rest des Vorjahres (null = nicht verfügbar)
  days: number | null; // vom Admin festgelegt
  expiresKey: string | null;
  note: string | null;
}) {
  const [state, formAction] = useActionState<AbsenceFormState, FormData>(saveVacationCarry, {});

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900"
    >
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="year" value={year} />
      <div>
        <h3 className="text-sm font-semibold">
          Resturlaub aus {year - 1} → {year}
        </h3>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {autoDays === null
            ? `Für ${year - 1} liegen keine Daten in der App – den Übertrag bei Bedarf hier eintragen.`
            : `Automatisch berechnet: ${autoDays.toLocaleString("de-DE")} Tage. Nur ausfüllen, wenn abweichend.`}
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium">
          Tage
          <input
            name="days"
            inputMode="decimal"
            defaultValue={days ?? ""}
            placeholder={autoDays === null ? "0" : `auto (${autoDays.toLocaleString("de-DE")})`}
            className={`${inputCls} w-32`}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Verfällt nach
          <input
            type="date"
            name="expiresOn"
            defaultValue={expiresKey ?? ""}
            min={`${year}-01-01`}
            max={`${year}-12-31`}
            className={inputCls}
          />
        </label>
        <label className="flex min-w-40 flex-1 flex-col gap-1 text-xs font-medium">
          Notiz (optional)
          <input name="note" maxLength={200} defaultValue={note ?? ""} className={inputCls} />
        </label>
        <Submit />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Ohne Verfallsdatum bleibt der Übertrag das ganze Jahr erhalten. Urlaub verfällt rechtlich nur,
        wenn der Mitarbeiter rechtzeitig auf den Resturlaub und den Verfall hingewiesen wurde – die App
        zeigt ihm dazu einen Hinweis auf der Übersicht und der Urlaubsseite.
      </p>
      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-700 dark:text-emerald-400">Gespeichert.</p>}
    </form>
  );
}
