import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TZ } from "@/lib/time-zone";
import { ABSENCE_TYPES, type AbsenceKind } from "@/lib/absence-types";

export const metadata: Metadata = { title: "Protokoll – Eifel Wagyu" };

const PAGE_SIZE = 100;

const FIELD_LABELS: Record<string, string> = {
  start: "Beginn",
  end: "Ende",
  breakMinutes: "Pause (Min.)",
  note: "Notiz",
  status: "Status",
  type: "Art",
  halfDay: "Halber Tag",
  days: "Tage",
  expiresOn: "Verfällt nach",
  validFrom: "Gültig ab",
  date: "Stichtag",
  minutes: "Minuten",
  name: "Name",
  email: "E-Mail",
  role: "Rolle",
  weeklyHours: "Wochenstunden",
  workDaysPerWeek: "Arbeitstage",
  vacationDaysPerYear: "Urlaubstage",
  minBreakMinutes: "Mindestpause",
  employmentStart: "Eintrittsdatum",
  monthlySalary: "Gehalt",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "offen",
  CONFIRMED: "bestätigt",
  APPROVED: "genehmigt",
  REJECTED: "abgelehnt",
  ADMIN: "Admin",
  EMPLOYEE: "Mitarbeiter",
};

function formatValue(key: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "–";
  if (typeof v === "boolean") return v ? "ja" : "nein";
  if (typeof v === "number") return v.toLocaleString("de-DE");
  if (typeof v === "string") {
    if (key === "type" && v in ABSENCE_TYPES) return ABSENCE_TYPES[v as AbsenceKind].label;
    if (v in STATUS_LABELS) return STATUS_LABELS[v];
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return format(new TZDate(new Date(v), TZ), "dd.MM.yyyy HH:mm");
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return `${v.slice(8, 10)}.${v.slice(5, 7)}.${v.slice(0, 4)}`;
    return v;
  }
  return JSON.stringify(v);
}

type Json = Record<string, unknown> | null;

function Details({ before, after }: { before: Json; after: Json }) {
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];
  if (keys.length === 0) return null;
  const both = before && after;
  return (
    <details className="mt-1 text-xs text-slate-500 dark:text-slate-400">
      <summary className="cursor-pointer select-none">Details</summary>
      <table className="mt-1">
        <tbody>
          {keys.map((k) => (
            <tr key={k}>
              <td className="pr-3 align-top">{FIELD_LABELS[k] ?? k}</td>
              <td className="tabular-nums">
                {both ? (
                  <>
                    {formatValue(k, before[k])} <span aria-hidden>→</span> {formatValue(k, after[k])}
                  </>
                ) : (
                  formatValue(k, (before ?? after)?.[k])
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export default async function ProtokollPage({ searchParams }: PageProps<"/protokoll">) {
  await requireAdmin();
  const sp = await searchParams;
  const personId = typeof sp.m === "string" && sp.m ? sp.m : undefined;
  const beforeIso = typeof sp.vor === "string" && !Number.isNaN(Date.parse(sp.vor)) ? sp.vor : undefined;

  const [users, rows] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.auditLog.findMany({
      where: {
        ...(personId ? { subjectUserId: personId } : {}),
        ...(beforeIso ? { at: { lt: new Date(beforeIso) } } : {}),
      },
      orderBy: { at: "desc" },
      take: PAGE_SIZE + 1,
    }),
  ]);
  const hasMore = rows.length > PAGE_SIZE;
  const shown = rows.slice(0, PAGE_SIZE);
  const olderHref = hasMore
    ? (`/protokoll?${new URLSearchParams({
        ...(personId ? { m: personId } : {}),
        vor: shown[shown.length - 1].at.toISOString(),
      })}` as Route)
    : null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Änderungsprotokoll</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Wer hat wann Zeiten, Abwesenheiten, Stundenkonto oder Stammdaten geändert. Einträge lassen
          sich nicht bearbeiten oder löschen.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium">
          Mitarbeiter
          <select
            name="m"
            defaultValue={personId ?? ""}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
          >
            <option value="">Alle</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm transition hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
        >
          Anzeigen
        </button>
      </form>

      {shown.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Noch keine Einträge.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {shown.map((r) => (
            <li key={r.id} className="px-3 py-2 text-sm">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <span className="tabular-nums text-slate-500 dark:text-slate-400">
                  {format(new TZDate(r.at, TZ), "dd.MM.yyyy HH:mm")}
                </span>
                <span className="font-medium">{r.actorName}</span>
                {r.subjectName && r.subjectUserId !== r.actorId && (
                  <span className="text-slate-500 dark:text-slate-400">für {r.subjectName}</span>
                )}
              </div>
              <div className="mt-0.5">{r.summary}</div>
              <Details before={r.before as Json} after={r.after as Json} />
            </li>
          ))}
        </ul>
      )}

      {olderHref && (
        <Link href={olderHref} className="self-start text-sm underline">
          Ältere Einträge
        </Link>
      )}
    </div>
  );
}
