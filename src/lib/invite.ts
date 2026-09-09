import { createHash, randomBytes } from "node:crypto";

/** Gültigkeitsdauer einer Einladung in Tagen. */
export const INVITE_TTL_DAYS = 7;

/**
 * Erzeugt ein Einladungs-Token. Das Klartext-Token kommt in den Link,
 * in der Datenbank wird nur der SHA-256-Hash gespeichert.
 */
export function createInviteToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashInviteToken(token) };
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function inviteExpiryDate(from: Date = new Date()): Date {
  return new Date(from.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function inviteUrl(token: string, baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/invite/${token}`;
}
