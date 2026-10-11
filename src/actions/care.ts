"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { cravings } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { actionFail, actionOk } from "@/lib/api";
import { cravingsSchema } from "@/lib/validate";
import { notifyPartnerOfSharedCraving } from "@/lib/notify";

export async function addCraving(input: unknown) {
  try {
    const user = await requireUser();
    const data = cravingsSchema.parse(input);
    const rows = await db.insert(cravings).values({ userId: user.id, ...data }).returning();
    // The partner hears ONLY about entries explicitly marked shareable.
    if (data.shareWithPartner) await notifyPartnerOfSharedCraving(user.id, data.item);
    revalidatePath("/cravings");
    return { craving: rows[0] };
  } catch (e) { return actionFail(e); }
}

export async function deleteCraving(id: string) {
  try {
    const user = await requireUser();
    const rows = await db.delete(cravings).where(and(eq(cravings.id, id), eq(cravings.userId, user.id))).returning({ id: cravings.id });
    if (!rows.length) return { error: "Craving not found." };
    revalidatePath("/cravings");
    return { deleted: true };
  } catch (e) { return actionFail(e); }
}
