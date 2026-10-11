"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  comfortProfile, conversations, cravings, invitations,
  journalEntries, notifications, pairings, periods, reminderPreferences, users,
} from "@/db/schema";
import { requireUser } from "@/lib/session";
import { actionFail } from "@/lib/api";
import { hashPassword, passwordProblems, verifyPassword } from "@/lib/password";

/** Full data export: every row belonging to the requesting user, nothing else. */
export async function exportData() {
  try {
    const user = await requireUser();
    const [
      myPeriods, myJournal, myCravings, myComfort, myPairings, myInvitations,
      myNotifications, myReminders, myConversations,
    ] = await Promise.all([
      db.select().from(periods).where(eq(periods.userId, user.id)),
      db.select().from(journalEntries).where(eq(journalEntries.userId, user.id)),
      db.select().from(cravings).where(eq(cravings.userId, user.id)),
      db.select().from(comfortProfile).where(eq(comfortProfile.userId, user.id)),
      db.select().from(pairings).where(eq(pairings.ownerId, user.id)),
      db.select().from(invitations).where(eq(invitations.ownerId, user.id)),
      db.select().from(notifications).where(eq(notifications.userId, user.id)),
      db.select().from(reminderPreferences).where(eq(reminderPreferences.userId, user.id)),
      db.select().from(conversations).where(eq(conversations.userId, user.id)),
    ]);
    return {
      data: {
        exportedAt: new Date().toISOString(),
        account: { email: user.email, displayName: user.displayName, timezone: user.timezone, theme: user.theme, createdAt: user.createdAt },
        periods: myPeriods,
        journalEntries: myJournal,
        cravings: myCravings,
        comfortProfile: myComfort,
        pairings: myPairings,
        invitations: myInvitations.map(({ tokenHash: _t, ...rest }) => rest),
        notifications: myNotifications,
        reminderPreferences: myReminders,
        conversations: myConversations,
      },
    };
  } catch (e) { return actionFail(e); }
}

/** Hard delete: cascades wipe all owned rows; sessions die immediately. */
export async function deleteAccount() {
  let failed: { error: string } | null = null;
  try {
    const user = await requireUser();
    await db.delete(users).where(eq(users.id, user.id));
  } catch (e) {
    failed = actionFail(e);
  }
  if (failed) return failed;
  redirect("/");
}

export async function markNotificationsRead() {
  try {
    const user = await requireUser();
    await db.update(notifications).set({ readAt: new Date() }).where(eq(notifications.userId, user.id));
    revalidatePath("/notifications");
    return { read: true };
  } catch (e) { return actionFail(e); }
}

export async function changePassword(input: { currentPassword: string; newPassword: string }) {
  try {
    const user = await requireUser();
    const problems = passwordProblems(input.newPassword);
    if (problems.length) return { error: `New password needs ${problems.join(", ")}.` };
    if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
      return { error: "Your current password didn't match." };
    }
    await db.update(users).set({ passwordHash: await hashPassword(input.newPassword), updatedAt: new Date() }).where(eq(users.id, user.id));
    return { saved: true };
  } catch (e) { return actionFail(e); }
}
