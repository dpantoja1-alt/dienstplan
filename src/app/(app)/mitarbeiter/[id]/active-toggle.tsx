"use client";

import { useTransition } from "react";
import { setEmployeeActive } from "../actions";

export function ActiveToggle({
  userId,
  active,
  isSelf,
}: {
  userId: string;
  active: boolean;
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-800">
      <div className="text-sm">
        <span className="font-medium">Status:</span>{" "}
        {active ? "Aktiv – kann sich anmelden" : "Inaktiv – Anmeldung gesperrt"}
      </div>
      <button
        type="button"
        disabled={pending || (isSelf && active)}
        title={isSelf && active ? "Du kannst dich nicht selbst deaktivieren." : undefined}
        onClick={() =>
          startTransition(async () => {
            await setEmployeeActive(userId, !active);
          })
        }
        className="rounded-md border border-slate-300 px-3 py-1 text-sm transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-800"
      >
        {pending ? "…" : active ? "Deaktivieren" : "Aktivieren"}
      </button>
    </div>
  );
}
