import { config } from "dotenv";
config();

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { comfortProfile, journalEntries, periods, reminderPreferences, users } from "../src/db/schema";
import { hashPassword } from "../src/lib/password";
import { addDays, formatDateOnly } from "../src/lib/cycle";

/**
 * Seeds ONE clearly-identified demo account.
 * demo@bloom.app / BloomDemo2026 (inert until its email is verified in-app)
 */
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const existing = await db.select().from(users).where(eq(users.email, "demo@bloom.app")).limit(1);
  if (existing.length) {
    console.log("Demo account already exists — nothing to do.");
    await pool.end();
    return;
  }

  const inserted = await db
    .insert(users)
    .values({
      email: "demo@bloom.app",
      passwordHash: await hashPassword("BloomDemo2026"),
      displayName: "Demo Bloom",
      timezone: "UTC",
      emailVerifiedAt: new Date(),
    })
    .returning({ id: users.id });
  const userId = inserted[0].id;

  const today = formatDateOnly(new Date());
  // Three recent cycles: 28, 29, 27 days apart, 5-day durations.
  const cycleStarts = [addDays(today, -91), addDays(today, -63), addDays(today, -34)];
  for (const start of cycleStarts) {
    await db.insert(periods).values({
      userId,
      startDate: start,
      endDate: addDays(start, 4),
      flow: "medium",
      notes: null,
    });
  }

  const sampleDays: { offset: number; symptoms: string[]; pain: number | null; mood: string; energy: number | null; flow: "light" | "medium" | "heavy" | null; helped: boolean | null; actions: string[] }[] = [
    { offset: -91, symptoms: ["cramps", "fatigue"], pain: 6, mood: "tired", energy: 3, flow: "medium", helped: true, actions: ["Heating pad", "Chamomile tea"] },
    { offset: -63, symptoms: ["cramps", "backache"], pain: 5, mood: "sensitive", energy: 4, flow: "medium", helped: true, actions: ["Heating pad"] },
    { offset: -34, symptoms: ["cramps", "bloating"], pain: 6, mood: "irritable", energy: 3, flow: "medium", helped: true, actions: ["Warm bath", "Dark chocolate"] },
    { offset: -20, symptoms: ["headache"], pain: 3, mood: "calm", energy: 6, flow: null, helped: null, actions: [] },
    { offset: -10, symptoms: [], pain: 1, mood: "happy", energy: 8, flow: null, helped: null, actions: ["Evening walk"] },
  ];
  for (const d of sampleDays) {
    await db.insert(journalEntries).values({
      userId,
      recordedOn: addDays(today, d.offset),
      symptoms: d.symptoms,
      pain: d.pain,
      mood: d.mood,
      energy: d.energy,
      flow: d.flow,
      comfortActions: d.actions,
      comfortHelped: d.helped,
      notes: null,
    });
  }

  await db.insert(comfortProfile).values({
    userId,
    favoriteSnacks: ["Dark chocolate", "Salted almonds"],
    favoriteDrinks: ["Chamomile tea", "Hot cocoa"],
    comfortFoods: ["Warm ramen", "Mac and cheese"],
    flowersOrSurprises: ["Tulips"],
    comfortActivities: ["Heating pad", "Warm bath", "Rom-coms", "Evening walk"],
    dislikes: ["Coffee at night"],
    dietaryRestrictions: [],
    allergies: ["Peanuts"],
    preferredSupport: "Gentle check-ins and snacks, not advice unless I ask.",
  });

  await db.insert(reminderPreferences).values({ userId });

  console.log("Seeded demo account: demo@bloom.app (password BloomDemo2026)");
  await pool.end();
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
