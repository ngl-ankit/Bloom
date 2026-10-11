import { eq } from "drizzle-orm";
import { db } from "@/db";
import { checklistItems } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { fail, handleError, ok } from "@/lib/api";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail(401, "Please sign in to continue.");
    const body = (await req.json()) as { label?: unknown; kind?: unknown };
    const label = typeof body.label === "string" ? body.label.trim().slice(0, 120) : "";
    const kind = body.kind === "emergency" ? "emergency" : "prep";
    if (!label) return fail(400, "Give the item a name.");
    const rows = await db.insert(checklistItems).values({ userId: user.id, label, kind }).returning();
    revalidatePath("/checklist");
    return ok({ item: rows[0] }, 201);
  } catch (e) { return handleError(e); }
}
