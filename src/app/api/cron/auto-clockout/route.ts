import { NextResponse } from "next/server";
import { autoCloseOverrunEntries } from "@/lib/auto-clockout";

/**
 * Von Vercel Cron aufgerufen (siehe vercel.json), damit die gesetzliche
 * Höchstarbeitszeit auch dann durchgesetzt wird, wenn sich über einen
 * längeren Zeitraum (z. B. ein Wochenende) niemand einloggt – sonst greift
 * die Prüfung erst wieder beim nächsten Login (siehe auth-helpers.ts).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const closed = await autoCloseOverrunEntries();
  return NextResponse.json({ closed });
}
