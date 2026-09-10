"use client";

import { useState, useTransition } from "react";
import {
  absenceDayCount,
  absenceTypeLabel,
  formatAbsenceRange,
  statusLabel,
} from "@/lib/absence-view";
import { cancelOwnAbsence, decideAbsence, deleteAbsence } from "./actions";
import { AdminAbsenceForm } from "./admin-absence-form";

export type AbsenceView = {
  id: string;
  userId: string;
  userName?: string;
  type: "VACATION" | "SICK" | "OTHER";
  startKey: string;
  endKey: string;
  halfDay: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
  note: string | null;
};

const statusCls: Record<AbsenceView["status"], string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  APPROVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  REJECTED: "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

export function AbsenceRow({
  a,
  mode,
  users = [],
  footer,
}: {
  a: AbsenceView;
  mode: "own" | "admin";
  users?: { id: string; name: string }[];
  footer?: React.ReactNode;
}) {
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  function run(fn: () => Promise<unknown>) {
    setErr(null);
    start(async () => {
      try {
        await fn();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Fehler");
      }
    });
  }

  const days = absenceDayCount(a);

  if (editing) {
    return (
      <li className="p-3">
        <AdminAbsenceForm
          users={users}
          lockUser
          submitLabel="Übernehmen"
          defaults={{
            entryId: a.id,
            userId: a.userId,
            type: a.type,
            start: a.startKey,
            end: a.endKey,
            halfDay: a.halfDay,
            note: a.note ?? "",
          }}
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
      <div>
        <div className="flex items-center gap-2">
          {a.userName && <span className="font-medium">{a.userName}</span>}
          <span>{absenceTypeLabel(a.type)}</span>
          <span className="text-slate-500 dark:text-slate-400">
            {formatAbsenceRange(a.startKey, a.endKey, a.halfDay)} · {days} Tag{days === 1 ? "" : "e"}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusCls[a.status]}`}>
            {statusLabel(a.status)}
          </span>
        </div>
        {a.note && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{a.note}</p>}
        {footer}
        {err && <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">{err}</p>}
      </div>

      <div className="flex items-center gap-2">
        {mode === "own" && a.status === "PENDING" && (
          <button
            disabled={busy}
            onClick={() => run(() => cancelOwnAbsence(a.id))}
            className="text-red-600 hover:underline dark:text-red-400"
          >
            Zurückziehen
          </button>
        )}
        {mode === "admin" && (
          <>
            {a.status === "PENDING" && (
              <>
                <button
                  disabled={busy}
                  onClick={() => run(() => decideAbsence(a.id, true))}
                  className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-60"
                >
                  Genehmigen
                </button>
                <button
                  disabled={busy}
                  onClick={() => run(() => decideAbsence(a.id, false))}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-600"
                >
                  Ablehnen
                </button>
              </>
            )}
            <button onClick={() => setEditing(true)} className="text-slate-600 hover:underline dark:text-slate-300">
              Bearbeiten
            </button>
            <button
              disabled={busy}
              onClick={() => run(() => deleteAbsence(a.id))}
              className="text-red-600 hover:underline dark:text-red-400"
            >
              Löschen
            </button>
          </>
        )}
      </div>
    </li>
  );
}
