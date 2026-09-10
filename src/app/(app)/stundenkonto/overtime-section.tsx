"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { format } from "date-fns";
import { formatMinutes } from "@/lib/worktime";
import {
  addOvertimePayout,
  deleteBalanceAdjustment,
  type PayoutState,
} from "./actions";

const inputCls =
  "rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-500 dark:border-slate-600 dark:bg-slate-800";

export type Adjustment = {
  id: string;
  dateKey: string;
  minutes: number;
  note: string | null;
};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-brand-ink transition hover:bg-brand-strong disabled:opacity-60"
    >
      {pending ? "Speichern …" : "Auszahlung buchen"}
    </button>
  );
}

function AdjustmentRow({ a }: { a: Adjustment }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, start] = useTransition();
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-sm dark:border-slate-800/60">
      <span>
        <span className="tabular-nums">
          {format(new Date(`${a.dateKey}T00:00:00.000Z`), "dd.MM.yyyy")}
        </span>
        <span
          className={`ml-3 font-medium tabular-nums ${a.minutes < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}
        >
          {formatMinutes(a.minutes)}
        </span>
        {a.note && <span className="ml-3 text-slate-500 dark:text-slate-400">{a.note}</span>}
      </span>
      {confirm ? (
        <span className="flex items-center gap-2">
          <button
            disabled={busy}
            onClick={() => start(() => deleteBalanceAdjustment(a.id))}
            className="text-red-600 hover:underline dark:text-red-400"
          >
            wirklich löschen
          </button>
          <button onClick={() => setConfirm(false)} className="text-slate-500 hover:underline">
            abbrechen
          </button>
        </span>
      ) : (
        <button
          onClick={() => setConfirm(true)}
          className="text-slate-500 hover:underline dark:text-slate-400"
        >
          löschen
        </button>
      )}
    </li>
  );
}

export function OvertimeSection({
  userId,
  userName,
  adjustments,
}: {
  userId: string;
  userName: string;
  adjustments: Adjustment[];
}) {
  const [state, formAction] = useActionState<PayoutState, FormData>(addOvertimePayout, {});
  const formRef = useRef<HTMLFormElement>(null);
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Überstunden auszahlen</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Ausgezahlte Stunden werden vom Stundenkonto von{" "}
        <span className="font-medium">{userName}</span> abgezogen und hier protokolliert.
      </p>

      <form
        ref={formRef}
        action={formAction}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900"
      >
        <input type="hidden" name="userId" value={userId} />
        <label className="flex flex-col gap-1 text-xs font-medium">
          Stunden
          <input
            name="hours"
            inputMode="decimal"
            required
            placeholder="z. B. 10 oder 8,5"
            className={`${inputCls} w-32`}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Stichtag
          <input type="date" name="date" required defaultValue={today} className={inputCls} />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs font-medium">
          Notiz
          <input
            name="note"
            maxLength={200}
            placeholder="z. B. mit Septembergehalt ausgezahlt"
            className={inputCls}
          />
        </label>
        <Submit />
      </form>

      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

      {adjustments.length > 0 && (
        <ul className="rounded-lg border border-slate-200 dark:border-slate-800">
          {adjustments.map((a) => (
            <AdjustmentRow key={a.id} a={a} />
          ))}
        </ul>
      )}
    </section>
  );
}
