import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { journalEntries } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { JournalClient } from "./client";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const user = await requireUser();
  const rows = await db.select().from(journalEntries).where(eq(journalEntries.userId, user.id)).orderBy(desc(journalEntries.recordedOn)).limit(60);
  return <JournalClient initialEntries={rows.map((e) => ({ ...e, createdAt: e.createdAt.toISOString(), updatedAt: e.updatedAt.toISOString() }))} />;
}
