import Link from "next/link";
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
        className="rounded-md border border-slate-300 px-2 py-1 text-sm transition hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
      >
        ←
      </Link>
      <span className="min-w-40 text-center text-sm font-medium">{label}</span>
      <Link
        href={`${basePath}?m=${next}` as Route}
        className="rounded-md border border-slate-300 px-2 py-1 text-sm transition hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
      >
        →
      </Link>
    </div>
  );
}
