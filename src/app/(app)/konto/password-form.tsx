"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { changePassword, type PasswordState } from "./actions";

const inputCls =
  "rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500 dark:border-slate-600 dark:bg-slate-800";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
    >
      {pending ? "Speichern …" : "Passwort ändern"}
    </button>
  );
}

export function PasswordForm() {
  const [state, formAction] = useActionState<PasswordState, FormData>(
    changePassword,
    {},
  );

  return (
    <form action={formAction} className="mt-6 flex max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Aktuelles Passwort</span>
        <input name="current" type="password" required autoComplete="current-password" className={inputCls} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Neues Passwort</span>
        <input name="next" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
        <span className="text-xs text-slate-500 dark:text-slate-400">Mindestens 8 Zeichen</span>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Neues Passwort wiederholen</span>
        <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
      </label>

      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state.ok && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Passwort geändert.
        </p>
      )}

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
