import "server-only";
import { prisma } from "./prisma";
import { workTimeAt, type WorkPeriod } from "./soll";
import { dayKey } from "./time-zone";

/** Beginn der Basis-Periode, die beim ersten Wechsel die alten Werte festhält. */
export const BASE_PERIOD_KEY = "2000-01-01";

/** Arbeitszeit-Verlauf je Mitarbeiter (leer = Stammdaten gelten durchgehend). */
export async function getWorkPeriods(userIds: string[]): Promise<Map<string, WorkPeriod[]>> {
  const out = new Map<string, WorkPeriod[]>();
  if (userIds.length === 0) return out;
  const rows = await prisma.workSchedule.findMany({
    where: { userId: { in: userIds } },
    orderBy: { validFrom: "asc" },
  });
  for (const r of rows) {
    const arr = out.get(r.userId) ?? [];
    arr.push({
      fromKey: r.validFrom.toISOString().slice(0, 10),
      weeklyHours: r.weeklyHours,
      workDaysPerWeek: r.workDaysPerWeek,
    });
    out.set(r.userId, arr);
  }
  return out;
}

/** Schreibt die heute gültige Arbeitszeit in die Stammdaten des Mitarbeiters. */
export async function syncCurrentWorkTime(userId: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { weeklyHours: true, workDaysPerWeek: true },
  });
  const periods = (await getWorkPeriods([userId])).get(userId);
  if (!periods?.length) return;
  const now = workTimeAt(dayKey(new Date()), periods, user);
  if (now.weeklyHours !== user.weeklyHours || now.workDaysPerWeek !== user.workDaysPerWeek) {
    await prisma.user.update({
      where: { id: userId },
      data: { weeklyHours: now.weeklyHours, workDaysPerWeek: now.workDaysPerWeek },
    });
  }
}
