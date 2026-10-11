import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cravings } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { addCraving } from "@/actions/care";
import { fail, handleError, ok } from "@/lib/api";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return fail(401, "Please sign in to continue.");
    const rows = await db.select().from(cravings).where(eq(cravings.userId, user.id)).orderBy(desc(cravings.createdAt));
    return ok({ cravings: rows });
  } catch (e) { return handleError(e); }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await addCraving(body);
    if ("error" in result) return fail(400, result.error);
    return ok(result.craving, 201);
  } catch (e) { return handleError(e); }
}
