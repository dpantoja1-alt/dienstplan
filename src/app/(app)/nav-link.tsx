"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

export function NavLink({
  href,
  exact = false,
  children,
}: {
  href: Route;
  exact?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

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
