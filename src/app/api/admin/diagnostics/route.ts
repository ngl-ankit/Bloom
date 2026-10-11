import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getEnv } from "@/lib/env";
import { isAiConfigured } from "@/lib/ai";

export const dynamic = "force-dynamic";

/** Protected operational endpoint. Requires ADMIN_TOKEN; exposes no user data. */
export async function GET(req: NextRequest) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return NextResponse.json({ error: "Admin tooling not configured." }, { status: 503 });
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${token}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let dbOk = false;
  let userCount: number | null = null;
  try {
    const rows = await db.execute<{ count: number }>(sql`select count(*)::int as count from users`);
    userCount = Number((rows.rows?.[0] as { count?: number } | undefined)?.count ?? 0);
    dbOk = true;
  } catch {
    dbOk = false;
  }
  return NextResponse.json({
    ok: true,
    database: { connected: dbOk, userCount },
    aiProviderConfigured: isAiConfigured(),
    emailConfigured: Boolean(process.env.EMAIL_API_KEY && process.env.EMAIL_FROM),
    cronConfigured: Boolean(getEnv().CRON_SECRET),
    time: new Date().toISOString(),
  });
}
