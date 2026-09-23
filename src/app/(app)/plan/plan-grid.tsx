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

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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

const cellBase = "border-t border-line p-1.5 align-top";
const headCls = "text-[11px] font-semibold uppercase tracking-wider text-muted";
const pill = "inline-block rounded-full px-2 py-0.5 text-xs font-medium tabular-nums whitespace-nowrap";
const warnPill = "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
const toggleCls =
  "flex cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 shadow-sm has-[:checked]:border-brand has-[:checked]:bg-brand/10";

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

  const dayTint = (d: GridDay, strong: boolean) =>
    d.isToday
      ? strong
        ? "bg-brand/15"
        : "bg-brand/10"
      : d.holiday
        ? "bg-rose-50/70 dark:bg-rose-950/25"
        : "";

  return (
    <div>
      {canEdit && (
        <div className="flex flex-wrap gap-2 text-sm">
          <label className={toggleCls}>
            <input type="checkbox" checked={showIst} onChange={toggleIst} className="accent-[var(--brand-strong)]" />
            Ist-Zeiten
          </label>
          {showCostControls && (
            <label className={toggleCls}>
              <input type="checkbox" checked={showCost} onChange={toggleCost} className="accent-[var(--brand-strong)]" />
              Kosten
            </label>
          )}
        </div>
      )}

      <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-surface shadow-sm">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className={`sticky left-0 z-10 min-w-40 bg-surface p-3 text-left ${headCls}`}>Mitarbeiter</th>
              {days.map((d) => (
                <th key={d.key} className={`min-w-28 border-l border-line p-2 text-center font-medium ${dayTint(d, true)}`}>
                  <div className={headCls}>{d.weekday}</div>
                  <div
                    className={`mx-auto mt-0.5 inline-flex min-w-10 items-center justify-center rounded-full px-2 py-0.5 text-xs ${
                      d.isToday ? "bg-brand font-semibold text-brand-ink shadow-sm" : "text-foreground"
                    }`}
                  >
                    {d.label}
                  </div>
                  {d.holiday && (
                    <div className="mt-0.5 text-[10px] font-medium leading-tight text-rose-600 dark:text-rose-400">
                      {d.holiday}
                    </div>
                  )}
                </th>
              ))}
              <th className={`min-w-16 border-l-2 border-line p-2 text-center ${headCls}`}>Soll</th>
              <th className={`min-w-16 border-l border-line p-2 text-center ${headCls}`}>Geplant</th>
              {showIstCol && <th className={`min-w-16 border-l border-line p-2 text-center ${headCls}`}>Ist</th>}
              {showKostenCol && <th className={`min-w-16 border-l border-line p-2 text-center ${headCls}`}>Kosten</th>}
            </tr>
          </thead>
          <tbody>
            {showNoteRow && (
              <tr>
                <th className={`sticky left-0 z-10 bg-surface p-3 text-left text-xs font-medium text-muted ${cellBase}`}>
                  Info
                </th>
                {days.map((d) => (
                  <td key={d.key} className={`${cellBase} border-l ${dayTint(d, false)}`}>
                    <DayNoteCell dayKey={d.key} text={noteByDay.get(d.key) ?? ""} canEdit={canEdit} />
                  </td>
                ))}
                {emptyRight.map((_, i) => (
                  <td key={i} className={`${cellBase} ${i === 0 ? "border-l-2" : "border-l"}`} />
                ))}
              </tr>
            )}

            {users.map((u) => (
              <tr key={u.id}>
                <th className={`sticky left-0 z-10 bg-surface p-3 text-left align-top font-medium ${cellBase}`}>
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        u.isSelf
                          ? "bg-brand text-brand-ink"
                          : "bg-[#d8d2c3] text-[#3d3e37] dark:bg-slate-700 dark:text-slate-100"
                      }`}
                    >
                      {initials(u.name)}
                    </span>
                    <span className={`leading-tight ${u.isSelf ? "text-brand-strong" : ""}`}>{u.name}</span>
                  </div>
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
                      className={`group/cell ${cellBase} border-l ${dayTint(d, false)} ${
                        canEdit ? "cursor-pointer hover:bg-brand/10" : ""
                      } ${isSel ? "outline outline-2 -outline-offset-2 outline-[var(--brand-strong)]" : ""}`}
                    >
                      <div className="flex min-h-12 flex-col gap-1.5">
                        {absence && (
                          <div
                            className="rounded-lg border border-dashed px-2 py-1.5 text-xs font-semibold leading-tight"
                            style={{
                              borderColor: absence.color,
                              color: absence.color,
                              backgroundImage: `repeating-linear-gradient(135deg, color-mix(in srgb, ${absence.color} 14%, transparent) 0 6px, transparent 6px 12px)`,
                            }}
                          >
                            {absence.label}
                          </div>
                        )}
                        {cellShifts.map((s) => (
                          <div
                            key={s.id}
                            className="rounded-lg border border-l-4 px-2 py-1.5 text-xs leading-tight text-foreground shadow-sm"
                            style={{
                              backgroundColor: `color-mix(in srgb, ${s.color} 16%, var(--surface))`,
                              borderColor: `color-mix(in srgb, ${s.color} 45%, transparent)`,
                              borderLeftColor: s.color,
                            }}
                            title={`${s.label} ${formatShiftRange(s.startMinutes, s.endMinutes)}`}
                          >
                            <div className="font-semibold">{s.label}</div>
                            <div className="tabular-nums text-muted">{formatShiftRange(s.startMinutes, s.endMinutes)}</div>
                          </div>
                        ))}
                        {canEdit && cellShifts.length === 0 && !absence && (
                          <span className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-transparent text-base text-transparent transition group-hover/cell:border-brand group-hover/cell:text-brand-strong">
                            +
                          </span>
                        )}
                        {canEdit && showIst && cellIst && cellIst.netMinutes > 0 && (
                          <div className="text-[11px] text-muted">Ist {formatMinutes(cellIst.netMinutes)}</div>
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
                      <td className={`${cellBase} border-l-2 text-center align-middle`}>
                        <span className={`${pill} text-muted`}>{hm(soll)}</span>
                      </td>
                      <td className={`${cellBase} border-l text-center align-middle`}>
                        <span className={`${pill} ${geplant < soll ? warnPill : "bg-slate-100 text-foreground dark:bg-slate-800"}`}>
                          {hm(geplant)}
                        </span>
                      </td>
                      {showIstCol && (
                        <td className={`${cellBase} border-l text-center align-middle`}>
                          <span
                            className={`${pill} ${
                              istMin === 0
                                ? "text-slate-400"
                                : istMin + 1 < soll
                                  ? warnPill
                                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                            }`}
                          >
                            {istMin === 0 ? "–" : hm(istMin)}
                          </span>
                        </td>
                      )}
                      {showKostenCol && (
                        <td className={`${cellBase} border-l text-center align-middle text-xs tabular-nums whitespace-nowrap text-muted`}>
                          {kosten > 0 ? formatEuro(kosten) : ""}
                        </td>
                      )}
                    </>
                  );
                })()}
              </tr>
            ))}

            {canEdit && showCost && dayCostTotals.total > 0 && (
              <tr>
                <th className={`sticky left-0 z-10 bg-surface p-3 text-left text-xs font-medium text-muted ${cellBase}`}>
                  Kosten/Tag
                </th>
                {days.map((d) => (
                  <td key={d.key} className={`${cellBase} border-l text-center text-xs tabular-nums`}>
                    {dayCostTotals.byDay.get(d.key) ? formatEuro(dayCostTotals.byDay.get(d.key)!) : ""}
                  </td>
                ))}
                {emptyRight.map((_, i) => (
                  <td key={i} className={`${cellBase} ${i === 0 ? "border-l-2" : "border-l"}`} />
                ))}
              </tr>
            )}

            {users.length > 0 && (
              <tr className="bg-brand/10">
                <th className={`sticky left-0 z-10 border-t-2 border-line bg-[color-mix(in_srgb,var(--brand)_12%,var(--surface))] p-3 text-left ${headCls}`}>
                  Gesamt
                </th>
                {days.map((d) => (
                  <td key={d.key} className="border-l border-t-2 border-line" />
                ))}
                {[
                  { show: true, value: hm(summary.soll), first: true },
                  { show: true, value: hm(summary.geplant), first: false },
                  { show: showIstCol, value: hm(summary.istMin), first: false },
                  { show: showKostenCol, value: formatEuro(summary.kosten), first: false },
                ]
                  .filter((c) => c.show)
                  .map((c, i) => (
                    <td
                      key={i}
                      className={`${c.first ? "border-l-2" : "border-l"} border-t-2 border-line p-2 text-center text-xs font-semibold tabular-nums whitespace-nowrap`}
                    >
                      {c.value}
                    </td>
                  ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showKostenCol && summary.kosten > 0 && (
        <p className="mt-2 text-sm font-semibold">Kosten Woche gesamt: {formatEuro(summary.kosten)}</p>
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
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Keine aktiven Mitarbeiter.</p>
      )}
    </div>
  );
}
