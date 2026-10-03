import Link from "next/link";
import type { VacationSummary } from "@/lib/account";

function fmt(key: string) {
  return `${key.slice(8, 10)}.${key.slice(5, 7)}.${key.slice(0, 4)}`;
}

const days = (n: number) => `${n.toLocaleString("de-DE")} ${n === 1 ? "Tag" : "Tage"}`;

/**
 * Hinweise an den Mitarbeiter zum Resturlaub (Mitwirkungsobliegenheit des
 * Arbeitgebers, BAG 19.02.2019 – 9 AZR 423/16): offener Übertrag mit Verfall
 * und ab Oktober noch nicht verplanter Urlaub des laufenden Jahres.
 */
export function VacationNotice({
  summary,
  year,
  todayKey,
  showLink = false,
}: {
  summary: VacationSummary;
  year: number;
  todayKey: string;
  showLink?: boolean;
}) {
  const notes: string[] = [];
  if (summary.carryOpen > 0 && summary.carryExpiresKey) {
    notes.push(
      `Du hast noch ${days(summary.carryOpen)} Resturlaub aus ${year - 1}. ` +
        `Er verfällt nach dem ${fmt(summary.carryExpiresKey)}, wenn du ihn bis dahin nicht nimmst.`,
    );
  }
  const unplanned = summary.remaining - summary.pending;
  const lateInYear = todayKey.startsWith(String(year)) && Number(todayKey.slice(5, 7)) >= 10;
  if (lateInYear && unplanned > 0) {
    notes.push(
      `Für ${year} sind noch ${days(unplanned)} Urlaub nicht verplant. ` +
        `Bitte beantrage ihn rechtzeitig – nicht genommener Urlaub kann sonst verfallen.`,
    );
  }
  if (summary.carryExpired > 0 && summary.carryExpiresKey) {
    notes.push(
      `${days(summary.carryExpired)} Resturlaub aus ${year - 1} sind nach dem ${fmt(summary.carryExpiresKey)} verfallen.`,
    );
  }
  if (notes.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-200">
      {notes.map((n) => (
        <p key={n}>{n}</p>
      ))}
      {showLink && (
        <Link href="/urlaub" className="mt-1 inline-block font-medium underline">
          Zum Urlaub
        </Link>
      )}
    </div>
  );
}
