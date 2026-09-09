"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

export function NavLink({
  href,
  children,
}: {
  href: Route;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={
        "rounded-md px-2 py-1 transition " +
        (active
          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
          : "hover:bg-slate-100 dark:hover:bg-slate-800")
      }
    >
      {children}
    </Link>
  );
}
