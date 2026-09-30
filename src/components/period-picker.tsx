"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import {
  addDays,
  addWeeks,
  format,
  getISOWeek,
  getISOWeeksInYear,
  startOfISOWeek,
} from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon, navArrow } from "./icons";

const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const MONTHS_LONG = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d ?? 1);
}

function isoWeekYear(monday: Date): number {
  // Das ISO-Wochenjahr ist das Jahr des Donnerstags der Woche
  return addDays(monday, 3).getFullYear();
}

/** Montage aller ISO-Kalenderwochen eines Jahres. */
function weeksOfYear(year: number): Date[] {
  const first = startOfISOWeek(new Date(year, 0, 4));
  return Array.from({ length: getISOWeeksInYear(first) }, (_, i) => addWeeks(first, i));
}

/** Erste Woche, deren Donnerstag im Monat liegt (wie ISO: KW 1 enthält den 4. Januar). */
function firstWeekOfMonth(year: number, month0: number): Date {
  return startOfISOWeek(new Date(year, month0, 4));
}

type Props = {
  mode: "week" | "month";
  /** "yyyy-MM-dd" (Montag) bzw. "yyyy-MM" */
  value: string;
  /** "yyyy-MM-dd" (Montag der aktuellen Woche) bzw. "yyyy-MM" */
  current: string;
  basePath: string;
  /** Name des URL-Parameters, z. B. "w" oder "m" */
  param: string;
  /** weitere Parameter, die erhalten bleiben (z. B. Mitarbeiter-Auswahl) */
  extraQuery?: string;
};

/**
 * Vor/Zurück-Pfeile plus aufklappbare Auswahl: ein Klick auf das Datum öffnet
 * Jahr, Monate und (im Wochenmodus) alle Kalenderwochen zum direkten Springen.
 */
export function PeriodPicker({ mode, value, current, basePath, param, extraQuery }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const valueDate = parseKey(value);
  const valueYear = mode === "week" ? isoWeekYear(valueDate) : valueDate.getFullYear();
  const [year, setYear] = useState(valueYear);

  const href = (key: string) =>
    `${basePath}?${param}=${key}${extraQuery ? `&${extraQuery}` : ""}` as Route;
  const go = (key: string) => {
    setOpen(false);
    router.push(href(key));
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Pfeile und Beschriftung
  let prev: string;
  let next: string;
  let label: string;
  let sub: string | null = null;
  if (mode === "week") {
    prev = format(addDays(valueDate, -7), "yyyy-MM-dd");
    next = format(addDays(valueDate, 7), "yyyy-MM-dd");
    label = `${format(valueDate, "dd.MM.")} – ${format(addDays(valueDate, 6), "dd.MM.yyyy")}`;
    sub = `KW ${getISOWeek(valueDate)}`;
  } else {
    const y = valueDate.getFullYear();
    const m = valueDate.getMonth();
    prev = format(new Date(y, m - 1, 1), "yyyy-MM");
    next = format(new Date(y, m + 1, 1), "yyyy-MM");
    label = `${MONTHS_LONG[m]} ${y}`;
  }

  const currentDate = parseKey(current);
  const isCurrent = value === current;
  const selectedMonth = mode === "month" ? valueDate.getMonth() : addDays(valueDate, 3).getMonth();

  return (
    <div ref={ref} className="relative flex items-center gap-2">
      <Link href={href(prev)} className={navArrow} aria-label={mode === "week" ? "Vorherige Woche" : "Vorheriger Monat"}>
        <ChevronLeftIcon />
      </Link>

      <button
        type="button"
        onClick={() => {
          setYear(valueYear);
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        title={mode === "week" ? "Woche auswählen" : "Monat auswählen"}
        className="flex min-w-44 items-center justify-center gap-2 rounded-md border border-line px-3 py-1 text-sm font-medium transition hover:border-brand"
      >
        {sub && <span className="rounded bg-accent/15 px-1.5 text-xs font-semibold text-muted">{sub}</span>}
        <span className="tabular-nums">{label}</span>
        <span className="text-xs text-muted">▾</span>
      </button>

      <Link href={href(next)} className={navArrow} aria-label={mode === "week" ? "Nächste Woche" : "Nächster Monat"}>
        <ChevronRightIcon />
      </Link>

      {!isCurrent && (
        <Link
          href={href(current)}
          className="ml-1 rounded-md bg-brand px-2.5 py-1 text-sm font-medium text-brand-ink transition hover:bg-brand-strong"
        >
          {mode === "week" ? "Heute" : "Aktueller Monat"}
        </Link>
      )}

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[min(92vw,22rem)] rounded-lg border border-line bg-surface p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => setYear((y) => y - 1)} className={navArrow} aria-label="Vorheriges Jahr">
              <ChevronLeftIcon />
            </button>
            <span className="font-semibold tabular-nums">{year}</span>
            <button type="button" onClick={() => setYear((y) => y + 1)} className={navArrow} aria-label="Nächstes Jahr">
              <ChevronRightIcon />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1">
            {MONTHS.map((name, m) => {
              const selected = year === valueYear && m === selectedMonth;
              const today = year === currentDate.getFullYear() && m === (mode === "week" ? addDays(currentDate, 3).getMonth() : currentDate.getMonth());
              const key = mode === "week" ? format(firstWeekOfMonth(year, m), "yyyy-MM-dd") : format(new Date(year, m, 1), "yyyy-MM");
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => go(key)}
                  className={
                    "rounded-md px-2 py-1.5 text-sm transition " +
                    (selected
                      ? "bg-brand font-medium text-brand-ink"
                      : today
                        ? "border border-accent text-foreground hover:bg-brand/10"
                        : "text-muted hover:bg-brand/10 hover:text-foreground")
                  }
                >
                  {name}
                </button>
              );
            })}
          </div>

          {mode === "week" && (
            <>
              <div className="mb-1 mt-3 text-xs font-medium uppercase tracking-wide text-muted">Kalenderwoche</div>
              <div className="grid grid-cols-9 gap-1">
                {weeksOfYear(year).map((monday) => {
                  const key = format(monday, "yyyy-MM-dd");
                  const kw = getISOWeek(monday);
                  const selected = key === value;
                  const today = key === current;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => go(key)}
                      title={`KW ${kw}: ${format(monday, "dd.MM.")} – ${format(addDays(monday, 6), "dd.MM.yyyy")}`}
                      className={
                        "rounded px-0 py-1 text-xs tabular-nums transition " +
                        (selected
                          ? "bg-brand font-semibold text-brand-ink"
                          : today
                            ? "border border-accent hover:bg-brand/10"
                            : "text-muted hover:bg-brand/10 hover:text-foreground")
                      }
                    >
                      {kw}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
