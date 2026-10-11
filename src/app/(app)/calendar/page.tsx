import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { periods } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { CalendarClient } from "./client";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const user = await requireUser();
  const rows = await db.select().from(periods).where(eq(periods.userId, user.id)).orderBy(desc(periods.startDate));
  return (
    <CalendarClient
      periods={rows.map((p) => ({ id: p.id, startDate: p.startDate, endDate: p.endDate, flow: p.flow, notes: p.notes }))}
    />
  );
}
