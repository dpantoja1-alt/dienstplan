import type { Route } from "next";

type Tab = { href: Route; label: string; exact?: boolean };

export const ZEITEN_TABS: Tab[] = [
  { href: "/zeiten", label: "Zeiten", exact: true },
  { href: "/stundenkonto", label: "Stundenkonto" },
];

export const TEAM_TABS: Tab[] = [
  { href: "/zeiten/team", label: "Team-Zeiten" },
  { href: "/zeiten/pruefen", label: "Prüfen" },
  { href: "/abwesenheiten", label: "Abwesenheiten" },
];

/** Mitarbeiter-Sicht: eigene Abwesenheiten liegen unter „Urlaub“. */
export const URLAUB_TABS: Tab[] = [
  { href: "/urlaub", label: "Urlaub", exact: true },
  { href: "/abwesenheiten", label: "Abwesenheiten" },
];
