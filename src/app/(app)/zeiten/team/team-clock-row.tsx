"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { formatMinutes } from "@/lib/worktime";
import {
  adminClockIn,
  adminClockOut,
  adminDeleteEntry,
  adminSaveEntry,
} from "../actions";
import { EntryForm } from "../entry-form";

type TodayEntry = {
  id: string;
  startTime: string;
  endTime: string | null;
  netMinutes: number | null;
  status: "PENDING" | "CONFIRMED";
  startInput: string;
  endInput: string;
  breakOverride: string;
  note: string;
  running: boolean;
};

export type TeamRow = {
  userId: string;
  name: string;
  role: "ADMIN" | "EMPLOYEE";
  openSinceISO: string | null;
  todayNetMinutes: number;
  todayEntries: TodayEntry[];
  defaultStart: string;
  alert: string | null;
};

function TodayEntryItem({ userId, entry }: { userId: string; entry: TodayEntry }) {
  const [mode, setMode] = useState<"view" | "edit" | "confirmDelete">("view");
  const [busy, startT] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function run(fn: () => Promise<unknown>) {
    setErr(null);
    startT(async () => {
      try {
        await fn();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Fehler");
        setMode("view");
      }
    });
  }

  if (mode === "edit") {
    return (
      <li className="mt-1">
        <EntryForm
          action={adminSaveEntry}
          hidden={{ userId, entryId: entry.id }}
          submitLabel="Übernehmen"
          defaults={{
            start: entry.startInput,
            end: entry.endInput,
            breakMinutes: entry.breakOverride,
            note: entry.note,
          }}
          onDone={() => setMode("view")}
          onCancel={() => setMode("view")}
        />
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
      <span className="tabular-nums">
        {entry.startTime}
        {entry.endTime ? `–${entry.endTime}` : " …"}
        {entry.netMinutes != null && ` (${formatMinutes(entry.netMinutes)})`}
        {entry.status === "PENDING" && " · offen"}
      </span>
      {!entry.running && mode === "view" && (
        <>
          <button onClick={() => setMode("edit")} className="text-slate-500 hover:underline dark:text-slate-400">
            Ändern
          </button>
          <button onClick={() => setMode("confirmDelete")} className="text-red-600 hover:underline dark:text-red-400">
            Löschen
          </button>
        </>
      )}
      {mode === "confirmDelete" && (
        <span className="flex items-center gap-1.5">
          wirklich löschen?
          <button
            disabled={busy}
            onClick={() => run(() => adminDeleteEntry(entry.id))}
            className="rounded bg-red-600 px-1.5 py-0.5 text-white"
          >
            Ja
          </button>
          <button onClick={() => setMode("view")} className="hover:underline">Nein</button>
        </span>
      )}
      {err && <span className="text-red-600 dark:text-red-400">{err}</span>}
    </li>
  );
}

export function TeamClockRow({ row }: { row: TeamRow }) {
  const [pending, startT] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!row.openSinceISO) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [row.openSinceISO]);

  const elapsed = row.openSinceISO
    ? Math.max(0, Math.floor((now - new Date(row.openSinceISO).getTime()) / 1000))
    : 0;
  const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");

  function run(fn: () => Promise<unknown>) {
    setErr(null);
    startT(async () => {
      try {
        await fn();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Fehler");
      }
    });
  }

  const running = row.openSinceISO !== null;

  return (
    <li className={`px-3 py-3 ${row.alert ? "border-l-4 border-red-500 bg-red-50/60 dark:bg-red-950/30" : ""}`}>
      {row.alert && (
        <p className="mb-1.5 text-sm font-medium text-red-700 dark:text-red-400">
          ⚠ {row.alert}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium">
            <Link href={`/mitarbeiter/${row.userId}/zeiten`} className="hover:underline">
              {row.name}
            </Link>
            {row.role === "ADMIN" && (
              <span className="ml-1.5 rounded bg-slate-100 px-1.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                Admin
              </span>
            )}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {running ? (
              <>
                eingestempelt seit{" "}
                {new Date(row.openSinceISO!).toLocaleTimeString("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                · <span className="font-mono tabular-nums">{hh}:{mm}</span>
              </>
            ) : (
              "nicht eingestempelt"
            )}
            {row.todayNetMinutes > 0 && ` · heute ${formatMinutes(row.todayNetMinutes)}`}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {running ? (
            <button
              disabled={pending}
              onClick={() => run(() => adminClockOut(row.userId))}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              Ausstempeln
            </button>
          ) : (
            <button
              disabled={pending}
              onClick={() => run(() => adminClockIn(row.userId))}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              Einstempeln
            </button>
          )}
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm transition hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
          >
            {showAdd ? "Abbrechen" : "+ Nachtragen"}
          </button>
        </div>
      </div>

      {row.todayEntries.length > 0 && (
        <ul className="mt-1.5 flex flex-col gap-1">
          {row.todayEntries.map((e) => (
            <TodayEntryItem key={e.id} userId={row.userId} entry={e} />
          ))}
        </ul>
      )}

      {err && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{err}</p>}

      {showAdd && (
        <div className="mt-2">
          <EntryForm
            action={adminSaveEntry}
            hidden={{ userId: row.userId }}
            submitLabel="Nachtragen"
            defaults={{ start: row.defaultStart, end: "", breakMinutes: "", note: "" }}
            onDone={() => setShowAdd(false)}
            onCancel={() => setShowAdd(false)}
          />
        </div>
      )}
    </li>
  );
}
