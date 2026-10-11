"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { journalEntries, periods } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { actionFail, actionOk } from "@/lib/api";
import { journalInputSchema, periodInputSchema } from "@/lib/validate";
import { formatDateOnly } from "@/lib/cycle";
import { ZodError } from "zod";

export async function createPeriod(input: unknown) {
  try {
    const user = await requireUser();
    const data = periodInputSchema.parse(input);
    const today = formatDateOnly(new Date());
    if (data.startDate > today) return { error: "Start date can't be in the future." };
    const existing = await db
      .select({ startDate: periods.startDate, endDate: periods.endDate })
      .from(periods)
      .where(eq(periods.userId, user.id));
    const clash = existing.find(
      (p) =>
        data.startDate === p.startDate ||
        (p.endDate !== null && data.startDate <= p.endDate && data.startDate >= p.startDate),
    );
    if (clash) return { error: "A period starting on or spanning that day already exists — edit that entry instead." };
    const rows = await db.insert(periods).values({ userId: user.id, ...data }).returning();
    revalidatePath("/calendar"); revalidatePath("/dashboard");
    return { period: rows[0] };
  } catch (e) { return actionFail(e); }
}

export async function updatePeriod(id: string, input: unknown) {
  try {
    const user = await requireUser();
    const data = periodInputSchema.parse(input);
    // Ownership check inside the WHERE clause — no cross-account writes.
    const rows = await db
      .update(periods)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(periods.id, id), eq(periods.userId, user.id)))
      .returning();
    if (!rows.length) return { error: "Period record not found." };
    revalidatePath("/calendar");
    return { period: rows[0] };
  } catch (e) { return actionFail(e); }
}

export async function deletePeriod(id: string) {
  try {
    const user = await requireUser();
    const rows = await db.delete(periods).where(and(eq(periods.id, id), eq(periods.userId, user.id))).returning({ id: periods.id });
    if (!rows.length) return { error: "Period record not found." };
    revalidatePath("/calendar");
    return { deleted: true };
  } catch (e) { return actionFail(e); }
}

export async function upsertJournal(input: unknown) {
  try {
    const user = await requireUser();
    const data = journalInputSchema.parse(input);
    const today = formatDateOnly(new Date());
    if (data.recordedOn > today) return { error: "You can't log a future day." };
    const rows = await db
      .insert(journalEntries)
      .values({ userId: user.id, ...data })
      .onConflictDoUpdate({
        target: [journalEntries.userId, journalEntries.recordedOn],
        set: { ...data, updatedAt: new Date() },
      })
      .returning();
    revalidatePath("/journal"); revalidatePath("/insights"); revalidatePath("/dashboard");
    return { entry: rows[0] };
  } catch (e) { return actionFail(e); }
}
