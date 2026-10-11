import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications, reminderPreferences } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { NotificationsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireUser();
  const rows = await db.select().from(notifications).where(eq(notifications.userId, user.id)).orderBy(desc(notifications.createdAt)).limit(50);
  const prefRows = await db.select().from(reminderPreferences).where(eq(reminderPreferences.userId, user.id)).limit(1);
  const prefs = prefRows[0] ?? {
    userId: user.id,
    periodReminderDaysBefore: 2,
    suppliesReminderEnabled: false,
    checklistReminderEnabled: false,
    emailEnabled: false,
    quietHoursStart: 22,
    quietHoursEnd: 8,
    updatedAt: new Date(),
  };

  return (
    <NotificationsClient
      notifications={rows.map((n) => ({ id: n.id, kind: n.kind, title: n.title, body: n.body, readAt: n.readAt?.toISOString() ?? null, createdAt: n.createdAt.toISOString() }))}
      prefs={{
        periodReminderDaysBefore: prefs.periodReminderDaysBefore,
        suppliesReminderEnabled: prefs.suppliesReminderEnabled,
        checklistReminderEnabled: prefs.checklistReminderEnabled,
        emailEnabled: prefs.emailEnabled,
        quietHoursStart: prefs.quietHoursStart,
        quietHoursEnd: prefs.quietHoursEnd,
      }}
    />
  );
}
