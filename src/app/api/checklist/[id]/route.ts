import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { checklistItems } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { fail, handleError, ok } from "@/lib/api";
import { revalidatePath } from "next/cache";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail(401, "Please sign in to continue.");
    const { id } = await params;
    const body = (await req.json()) as { done?: unknown };
    const rows = await db
      .update(checklistItems)
      .set({ done: Boolean(body.done) })
      .where(and(eq(checklistItems.id, id), eq(checklistItems.userId, user.id)))
      .returning();
    if (!rows.length) return fail(404, "Checklist item not found.");
    revalidatePath("/checklist");
    return ok({ item: rows[0] });
  } catch (e) { return handleError(e); }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail(401, "Please sign in to continue.");
    const { id } = await params;
    const rows = await db
      .delete(checklistItems)
      .where(and(eq(checklistItems.id, id), eq(checklistItems.userId, user.id)))
      .returning({ id: checklistItems.id });
    if (!rows.length) return fail(404, "Checklist item not found.");
    revalidatePath("/checklist");
    return ok({ deleted: true });
  } catch (e) { return handleError(e); }
}
