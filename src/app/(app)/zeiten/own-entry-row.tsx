import type { ViewEntry } from "@/lib/time-entry-view";
import { formatMinutes } from "@/lib/worktime";
import { PLAN_DEVIATION_THRESHOLD_MINUTES } from "@/lib/shift";

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{children}</span>;
}

function StatusBadge({ entry }: { entry: ViewEntry }) {
  if (entry.running) {
    return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">läuft</Badge>;
  }
  return entry.status === "CONFIRMED" ? (
    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">bestätigt</Badge>
  ) : (
    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">offen</Badge>
  );
}

/** Nur-Lese-Ansicht eines eigenen Zeiteintrags (Mitarbeiter ändern nichts selbst). */
export function OwnEntryRow({
  entry,
  plannedMinutes,
}: {
  entry: ViewEntry;
  /** Geplante Netto-Minuten für diesen Tag (Summe aller Schichten), falls eine Schicht existiert. */
  plannedMinutes?: number | null;
}) {
  const breakText =
    entry.effectiveBreak == null
      ? "–"
      : entry.breakOverride != null
        ? `${entry.effectiveBreak} Min (manuell)`
        : `${entry.effectiveBreak} Min`;

  const deviates =
    entry.netMinutes != null &&
    plannedMinutes != null &&
    Math.abs(entry.netMinutes - plannedMinutes) > PLAN_DEVIATION_THRESHOLD_MINUTES;

  return (
    <li className="px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium tabular-nums">
            {entry.startTime}{entry.endTime ? `–${entry.endTime}` : " …"}
          </span>
          {entry.netMinutes != null && (
            <span
              className={`tabular-nums ${deviates ? "font-semibold text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-300"}`}
            >
              {formatMinutes(entry.netMinutes)}
            </span>
          )}
          {deviates && (
            <span className="text-xs font-medium text-red-600 dark:text-red-400">
              ⚠ weicht &gt;1 h vom Plan ab
            </span>
          )}
          <span className="text-xs text-slate-400">Pause {breakText}</span>
          {entry.source === "CLOCK" && (
            <span className="text-xs text-slate-400">· Stempeluhr</span>
          )}
        </div>
        <StatusBadge entry={entry} />
      </div>

      {entry.note && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Notiz: {entry.note}</p>
      )}
      {entry.correctionNote && (
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
          Korrekturhinweis: {entry.correctionNote}
        </p>
      )}
    </li>
  );
}
