import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { periods } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { createPeriod } from "@/actions/tracking";
import { fail, handleError, ok } from "@/lib/api";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return fail(401, "Please sign in to continue.");
    const rows = await db.select().from(periods).where(eq(periods.userId, user.id)).orderBy(desc(periods.startDate));
    return ok({ periods: rows });
  } catch (e) { return handleError(e); }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await createPeriod(body);
    if ("error" in result) return fail(400, result.error);
    return ok(result.period, 201);
  } catch (e) { return handleError(e); }
}
