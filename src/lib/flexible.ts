import "server-only";
import { prisma } from "./prisma";
import { dayKey } from "./time-zone";
import { dateFromKey } from "./shift";

/**
 * Hat der Mitarbeiter am Tag, an dem die Zeiterfassung begonnen hat, einen
 * flexiblen Dienst (FX) im Plan? Dann gelten keine Höchstgrenze (11 Std.) und
 * keine Überzeit-Warnung – es wird die tatsächlich gestempelte Zeit erfasst.
 */
export async function hasFlexibleShift(userId: string, start: Date): Promise<boolean> {
  const shift = await prisma.shift.findFirst({
    where: { userId, date: dateFromKey(dayKey(start)), flexible: true },
    select: { id: true },
  });
  return shift !== null;
}
