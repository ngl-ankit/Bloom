import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Verify auth tables too: a reachable but unmigrated database is not ready.
    await db.execute(sql`
      select u.id, u.email, u.password_hash, s.token_hash, s.expires_at, t.token_hash, n.id
      from users u
      left join sessions s on s.user_id = u.id
      left join auth_tokens t on t.user_id = u.id
      left join notifications n on n.user_id = u.id
      limit 0
    `);
    return NextResponse.json({ status: "ok", database: "connected", time: new Date().toISOString() });
  } catch {
    return NextResponse.json({ status: "unavailable", database: "unavailable", time: new Date().toISOString() }, { status: 503 });
  }
}
