"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { isNavActive } from "./nav-link";
import {
  HomeIcon,
  CalendarIcon,
  ClockIcon,
  SunUmbrellaIcon,
  TeamIcon,
  IdCardIcon,
  TemplateIcon,
  BookIcon,
  MoreIcon,
  UserIcon,
} from "./nav-icons";
import { ThemeToggle } from "@/components/theme-toggle";

type IconKey = "home" | "plan" | "zeiten" | "urlaub" | "team" | "mitarbeiter" | "vorlagen" | "handbuch" | "konto";

export type NavItem = {
  href: Route;
  label: string;
  short?: string; // Beschriftung in der Handy-Leiste
  icon: IconKey;
  exact?: boolean;
  also?: string[];
  except?: string[];
  badge?: { text: string; tone: "amber" | "red" } | null;
};

const ICONS: Record<IconKey, (p: { className?: string }) => React.ReactNode> = {
  home: HomeIcon,
  plan: CalendarIcon,
  zeiten: ClockIcon,
  urlaub: SunUmbrellaIcon,
  team: TeamIcon,
  mitarbeiter: IdCardIcon,
  vorlagen: TemplateIcon,
  handbuch: BookIcon,
  konto: UserIcon,
};

function Badge({ badge }: { badge: NavItem["badge"] }) {
  if (!badge) return null;
  return (
    <span
      className={`rounded-full px-1.5 text-[11px] font-semibold leading-[18px] text-white ${
        badge.tone === "red" ? "bg-red-600" : "bg-amber-500"
      }`}
    >
      {badge.text}
    </span>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Seitenleiste ab Tablet-Breite: Hauptpunkte, Gruppe „Leitung“, unten Darstellung und Konto. */
export function SideNav({
  main,
  admin,
  footer,
  logo,
  userName,
  roleLabel,
  logout,
}: {
  main: NavItem[];
  admin: NavItem[];
  footer: NavItem[];
  logo: React.ReactNode;
  userName: string;
  roleLabel: string;
  logout: React.ReactNode;
}) {
  const pathname = usePathname();

  const item = (i: NavItem) => {
    const Icon = ICONS[i.icon];
    const on = isNavActive(pathname, i.href, i);
    return (
      <Link
        key={i.href}
        href={i.href}
        aria-current={on ? "page" : undefined}
        className={
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition " +
          (on ? "bg-side-active text-side-active-text" : "text-side-text hover:bg-side-active/50")
        }
      >
        <Icon className="h-[18px] w-[18px] flex-none" />
        <span className="flex-1">{i.label}</span>
        <Badge badge={i.badge} />
      </Link>
    );
  };

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 flex-none flex-col gap-6 overflow-y-auto border-r border-side-line bg-side px-3 py-5 md:flex">
      <div className="px-3">{logo}</div>
      <nav className="flex flex-col gap-0.5" aria-label="Hauptmenü">
        {main.map(item)}
        {admin.length > 0 && (
          <>
            <div className="px-3 pb-1.5 pt-5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-side-muted">
              Leitung
            </div>
            {admin.map(item)}
          </>
        )}
      </nav>
      <div className="mt-auto flex flex-col gap-3">
        <nav className="flex flex-col gap-0.5">{footer.map(item)}</nav>
        <ThemeToggle />
        <div className="flex items-center gap-2 border-t border-side-line px-1 pt-3">
          <Link
            href="/konto"
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg p-1 transition hover:bg-side-active/50"
            title="Konto"
          >
            <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-accent text-xs font-semibold text-accent-ink">
              {initials(userName)}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-medium text-side-text">{userName}</span>
              <span className="block text-xs text-side-muted">{roleLabel}</span>
            </span>
          </Link>
          {logout}
        </div>
      </div>
    </aside>
  );
}

/** Handy: feste Leiste unten mit Symbolen, „Mehr“ öffnet die übrigen Punkte. */
export function BottomNav({ items, more }: { items: NavItem[]; more: NavItem[] }) {
  const pathname = usePathname();
  const [openAt, setOpenAt] = useState<string | null>(null);
  // schließt automatisch beim Seitenwechsel
  const open = openAt === pathname;
  const close = () => setOpenAt(null);
  const moreActive = more.some((i) => isNavActive(pathname, i.href, i));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenAt(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const cell = "relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium transition";

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={close}>
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-side-line bg-side p-3 pb-[calc(4.5rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="flex flex-col gap-0.5">
              {more.map((i) => {
                const Icon = ICONS[i.icon];
                const on = isNavActive(pathname, i.href, i);
                return (
                  <Link
                    key={i.href}
                    href={i.href}
                    className={
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium " +
                      (on ? "bg-side-active text-side-active-text" : "text-side-text")
                    }
                  >
                    <Icon className="h-5 w-5" />
                    {i.label}
                  </Link>
                );
              })}
            </nav>
            <ThemeToggle className="mt-3" />
          </div>
        </div>
      )}
      <nav
        aria-label="Hauptmenü"
        className="fixed inset-x-0 bottom-0 z-50 flex border-t border-side-line bg-side/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {items.map((i) => {
          const Icon = ICONS[i.icon];
          const on = isNavActive(pathname, i.href, i) && !open;
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={on ? "page" : undefined}
              className={`${cell} ${on ? "text-side-active-text" : "text-side-muted"}`}
            >
              <span className={`rounded-full px-3 py-0.5 ${on ? "bg-side-active" : ""}`}>
                <Icon className="h-5 w-5" />
              </span>
              {i.short ?? i.label}
              {i.badge && (
                <span className="absolute left-1/2 top-0.5 ml-2">
                  <Badge badge={i.badge} />
                </span>
              )}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpenAt(open ? null : pathname)}
          aria-expanded={open}
          className={`${cell} ${open || moreActive ? "text-side-active-text" : "text-side-muted"}`}
        >
          <span className={`rounded-full px-3 py-0.5 ${open || moreActive ? "bg-side-active" : ""}`}>
            <MoreIcon className="h-5 w-5" />
          </span>
          Mehr
        </button>
      </nav>
    </>
  );
}
