import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getMonthReport, reportToCsv, teamCsv } from "@/lib/report";

function parseMonth(m: string | null): { year: number; month1: number } | null {
  if (!m || !/^\d{4}-\d{2}$/.test(m)) return null;
  const year = Number(m.slice(0, 4));
  const month1 = Number(m.slice(5, 7));
  if (month1 < 1 || month1 > 12) return null;
  return { year, month1 };
}

function csvResponse(csv: string, filename: string): NextResponse {
  // BOM, damit Excel UTF-8 korrekt erkennt
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const url = new URL(request.url);
  const month = parseMonth(url.searchParams.get("m"));
  if (!month) {
    return NextResponse.json({ error: "Monat fehlt (m=yyyy-MM)" }, { status: 400 });
  }
  const isAdmin = user.role === "ADMIN";

  if (url.searchParams.get("team")) {
    if (!isAdmin) {
      return NextResponse.json({ error: "Nur für Admins" }, { status: 403 });
    }
    const csv = await teamCsv(month.year, month.month1);
    return csvResponse(
      csv,
      `Monatsuebersicht_${month.year}-${String(month.month1).padStart(2, "0")}.csv`,
    );
  }

  const targetId = url.searchParams.get("u") ?? user.id;
  if (targetId !== user.id && !isAdmin) {
    return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
  }

  const report = await getMonthReport(targetId, month.year, month.month1);
  const slug = report.user.name.replace(/[^a-zA-Z0-9]+/g, "_");
  return csvResponse(
    reportToCsv(report),
    `Stundennachweis_${slug}_${month.year}-${String(month.month1).padStart(2, "0")}.csv`,
  );
}
