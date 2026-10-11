import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { journalEntries } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { upsertJournal } from "@/actions/tracking";
import { fail, handleError, ok } from "@/lib/api";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return fail(401, "Please sign in to continue.");
    const rows = await db.select().from(journalEntries).where(eq(journalEntries.userId, user.id)).orderBy(desc(journalEntries.recordedOn)).limit(90);
    return ok({ entries: rows });
  } catch (e) { return handleError(e); }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await upsertJournal(body);
    if ("error" in result) return fail(400, result.error);
    return ok(result.entry, 201);
  } catch (e) { return handleError(e); }
}
