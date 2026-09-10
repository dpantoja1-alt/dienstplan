import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { format } from "date-fns";

import { getCurrentUser } from "@/lib/auth-helpers";
import { getMonthReport } from "@/lib/report";
import { formatMinutes } from "@/lib/worktime";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Stundennachweis" };

function decimal(min: number): string {
  return (min / 60).toFixed(2).replace(".", ",");
}

function absenceLabel(a: { type: string; halfDay: boolean } | null): string {
  if (!a) return "";
  if (a.type === "VACATION") return a.halfDay ? "Urlaub ½" : "Urlaub";
  if (a.type === "SICK") return "Krank";
  return "Sonstiges";
}

export default async function StundennachweisPage({
  searchParams,
}: PageProps<"/stundennachweis">) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const sp = await searchParams;
  const m = typeof sp.m === "string" && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : format(new Date(), "yyyy-MM");
  const year = Number(m.slice(0, 4));
  const month1 = Number(m.slice(5, 7));

  const targetId = typeof sp.u === "string" ? sp.u : me.id;
  if (targetId !== me.id && me.role !== "ADMIN") redirect("/stundenkonto");

  const report = await getMonthReport(targetId, year, month1);
  const t = report.totals;

  return (
    <div className="text-sm">
      <div className="mb-4 flex items-start justify-between print:hidden">
        <a href="/stundenkonto" className="text-slate-500 hover:underline">← Stundenkonto</a>
        <PrintButton />
      </div>

      <h1 className="text-lg font-bold">Stundennachweis</h1>
      <div className="mt-1 flex flex-wrap gap-x-8 gap-y-1 text-slate-600">
        <span><strong className="text-slate-900">{report.user.name}</strong></span>
        <span>{report.monthLabel}</span>
        <span>{report.user.weeklyHours} Std./Woche · {report.user.workDaysPerWeek} Tage</span>
      </div>

      <table className="mt-4 w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-slate-300 text-left">
            <th className="py-1 pr-2">Datum</th>
            <th className="py-1 pr-2">Geplant</th>
            <th className="py-1 pr-2">Gearbeitet</th>
            <th className="py-1 pr-2 text-right">Pause</th>
            <th className="py-1 pr-2 text-right">Netto</th>
            <th className="py-1 pr-2 text-right">Soll</th>
            <th className="py-1">Hinweis</th>
          </tr>
        </thead>
        <tbody>
          {report.days.map((d) => {
            const pause = d.worked.reduce((s, w) => s + w.breakMinutes, 0);
            const note = d.holiday ?? absenceLabel(d.absence);
            const weekend = !d.isWorkday && !d.holiday;
            return (
              <tr
                key={d.key}
                className={`border-b border-slate-100 ${weekend ? "text-slate-400" : ""}`}
              >
                <td className="py-1 pr-2 whitespace-nowrap">
                  {d.weekday} {format(new Date(`${d.key}T00:00:00.000Z`), "dd.MM.")}
                </td>
                <td className="py-1 pr-2">{d.planned.join(", ")}</td>
                <td className="py-1 pr-2">
                  {d.worked.map((w) => `${w.from}–${w.to}`).join(", ")}
                </td>
                <td className="py-1 pr-2 text-right tabular-nums">{pause || ""}</td>
                <td className="py-1 pr-2 text-right tabular-nums">
                  {d.workedMinutes ? formatMinutes(d.workedMinutes) : ""}
                </td>
                <td className="py-1 pr-2 text-right tabular-nums">
                  {d.sollMinutes ? formatMinutes(d.sollMinutes) : ""}
                </td>
                <td className="py-1">{note}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <table className="mt-4 w-64">
        <tbody>
          <Row label="Arbeitstage" value={String(t.workdays)} />
          <Row label="Soll gesamt" value={`${formatMinutes(t.sollMinutes)} (${decimal(t.sollMinutes)})`} />
          <Row label="Ist gearbeitet" value={`${formatMinutes(t.workedMinutes)} (${decimal(t.workedMinutes)})`} />
          <Row
            label={`Urlaub/Krank (${t.absenceDays} Tage)`}
            value={`${formatMinutes(t.creditedMinutes)} (${decimal(t.creditedMinutes)})`}
          />
          <Row label="Saldo Monat" value={formatMinutes(t.balanceMinutes)} strong />
          {t.adjustmentMinutes !== 0 && (
            <Row
              label="Überstunden ausgezahlt / Korrektur"
              value={formatMinutes(t.adjustmentMinutes)}
            />
          )}
          <Row label="Saldo gesamt" value={formatMinutes(t.cumulativeMinutes)} strong />
        </tbody>
      </table>

      {t.pendingEntries > 0 && (
        <p className="mt-3 text-xs text-amber-700 print:text-slate-500">
          Hinweis: {t.pendingEntries} noch nicht bestätigte Zeiteintrag(e) in diesem
          Monat sind hier nicht enthalten.
        </p>
      )}

      <div className="mt-10 flex justify-between text-xs text-slate-500">
        <div>
          <div className="mb-6 border-b border-slate-400 pb-6" />
          Datum, Unterschrift Mitarbeiter
        </div>
        <div>
          <div className="mb-6 border-b border-slate-400 pb-6" />
          Datum, Unterschrift Leitung
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <tr className={strong ? "font-semibold" : ""}>
      <td className="py-0.5 pr-4">{label}</td>
      <td className="py-0.5 text-right tabular-nums">{value}</td>
    </tr>
  );
}
