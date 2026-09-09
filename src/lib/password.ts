import bcrypt from "bcryptjs";
import { z } from "zod";

/** Mindestanforderung an ein Passwort. */
export const passwordSchema = z
  .string()
  .min(8, "Mindestens 8 Zeichen")
  .max(200, "Höchstens 200 Zeichen");

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
