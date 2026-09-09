"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { EmployeeFormState } from "./actions";

export type EmployeeDefaults = {
  name: string;
  email: string;
  role: "ADMIN" | "EMPLOYEE";
  weeklyHours: number;
  workDaysPerWeek: number;
  vacationDaysPerYear: number;
  minBreakMinutes: number;
  employmentStart: string; // yyyy-mm-dd oder ""
};

const empty: EmployeeFormState = {};

function Field({
  label,
  name,
  error,
  children,
  hint,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && !error && (
        <span className="text-xs text-slate-500 dark:text-slate-400">{hint}</span>
      )}
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </label>
  );
}

const inputCls =
  "rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500 dark:border-slate-600 dark:bg-slate-800";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
    >
      {pending ? "Speichern …" : label}
    </button>
  );
}

export function EmployeeForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (state: EmployeeFormState, formData: FormData) => Promise<EmployeeFormState>;
  defaults: EmployeeDefaults;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, empty);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="mt-6 flex max-w-lg flex-col gap-4">
      <Field label="Name" name="name" error={fe.name}>
        <input name="name" defaultValue={defaults.name} required className={inputCls} />
      </Field>

      <Field label="E-Mail" name="email" error={fe.email}>
        <input
          name="email"
          type="email"
          defaultValue={defaults.email}
          required
          className={inputCls}
        />
      </Field>

      <Field label="Rolle" name="role" error={fe.role}>
        <select name="role" defaultValue={defaults.role} className={inputCls}>
          <option value="EMPLOYEE">Mitarbeiter</option>
          <option value="ADMIN">Admin</option>
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Wochenstunden" name="weeklyHours" error={fe.weeklyHours}>
          <input
            name="weeklyHours"
            type="number"
            step="0.5"
            min="0"
            max="80"
            defaultValue={defaults.weeklyHours}
            required
            className={inputCls}
          />
        </Field>
        <Field label="Arbeitstage / Woche" name="workDaysPerWeek" error={fe.workDaysPerWeek}>
          <input
            name="workDaysPerWeek"
            type="number"
            min="1"
            max="7"
            defaultValue={defaults.workDaysPerWeek}
            required
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Urlaubstage / Jahr"
          name="vacationDaysPerYear"
          error={fe.vacationDaysPerYear}
        >
          <input
            name="vacationDaysPerYear"
            type="number"
            step="0.5"
            min="0"
            max="60"
            defaultValue={defaults.vacationDaysPerYear}
            required
            className={inputCls}
          />
        </Field>
        <Field
          label="Pause mind. (Min)"
          name="minBreakMinutes"
          error={fe.minBreakMinutes}
          hint="0 = nur gesetzlich (30 ab 6 h, 45 ab 9 h)"
        >
          <input
            name="minBreakMinutes"
            type="number"
            min="0"
            max="240"
            step="5"
            defaultValue={defaults.minBreakMinutes}
            required
            className={inputCls}
          />
        </Field>
      </div>

      <Field
        label="Eintrittsdatum"
        name="employmentStart"
        error={fe.employmentStart}
        hint="Für anteiligen Urlaub im ersten Jahr"
      >
        <input
          name="employmentStart"
          type="date"
          defaultValue={defaults.employmentStart}
          className={inputCls}
        />
      </Field>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <div>
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
