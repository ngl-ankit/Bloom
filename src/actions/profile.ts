"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { comfortProfile, reminderPreferences, users } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { actionFail, actionOk } from "@/lib/api";
import { comfortProfileSchema, profileSchema, reminderPrefsSchema } from "@/lib/validate";

export async function updateProfile(input: unknown) {
  try {
    const user = await requireUser();
    const data = profileSchema.parse(input);
    await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, user.id));
    revalidatePath("/settings"); revalidatePath("/dashboard");
    return { saved: true };
  } catch (e) { return actionFail(e); }
}

export async function saveComfortProfile(input: unknown) {
  try {
    const user = await requireUser();
    const data = comfortProfileSchema.parse(input);
    await db
      .insert(comfortProfile)
      .values({ userId: user.id, ...data, updatedAt: new Date() })
      .onConflictDoUpdate({ target: comfortProfile.userId, set: { ...data, updatedAt: new Date() } });
    revalidatePath("/cravings");
    return { saved: true };
  } catch (e) { return actionFail(e); }
}

export async function saveReminderPrefs(input: unknown) {
  try {
    const user = await requireUser();
    const data = reminderPrefsSchema.parse(input);
    await db
      .insert(reminderPreferences)
      .values({ userId: user.id, ...data, updatedAt: new Date() })
      .onConflictDoUpdate({ target: reminderPreferences.userId, set: { ...data, updatedAt: new Date() } });
    revalidatePath("/notifications");
    return { saved: true };
  } catch (e) { return actionFail(e); }
}
