"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { acceptInvite, type AcceptState } from "./actions";

const inputCls =
  "rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500 dark:border-slate-600 dark:bg-slate-800";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-ink transition hover:bg-brand-strong disabled:opacity-60"
    >
      {pending ? "Speichern …" : "Passwort setzen & anmelden"}
    </button>
  );
}

export function AcceptForm({ token }: { token: string }) {
  const [state, formAction] = useActionState<AcceptState, FormData>(
    acceptInvite,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Neues Passwort</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputCls}
        />
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Mindestens 8 Zeichen
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Passwort wiederholen</span>
        <input
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputCls}
        />
      </label>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <SubmitButton />
    </form>
  );
}
