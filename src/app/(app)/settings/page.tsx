import { eq } from "drizzle-orm";
import { db } from "@/db";
import { reminderPreferences } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { SettingsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const prefsRows = await db.select().from(reminderPreferences).where(eq(reminderPreferences.userId, user.id)).limit(1);
  return (
    <SettingsClient
      user={{ displayName: user.displayName, email: user.email, timezone: user.timezone, theme: user.theme }}
      hasReminderPrefs={prefsRows.length > 0}
    />
  );
}
