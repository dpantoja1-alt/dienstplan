"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

function matches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Aktiv-Logik: exakt, per Präfix, zusätzliche Präfixe (`also`) und Ausnahmen (`except`). */
export function isNavActive(
  pathname: string,
  href: string,
  { exact = false, also = [], except = [] }: { exact?: boolean; also?: string[]; except?: string[] } = {},
) {
  if (except.some((p) => matches(pathname, p))) return false;
  if (exact ? pathname === href : matches(pathname, href)) return true;
  return also.some((p) => matches(pathname, p));
}

export function NavLink({
  href,
  exact = false,
  also,
  except,
  children,
}: {
  href: Route;
  exact?: boolean;
  also?: string[];
  except?: string[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = isNavActive(pathname, href, { exact, also, except });

  return (
    <Link
      href={href}
      className={
        "rounded-md px-2 py-1 transition " +
        (active
          ? "bg-brand font-medium text-brand-ink"
          : "text-muted hover:bg-brand/10 hover:text-foreground")
      }
    >
      {children}
    </Link>
  );
}

/** Admin-Menü (⚙) mit selten genutzten Seiten. Auf dem Handy als normale Links. */
export function SettingsMenu({ items }: { items: { href: Route; label: string }[] }) {
  const pathname = usePathname();
  const active = items.some((i) => matches(pathname, i.href));

  return (
    <>
      <details className="group relative hidden md:block">
        <summary
          aria-label="Verwaltung"
          title="Verwaltung"
          className={
            "flex cursor-pointer list-none items-center gap-1 rounded-md px-2 py-1 transition [&::-webkit-details-marker]:hidden " +
            (active
              ? "bg-brand font-medium text-brand-ink"
              : "text-muted hover:bg-brand/10 hover:text-foreground")
          }
        >
          <GearIcon className="h-4 w-4" />
          <span className="text-xs">▾</span>
        </summary>
        <div className="absolute right-0 top-full z-50 mt-1 flex min-w-40 flex-col gap-0.5 rounded-md border border-line bg-surface p-1 shadow-md">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              onClick={(e) => e.currentTarget.closest("details")?.removeAttribute("open")}
              className={
                "rounded px-2 py-1 transition " +
                (matches(pathname, i.href)
                  ? "bg-brand/10 font-medium"
                  : "text-muted hover:bg-brand/10 hover:text-foreground")
              }
            >
              {i.label}
            </Link>
          ))}
        </div>
      </details>
      <div className="flex flex-col gap-1 border-t border-line pt-1 md:hidden">
        {items.map((i) => (
          <NavLink key={i.href} href={i.href}>
            {i.label}
          </NavLink>
        ))}
      </div>
    </>
  );
}

/** Unterreiter innerhalb eines Bereichs (z. B. Zeiten | Stundenkonto). */
export function SubTabs({ tabs }: { tabs: { href: Route; label: React.ReactNode; exact?: boolean }[] }) {
  const pathname = usePathname();
  return (
    <nav className="-mb-1 flex flex-wrap gap-1 border-b border-line text-sm">
      {tabs.map((t) => {
        const active = t.exact ? pathname === t.href : matches(pathname, t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={
              "-mb-px border-b-2 px-3 py-1.5 transition " +
              (active
                ? "border-brand font-medium text-foreground"
                : "border-transparent text-muted hover:text-foreground")
            }
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}
