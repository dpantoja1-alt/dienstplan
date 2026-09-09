import { headers } from "next/headers";

/**
 * Ermittelt die öffentliche Basis-URL der App (z. B. https://dienstplan-beryl.vercel.app)
 * – bevorzugt aus den Request-Headern, sonst aus Umgebungsvariablen.
 */
export async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  }

  if (process.env.AUTH_URL) return process.env.AUTH_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}
