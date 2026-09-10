"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMinutes } from "@/lib/worktime";
import { formatShiftRange } from "@/lib/shift";
import { formatEuro } from "@/lib/cost";
import { CellEditor } from "./cell-editor";
import { DayNoteCell } from "./day-note-cell";
import type {
  DayNote,
  GridAbsence,
  GridDay,
  GridIst,
  GridShift,
  GridTemplate,
  GridUser,
} from "./types";

/** Kompakte Stundenanzeige für die schmalen Summen-Spalten: 452 → "7:32" */
function hm(total: number): string {
  const sign = total < 0 ? "-" : "";
  const abs = Math.abs(Math.round(total));
  return `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`;
}

function useToggle(key: string): [boolean, () => void] {
  const [on, setOn] = useState(false);
  useEffect(() => {
    try {
      setOn(localStorage.getItem(key) === "1");
    } catch {
      /* egal */
    }
  }, [key]);
  const toggle = () => {
    setOn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(key, next ? "1" : "0");
      } catch {
        /* egal */
      }
      return next;
    });
  };
  return [on, toggle];
}

export function PlanGrid({
  users,
  days,
  shifts,
  absences,
  ist,
  dayNotes,
  templates,
  canEdit,
  showCostControls,
}: {
  users: GridUser[];
  days: GridDay[];
  shifts: GridShift[];
  absences: GridAbsence[];
  ist: GridIst[];
  dayNotes: DayNote[];
  templates: GridTemplate[];
  canEdit: boolean;
  showCostControls: boolean;
}) {
  const [sel, setSel] = useState<{ userId: string; dayKey: string } | null>(null);
  const [showIst, toggleIst] = useToggle("plan.showIst");
  const [showCost, toggleCost] = useToggle("plan.showCost");

  const byCell = useMemo(() => {
    const map = new Map<string, GridShift[]>();
    for (const s of shifts) {
      const k = `${s.userId}|${s.dateKey}`;
      const arr = map.get(k);
      if (arr) arr.push(s);
      else map.set(k, [s]);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.startMinutes - b.startMinutes);
    return map;
  }, [shifts]);

  const absenceByCell = useMemo(() => {
    const map = new Map<string, GridAbsence>();
    for (const a of absences) map.set(`${a.userId}|${a.dayKey}`, a);
    return map;
  }, [absences]);

  const istByCell = useMemo(() => {
    const map = new Map<string, GridIst>();
    for (const i of ist) map.set(`${i.userId}|${i.dayKey}`, i);
    return map;
  }, [ist]);

  const weekTotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of shifts) m.set(s.userId, (m.get(s.userId) ?? 0) + s.durationMinutes);
    return m;
  }, [shifts]);

  // Ist-Minuten und Kosten je Mitarbeiter über die ganze Woche
  const weekIst = useMemo(() => {
    const min = new Map<string, number>();
    const cost = new Map<string, number>();
    for (const i of ist) {
      min.set(i.userId, (min.get(i.userId) ?? 0) + i.netMinutes);
      if (i.cost != null) cost.set(i.userId, (cost.get(i.userId) ?? 0) + i.cost);
    }
    return { min, cost };
  }, [ist]);

  const summary = useMemo(() => {
    let soll = 0;
    let geplant = 0;
    let istMin = 0;
    let kosten = 0;
    for (const u of users) {
      soll += u.sollMinutes;
      geplant += weekTotals.get(u.id) ?? 0;
      istMin += weekIst.min.get(u.id) ?? 0;
      kosten += Math.round(weekIst.cost.get(u.id) ?? 0);
    }
    return { soll, geplant, istMin, kosten };
  }, [users, weekTotals, weekIst]);

  const dayCostTotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of ist) {
      if (i.cost == null) continue;
      m.set(i.dayKey, (m.get(i.dayKey) ?? 0) + i.cost);
    }
    // Wochensumme aus den gerundeten Tageswerten, damit die Anzeige zusammenpasst
    let total = 0;
    for (const v of m.values()) total += Math.round(v);
    return { byDay: m, total };
  }, [ist]);

  const noteByDay = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of dayNotes) m.set(n.dayKey, n.text);
    return m;
  }, [dayNotes]);

  const selUser = sel ? users.find((u) => u.id === sel.userId) : null;
  const selDay = sel ? days.find((d) => d.key === sel.dayKey) : null;
  const selShifts = sel ? (byCell.get(`${sel.userId}|${sel.dayKey}`) ?? []) : [];

  const hasAnyNote = dayNotes.some((n) => n.text);
  const showNoteRow = canEdit || hasAnyNote;

  const showIstCol = canEdit;
  const showKostenCol = canEdit && showCost;
  // Anzahl der Zusammenfassungs-Spalten rechts (für Leerzellen in anderen Zeilen)
  const rightCols = 2 + (showIstCol ? 1 : 0) + (showKostenCol ? 1 : 0);
  const emptyRight = Array.from({ length: rightCols });

  return (
    <div>
      {canEdit && (
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={showIst} onChange={toggleIst} />
            Ist-Zeiten
          </label>
          {showCostControls && (
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={showCost} onChange={toggleCost} />
              Kosten
            </label>
          )}
        </div>
      )}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-[var(--background,#fafafa)] p-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                Mitarbeiter
              </th>
              {days.map((d) => (
                <th
                  key={d.key}
                  className={`min-w-28 p-2 text-center font-medium ${d.isToday ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}
                >
                  <div>{d.weekday}</div>
                  <div className="text-xs font-normal">{d.label}</div>
                  {d.holiday && (
                    <div className="mt-0.5 text-[10px] font-normal leading-tight text-rose-600 dark:text-rose-400">
                      {d.holiday}
                    </div>
                  )}
                </th>
              ))}
              <th className="min-w-16 border-l-2 border-slate-300 p-2 text-center text-xs font-semibold text-slate-500 dark:border-slate-600 dark:text-slate-400">
                Soll
              </th>
              <th className="min-w-16 border-l border-slate-200 p-2 text-center text-xs font-semibold text-slate-500 dark:border-slate-800/60 dark:text-slate-400">
                Geplant
              </th>
              {showIstCol && (
                <th className="min-w-16 border-l border-slate-200 p-2 text-center text-xs font-semibold text-slate-500 dark:border-slate-800/60 dark:text-slate-400">
                  Ist
                </th>
              )}
              {showKostenCol && (
                <th className="min-w-16 border-l border-slate-200 p-2 text-center text-xs font-semibold text-slate-500 dark:border-slate-800/60 dark:text-slate-400">
                  Kosten
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {showNoteRow && (
              <tr className="border-t border-slate-200 dark:border-slate-800">
                <th className="sticky left-0 z-10 bg-[var(--background,#fafafa)] p-2 text-left align-top text-xs font-medium text-slate-400 dark:bg-slate-950">
                  Info
                </th>
                {days.map((d) => (
                  <td
                    key={d.key}
                    className={`border-l border-slate-100 p-1.5 align-top dark:border-slate-800/60 ${d.holiday ? "bg-rose-50/50 dark:bg-rose-950/20" : ""}`}
                  >
                    <DayNoteCell dayKey={d.key} text={noteByDay.get(d.key) ?? ""} canEdit={canEdit} />
                  </td>
                ))}
                {emptyRight.map((_, i) => (
                  <td
                    key={i}
                    className={`${i === 0 ? "border-l-2 border-slate-300 dark:border-slate-600" : "border-l border-slate-100 dark:border-slate-800/60"}`}
                  />
                ))}
              </tr>
            )}

            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-200 dark:border-slate-800">
                <th className="sticky left-0 z-10 max-w-40 bg-[var(--background,#fafafa)] p-2 text-left align-top font-medium dark:bg-slate-950">
                  <span className={u.isSelf ? "text-sky-700 dark:text-sky-400" : ""}>
                    {u.name}
                  </span>
                </th>
                {days.map((d) => {
                  const cellShifts = byCell.get(`${u.id}|${d.key}`) ?? [];
                  const absence = absenceByCell.get(`${u.id}|${d.key}`);
                  const cellIst = istByCell.get(`${u.id}|${d.key}`);
                  const isSel = sel?.userId === u.id && sel?.dayKey === d.key;
                  return (
                    <td
                      key={d.key}
                      onClick={canEdit ? () => setSel({ userId: u.id, dayKey: d.key }) : undefined}
                      className={`border-l border-slate-100 p-1 align-top dark:border-slate-800/60 ${
                        d.holiday ? "bg-rose-50/50 dark:bg-rose-950/20" : ""
                      } ${
                        canEdit ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900" : ""
                      } ${isSel ? "outline outline-2 outline-slate-900 dark:outline-white" : ""}`}
                    >
                      <div className="flex flex-col gap-1">
                        {absence && (
                          <div
                            className="rounded border px-1.5 py-1 text-xs font-medium leading-tight"
                            style={{ borderColor: absence.color, color: absence.color }}
                          >
                            {absence.label}
                          </div>
                        )}
                        {cellShifts.map((s) => (
                          <div
                            key={s.id}
                            className="rounded px-1.5 py-1 text-xs font-medium leading-tight text-white"
                            style={{ backgroundColor: s.color }}
                            title={`${s.label} ${formatShiftRange(s.startMinutes, s.endMinutes)}`}
                          >
                            <div>{s.label}</div>
                            <div className="font-normal opacity-90">
                              {formatShiftRange(s.startMinutes, s.endMinutes)}
                            </div>
                          </div>
                        ))}
                        {canEdit && cellShifts.length === 0 && !absence && (
                          <span className="block py-1 text-center text-xs text-slate-300 dark:text-slate-600">
                            +
                          </span>
                        )}
                        {canEdit && showIst && cellIst && cellIst.netMinutes > 0 && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Ist {formatMinutes(cellIst.netMinutes)}
                          </div>
                        )}
                        {canEdit && showCost && cellIst && cellIst.cost != null && cellIst.cost > 0 && (
                          <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                            {formatEuro(cellIst.cost)}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}

                {(() => {
                  const soll = u.sollMinutes;
                  const geplant = weekTotals.get(u.id) ?? 0;
                  const istMin = weekIst.min.get(u.id) ?? 0;
                  const kosten = weekIst.cost.get(u.id) ?? 0;
                  return (
                    <>
                      <td className="border-l-2 border-slate-300 p-2 text-center text-xs tabular-nums whitespace-nowrap text-slate-600 dark:border-slate-600 dark:text-slate-300">
                        {hm(soll)}
                      </td>
                      <td
                        className={`border-l border-slate-100 p-2 text-center text-xs tabular-nums whitespace-nowrap dark:border-slate-800/60 ${
                          geplant < soll ? "text-amber-600 dark:text-amber-400" : "text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {hm(geplant)}
                      </td>
                      {showIstCol && (
                        <td
                          className={`border-l border-slate-100 p-2 text-center text-xs font-medium tabular-nums whitespace-nowrap dark:border-slate-800/60 ${
                            istMin === 0
                              ? "text-slate-400"
                              : istMin + 1 < soll
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-emerald-700 dark:text-emerald-400"
                          }`}
                        >
                          {istMin === 0 ? "–" : hm(istMin)}
                        </td>
                      )}
                      {showKostenCol && (
                        <td className="border-l border-slate-100 p-2 text-center text-xs tabular-nums whitespace-nowrap text-slate-600 dark:border-slate-800/60 dark:text-slate-300">
                          {kosten > 0 ? formatEuro(kosten) : ""}
                        </td>
                      )}
                    </>
                  );
                })()}
              </tr>
            ))}

            {canEdit && showCost && dayCostTotals.total > 0 && (
              <tr className="border-t border-slate-200 dark:border-slate-800/60">
                <th className="sticky left-0 z-10 bg-[var(--background,#fafafa)] p-2 text-left text-xs font-medium text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                  Kosten/Tag
                </th>
                {days.map((d) => (
                  <td key={d.key} className="border-l border-slate-100 p-1.5 text-center text-xs tabular-nums dark:border-slate-800/60">
                    {dayCostTotals.byDay.get(d.key)
                      ? formatEuro(dayCostTotals.byDay.get(d.key)!)
                      : ""}
                  </td>
                ))}
                {emptyRight.map((_, i) => (
                  <td
                    key={i}
                    className={`${i === 0 ? "border-l-2 border-slate-300 dark:border-slate-600" : "border-l border-slate-100 dark:border-slate-800/60"}`}
                  />
                ))}
              </tr>
            )}

            {users.length > 0 && (
              <tr className="border-t-2 border-slate-300 dark:border-slate-700">
                <th className="sticky left-0 z-10 bg-[var(--background,#fafafa)] p-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                  Gesamt
                </th>
                {days.map((d) => (
                  <td key={d.key} className="border-l border-slate-100 dark:border-slate-800/60" />
                ))}
                <td className="border-l-2 border-slate-300 p-2 text-center text-xs font-semibold tabular-nums whitespace-nowrap dark:border-slate-600">
                  {hm(summary.soll)}
                </td>
                <td className="border-l border-slate-200 p-2 text-center text-xs font-semibold tabular-nums whitespace-nowrap dark:border-slate-800/60">
                  {hm(summary.geplant)}
                </td>
                {showIstCol && (
                  <td className="border-l border-slate-200 p-2 text-center text-xs font-semibold tabular-nums whitespace-nowrap dark:border-slate-800/60">
                    {hm(summary.istMin)}
                  </td>
                )}
                {showKostenCol && (
                  <td className="border-l border-slate-200 p-2 text-center text-xs font-semibold tabular-nums whitespace-nowrap dark:border-slate-800/60">
                    {formatEuro(summary.kosten)}
                  </td>
                )}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showKostenCol && summary.kosten > 0 && (
        <p className="mt-2 text-sm font-semibold">
          Kosten Woche gesamt: {formatEuro(summary.kosten)}
        </p>
      )}

      {canEdit && sel && selUser && selDay && (
        <CellEditor
          key={`${sel.userId}|${sel.dayKey}`}
          userId={sel.userId}
          userName={selUser.name}
          dayKey={sel.dayKey}
          dayLabel={`${selDay.weekday} ${selDay.label}`}
          shifts={selShifts}
          absence={absenceByCell.get(`${sel.userId}|${sel.dayKey}`) ?? null}
          templates={templates}
          onClose={() => setSel(null)}
        />
      )}

      {users.length === 0 && (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Keine aktiven Mitarbeiter.
        </p>
      )}
    </div>
  );
}
