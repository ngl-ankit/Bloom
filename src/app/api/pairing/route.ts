import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { pairings } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { fail, handleError, ok } from "@/lib/api";

/** Current user's live pairing (pending or active), whichever side they are on. */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return fail(401, "Please sign in to continue.");
    const rows = await db
      .select()
      .from(pairings)
      .where(
        and(
          or(eq(pairings.ownerId, user.id), eq(pairings.partnerId, user.id)),
          or(eq(pairings.status, "pending"), eq(pairings.status, "active")),
        ),
      )
      .orderBy(desc(pairings.createdAt))
      .limit(1);
    return ok({ pairing: rows[0] ?? null });
  } catch (e) { return handleError(e); }
}
