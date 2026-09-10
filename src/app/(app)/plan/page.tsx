import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";

import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { weekInfo, dateFromKey, dateKey, formatShiftRange, shiftDurationMinutes } from "@/lib/shift";
import { nrwHolidayName } from "@/lib/holidays";
import { isWorkday } from "@/lib/soll";
import { absenceTypeColor, absenceTypeLabel } from "@/lib/absence-view";
import { dayKey as tzDayKey } from "@/lib/time-zone";
import { toViewEntry } from "@/lib/time-entry-view";
import { hourlyRate, dayCost } from "@/lib/cost";
import { PlanGrid } from "./plan-grid";
import { WeekToolbar } from "./week-toolbar";
import type { GridAbsence, GridIst, GridShift, GridTemplate } from "./types";

export const metadata: Metadata = { title: "Plan – Eifel Wagyu" };

export default async function PlanPage({ searchParams }: PageProps<"/plan">) {
  const session = await requireUser();
  const isAdmin = session.user.role === "ADMIN";
  const sp = await searchParams;
  const week = weekInfo(typeof sp.w === "string" ? sp.w : undefined);

  const monday = dateFromKey(week.key);
  const sunday = dateFromKey(week.days[6].key);

  const [users, shiftRows, templates, absenceRows, dayNoteRows, timeRows] = await Promise.all([
    prisma.user.findMany({
      where: { active: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        role: true,
        weeklyHours: true,
        minBreakMinutes: true,
        monthlySalary: true,
      },
    }),
    prisma.shift.findMany({
      where: { date: { gte: monday, lte: sunday } },
      orderBy: { startMinutes: "asc" },
    }),
    prisma.shiftTemplate.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.absence.findMany({
      where: {
        status: "APPROVED",
        startDate: { lte: sunday },
        endDate: { gte: monday },
      },
      select: { id: true, userId: true, type: true, startDate: true, endDate: true, halfDay: true },
    }),
    prisma.dayNote.findMany({ where: { date: { gte: monday, lte: sunday } } }),
    isAdmin
      ? prisma.timeEntry.findMany({
          where: {
            status: "CONFIRMED",
            end: { not: null },
            start: {
              gte: new Date(monday.getTime() - 2 * 86400000),
              lte: new Date(sunday.getTime() + 2 * 86400000),
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const dayKeys = new Set(week.days.map((d) => d.key));
  const rateByUser = new Map(
    users.map((u) => [u.id, hourlyRate(u.monthlySalary, u.weeklyHours)]),
  );
  const minBreakByUser = new Map(users.map((u) => [u.id, u.minBreakMinutes]));

  // Ist-Minuten je Mitarbeiter+Tag (nur Admin)
  const istMap = new Map<string, number>();
  for (const e of timeRows) {
    const k = tzDayKey(e.start);
    if (!dayKeys.has(k)) continue;
    const v = toViewEntry(e, minBreakByUser.get(e.userId) ?? 0);
    istMap.set(`${e.userId}|${k}`, (istMap.get(`${e.userId}|${k}`) ?? 0) + (v.netMinutes ?? 0));
  }
  const gridIst: GridIst[] = [...istMap.entries()].map(([key, netMinutes]) => {
    const [userId, dayKey] = key.split("|");
    const cost = dayCost(netMinutes, rateByUser.get(userId) ?? null);
    return { userId, dayKey, netMinutes, cost };
  });

  const dayNotes = dayNoteRows.map((n) => ({
    dayKey: n.date.toISOString().slice(0, 10),
    text: n.text,
  }));

  const gridAbsences: GridAbsence[] = [];
  for (const a of absenceRows) {
    const from = dateKey(a.startDate);
    const to = dateKey(a.endDate);
    const single = from === to;
    for (const d of week.days) {
      if (d.key < from || d.key > to || !isWorkday(d.key)) continue;
      gridAbsences.push({
        id: a.id,
        userId: a.userId,
        dayKey: d.key,
        type: a.type,
        label: `${absenceTypeLabel(a.type)}${a.halfDay && single ? " ½" : ""}`,
        color: absenceTypeColor(a.type),
        multiDay: !single,
      });
    }
  }

  const gridShifts: GridShift[] = shiftRows.map((s) => ({
    id: s.id,
    userId: s.userId,
    dateKey: s.date.toISOString().slice(0, 10),
    label: s.label,
    color: s.color,
    startMinutes: s.startMinutes,
    endMinutes: s.endMinutes,
    breakMinutes: s.breakMinutes,
    durationMinutes: shiftDurationMinutes(s.startMinutes, s.endMinutes, s.breakMinutes),
    note: s.note,
    fromTemplate: s.templateId !== null,
  }));

  const gridTemplates: GridTemplate[] = templates.map((t) => ({
    id: t.id,
    name: t.name,
    shortLabel: t.shortLabel,
    color: t.color,
    range: formatShiftRange(t.startMinutes, t.endMinutes),
    startMinutes: t.startMinutes,
    endMinutes: t.endMinutes,
    breakMinutes: t.breakMinutes,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Plan</h1>
        {isAdmin && (
          <Link href="/schichtvorlagen" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
            Vorlagen verwalten →
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={`/plan?w=${week.prev}` as Route} className="rounded-md border border-slate-300 px-2 py-1 text-sm transition hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800">
            ←
          </Link>
          <span className="min-w-44 text-center text-sm font-medium">{week.label}</span>
          <Link href={`/plan?w=${week.next}` as Route} className="rounded-md border border-slate-300 px-2 py-1 text-sm transition hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800">
            →
          </Link>
          {week.key !== week.current && (
            <Link href="/plan" className="ml-1 text-sm text-slate-500 hover:underline dark:text-slate-400">
              heute
            </Link>
          )}
        </div>
        {isAdmin && <WeekToolbar mondayKey={week.key} />}
      </div>

      <PlanGrid
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          isSelf: u.id === session.user.id,
          isAdmin: u.role === "ADMIN",
        }))}
        days={week.days.map((d) => ({
          key: d.key,
          label: d.label,
          weekday: d.weekday,
          isToday: d.isToday,
          holiday: nrwHolidayName(d.key),
        }))}
        shifts={gridShifts}
        absences={gridAbsences}
        ist={gridIst}
        dayNotes={dayNotes}
        templates={gridTemplates}
        canEdit={isAdmin}
        showCostControls={isAdmin && users.some((u) => u.monthlySalary != null)}
      />

      {!isAdmin && (
        <p className="text-xs text-slate-400">
          Änderungen am Plan macht die Leitung. Bei Fragen wende dich an sie.
        </p>
      )}
    </div>
  );
}
