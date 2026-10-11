import { eq } from "drizzle-orm";
import { db } from "@/db";
import { comfortProfile } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { saveComfortProfile } from "@/actions/profile";
import { fail, handleError, ok } from "@/lib/api";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return fail(401, "Please sign in to continue.");
    const rows = await db.select().from(comfortProfile).where(eq(comfortProfile.userId, user.id)).limit(1);
    return ok({ profile: rows[0] ?? null });
  } catch (e) { return handleError(e); }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await saveComfortProfile(body);
    if ("error" in result) return fail(400, result.error);
    return ok(result, 201);
  } catch (e) { return handleError(e); }
}
