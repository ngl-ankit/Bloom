/**
 * Centralized notification service.
 * - In-app notifications always.
 * - Optional email via a Resend-compatible HTTP provider (env: EMAIL_API_KEY, EMAIL_FROM).
 * - dedupeKey + unique index make delivery idempotent: retried cron jobs
 *   cannot create duplicate notifications.
 */
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { notifications, pairings, periods, reminderPreferences, users, type NotificationKind } from "@/db/schema";
import { getEnv } from "./env";
import { predictNextPeriod } from "./cycle";

export type CreateNotification = {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** Stable key, e.g. "period_upcoming:2026-10-13:<userId>". Same key = no duplicate row. */
  dedupeKey: string;
  email?: boolean;
};

export async function createNotification(n: CreateNotification): Promise<boolean> {
  const rows = await db
    .insert(notifications)
    .values({ userId: n.userId, kind: n.kind, title: n.title, body: n.body, dedupeKey: n.dedupeKey })
    .onConflictDoNothing({ target: notifications.dedupeKey })
    .returning({ id: notifications.id });
  const created = rows[0];
  if (!created) return false;
  if (n.email) await tryEmail(n, created.id);
  return true;
}

async function tryEmail(n: CreateNotification, notificationId: string): Promise<void> {
  const env = getEnv();
  if (!env.EMAIL_API_KEY || !env.EMAIL_FROM) return;
  const rows = await db.select({ email: users.email }).from(users).where(eq(users.id, n.userId)).limit(1);
  const to = rows[0]?.email;
  if (!to) return;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.EMAIL_API_KEY}` },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to,
        subject: n.title,
        text: `${n.body}\n\nYou can adjust notifications in Bloom → Notification Center.`,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error("[notify] email provider error", res.status);
    } else {
      await db.update(notifications).set({ emailedAt: new Date() }).where(eq(notifications.id, notificationId));
    }
  } catch (e) {
    console.error("[notify] email failed", e instanceof Error ? e.message : e);
  }
}

/** Users whose quiet hours currently apply in their own timezone. */
export async function usersInQuietHours(now = new Date()): Promise<Set<string>> {
  const rows = await db
    .select({
      userId: reminderPreferences.userId,
      start: reminderPreferences.quietHoursStart,
      end: reminderPreferences.quietHoursEnd,
      tz: users.timezone,
    })
    .from(reminderPreferences)
    .innerJoin(users, eq(users.id, reminderPreferences.userId))
    .where(eq(reminderPreferences.emailEnabled, true));
  const quiet = new Set<string>();
  for (const r of rows) {
    const hour = Number(
      new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: r.tz }).format(now),
    );
    const inQuiet = r.start <= r.end ? hour >= r.start && hour < r.end : hour >= r.start || hour < r.end;
    if (inQuiet) quiet.add(r.userId);
  }
  return quiet;
}

/** Run one reminder sweep. Idempotent via dedupeKey; safe to retry. */
export async function runPeriodReminderSweep(today: string): Promise<number> {
  const quiet = await usersInQuietHours();

  const allPrefs = await db
    .select({
      userId: reminderPreferences.userId,
      daysBefore: reminderPreferences.periodReminderDaysBefore,
      emailEnabled: reminderPreferences.emailEnabled,
    })
    .from(reminderPreferences)
    .innerJoin(users, eq(users.id, reminderPreferences.userId));

  let created = 0;
  for (const p of allPrefs) {
    const spans = await db
      .select({ startDate: periods.startDate, endDate: periods.endDate })
      .from(periods)
      .where(eq(periods.userId, p.userId));
    if (spans.length === 0) continue;
    const prediction = predictNextPeriod(spans, today);
    if (!prediction.nextPeriodStart) continue;

    const windowStart = new Date(`${prediction.nextPeriodStart}T00:00:00Z`);
    windowStart.setUTCDate(windowStart.getUTCDate() - p.daysBefore);
    const startStr = windowStart.toISOString().slice(0, 10);
    const due = today >= startStr && today <= prediction.nextPeriodStart;
    if (!due) continue;

    const ok = await createNotification({
      userId: p.userId,
      kind: "period_upcoming",
      title: "Your period may be coming up",
      body: `Based on your history, your next period is estimated around ${prediction.nextPeriodStart}. This is an estimate, not a guarantee.`,
      dedupeKey: `period_upcoming:${prediction.nextPeriodStart}:${p.userId}`,
      email: p.emailEnabled && !quiet.has(p.userId),
    });
    if (ok) created += 1;
  }
  return created;
}

export async function markAllRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

export async function unreadCount(userId: string): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return rows[0]?.count ?? 0;
}

/** Notify the partner of an approved (shareable) craving — never of private ones. */
export async function notifyPartnerOfSharedCraving(ownerId: string, item: string): Promise<void> {
  const rows = await db
    .select({ partnerId: pairings.partnerId })
    .from(pairings)
    .where(and(eq(pairings.ownerId, ownerId), eq(pairings.status, "active")))
    .limit(1);
  const partnerId = rows[0]?.partnerId;
  if (!partnerId) return;
  await createNotification({
    userId: partnerId,
    kind: "craving_hint",
    title: "A gentle idea for someone you care for",
    body: `They chose to share a craving with you. A kind check-in — maybe asking if ${item} would be appreciated — could brighten their day.`,
    dedupeKey: `craving:${ownerId}:${item}:${new Date().toISOString().slice(0, 10)}`,
  });
}
