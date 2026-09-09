"use client";

import { useState, useTransition } from "react";
import { confirmAllForUser } from "./actions";

export function ConfirmAllButton({ userId }: { userId: string }) {
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  return (
    <>
      <button
        disabled={busy}
        onClick={() =>
          start(async () => {
            setErr(null);
            try {
              await confirmAllForUser(userId);
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Fehler");
            }
          })
        }
        className="rounded-md border border-emerald-600 px-3 py-1 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
      >
        Alle bestätigen
      </button>
      {err && <span className="text-sm text-red-600 dark:text-red-400">{err}</span>}
    </>
  );
}
