import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { runPeriodReminderSweep } from "@/lib/notify";
import { formatDateOnly } from "@/lib/cycle";

export const dynamic = "force-dynamic";

/**
 * Secure cron endpoint for Render Cron Job:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/reminders
 * Idempotent: dedupe keys prevent duplicate notifications across retries.
 */
export async function GET(req: NextRequest) {
  const env = getEnv();
  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not configured; reminders disabled." }, { status: 503 });
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const today = formatDateOnly(new Date());
  const created = await runPeriodReminderSweep(today);
  return NextResponse.json({ ok: true, today, notificationsCreated: created });
}
