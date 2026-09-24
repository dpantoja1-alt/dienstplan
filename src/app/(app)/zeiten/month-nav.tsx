import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, navArrow } from "@/components/icons";
import type { Route } from "next";

export function MonthNav({
  basePath,
  label,
  prev,
  next,
}: {
  basePath: "/zeiten" | `/mitarbeiter/${string}/zeiten`;
  label: string;
  prev: string;
  next: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Link
        href={`${basePath}?m=${prev}` as Route}
        className={navArrow}
        aria-label="Vorheriger Monat"
      >
        <ChevronLeftIcon />
      </Link>
      <span className="min-w-40 text-center text-sm font-medium">{label}</span>
      <Link
        href={`${basePath}?m=${next}` as Route}
        className={navArrow}
        aria-label="Nächster Monat"
      >
        <ChevronRightIcon />
      </Link>
    </div>
  );
}
