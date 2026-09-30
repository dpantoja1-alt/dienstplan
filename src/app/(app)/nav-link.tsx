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
                ? "border-accent font-medium text-foreground"
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
