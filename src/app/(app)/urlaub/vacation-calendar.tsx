"use client";

import { ChevronLeftIcon, ChevronRightIcon, navArrow } from "@/components/icons";
import { useState } from "react";
import { AbsenceRow, type AbsenceView } from "./absence-row";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];
const MAX_CHIPS = 3;

const pad = (n: number) => String(n).padStart(2, "0");

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
}

const chipCls: Record<"APPROVED" | "PENDING", string> = {
  APPROVED: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200",
  PENDING:
    "border border-dashed border-amber-500 bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
};

export function VacationCalendar({
  year,
  initialMonth,
  absences,
  holidays,
  users,
}: {
  year: number;
  initialMonth: number;
  absences: AbsenceView[];
  holidays: Record<string, string>;
  users: { id: string; name: string }[];
}) {
  const [month, setMonth] = useState(initialMonth);
  const [selected, setSelected] = useState<string | null>(null);

  const offset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${year}-${pad(month + 1)}-${pad(i + 1)}`),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const visible = absences.filter((a) => a.status !== "REJECTED");
  const onDay = (key: string) =>
    visible
      .filter((a) => a.startKey <= key && key <= a.endKey)
      .sort((a, b) => (a.userName ?? "").localeCompare(b.userName ?? "", "de"));

  const selectedEntries = selected ? onDay(selected) : [];

  function go(delta: number) {
    setMonth((m) => Math.min(11, Math.max(0, m + delta)));
    setSelected(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => go(-1)}
            disabled={month === 0}
            aria-label="Vorheriger Monat"
            className={`${navArrow} disabled:opacity-40`}
          >
            <ChevronLeftIcon />
          </button>
          <span className="min-w-36 text-center font-medium">
            {MONTHS[month]} {year}
          </span>
          <button
            onClick={() => go(1)}
            disabled={month === 11}
            aria-label="Nächster Monat"
            className={`${navArrow} disabled:opacity-40`}
          >
            <ChevronRightIcon />
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-emerald-300 dark:bg-emerald-700" /> genehmigt
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded border border-dashed border-amber-500 bg-amber-200 dark:bg-amber-800" />{" "}
            in Prüfung
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((key, i) => {
            if (!key) {
              return <div key={`e${i}`} className="min-h-16 border-b border-r border-slate-100 bg-slate-50/50 dark:border-slate-800/60 dark:bg-slate-900/30 sm:min-h-24" />;
            }
            const entries = onDay(key);
            const weekend = i % 7 >= 5;
            const holiday = holidays[key];
            const isSel = selected === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(isSel ? null : key)}
                title={holiday}
                className={
                  "flex min-h-16 flex-col items-stretch gap-0.5 border-b border-r border-slate-100 p-1 text-left transition hover:bg-slate-100 dark:border-slate-800/60 dark:hover:bg-slate-800/60 sm:min-h-24 " +
                  (isSel
                    ? "bg-sky-50 ring-2 ring-inset ring-sky-500 dark:bg-sky-950/40 "
                    : weekend || holiday
                      ? "bg-slate-50 dark:bg-slate-900/50 "
                      : "")
                }
              >
                <span className={"text-xs " + (holiday ? "font-semibold text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400")}>
                  {Number(key.slice(8))}
                </span>
                {entries.slice(0, MAX_CHIPS).map((a) => (
                  <span
                    key={a.id}
                    className={`truncate rounded px-1 text-[10px] leading-4 sm:text-xs ${chipCls[a.status as "APPROVED" | "PENDING"]}`}
                  >
                    {shortName(a.userName ?? "")}
                    {a.halfDay ? " ½" : ""}
                  </span>
                ))}
                {entries.length > MAX_CHIPS && (
                  <span className="px-1 text-[10px] text-slate-500 dark:text-slate-400 sm:text-xs">
                    +{entries.length - MAX_CHIPS} weitere
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="border-b border-slate-200 px-3 py-2 text-sm font-medium dark:border-slate-800">
            {selected.slice(8)}.{selected.slice(5, 7)}.{selected.slice(0, 4)}
            {holidays[selected] && (
              <span className="ml-2 font-normal text-red-600 dark:text-red-400">{holidays[selected]}</span>
            )}
          </div>
          {selectedEntries.length === 0 ? (
            <p className="p-3 text-sm text-slate-500 dark:text-slate-400">Niemand im Urlaub.</p>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {selectedEntries.map((a) => (
                <AbsenceRow key={a.id} a={a} mode="admin" users={users} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
