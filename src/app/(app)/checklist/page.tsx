import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { checklistItems } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { ChecklistClient } from "./client";

export const dynamic = "force-dynamic";

const DEFAULT_PREP = [
  "Heat pad or warm compress ready",
  "Favorite pain relief (if you use it — as labeled)",
  "Snacks that love you back",
  "Comfortable clothes within reach",
  "Water bottle filled",
  "Pad/tampon/cup stock checked",
];

const DEFAULT_EMERGENCY = [
  "Spare supplies in your bag",
  "Pain relief in your purse/kit",
  "A spare pair of underwear in a pouch",
  "Backup pad for the car/desk",
  "Emergency chocolate stash",
  "Heat patches that stick",
];

export default async function ChecklistPage() {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.userId, user.id))
    .orderBy(asc(checklistItems.createdAt));

  if (rows.length === 0) {
    await db.insert(checklistItems).values([
      ...DEFAULT_PREP.map((label) => ({ userId: user.id, kind: "prep" as const, label })),
      ...DEFAULT_EMERGENCY.map((label) => ({ userId: user.id, kind: "emergency" as const, label })),
    ]);
    const seeded = await db
      .select()
      .from(checklistItems)
      .where(and(eq(checklistItems.userId, user.id)))
      .orderBy(asc(checklistItems.createdAt));
    return <ChecklistClient initial={seeded.map((c) => ({ id: c.id, kind: c.kind, label: c.label, done: c.done }))} />;
  }

  return <ChecklistClient initial={rows.map((c) => ({ id: c.id, kind: c.kind, label: c.label, done: c.done }))} />;
}
