import { and, desc, eq, gte, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateJournalEntryBody,
  CreateJournalEntryResponse,
  CreatePeriodBody,
  CreatePeriodResponse,
  DeleteBloomAccountDataResponse,
  DeleteJournalEntryParams,
  DeleteJournalEntryResponse,
  DeletePeriodParams,
  DeletePeriodResponse,
  ExportBloomDataResponse,
  GetBloomDashboardResponse,
  GetBloomInsightsResponse,
  GetBloomProfileResponse,
  ListJournalEntriesResponse,
  ListPeriodsResponse,
  UpdateBloomProfileBody,
  UpdateBloomProfileResponse,
  UpdateJournalEntryBody,
  UpdateJournalEntryParams,
  UpdateJournalEntryResponse,
  UpdatePeriodBody,
  UpdatePeriodParams,
  UpdatePeriodResponse,
} from "@workspace/api-zod";
import {
  bloomProfilesTable,
  db,
  journalEntriesTable,
  periodsTable,
} from "@workspace/db";
import { authenticatedUserId, requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function ensureProfile(userId: string): Promise<void> {
  await db
    .insert(bloomProfilesTable)
    .values({ clerkUserId: userId })
    .onConflictDoNothing({ target: bloomProfilesTable.clerkUserId });
}

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validPeriodDates(
  value: { startDate?: string; endDate?: string | null },
): boolean {
  if (value.startDate !== undefined && !isCalendarDate(value.startDate)) return false;
  if (value.endDate != null && !isCalendarDate(value.endDate)) return false;
  return value.startDate === undefined || value.endDate == null || value.endDate >= value.startDate;
}

function toPeriodResponse(row: typeof periodsTable.$inferSelect) {
  const { userId: _userId, ...period } = row;
  return CreatePeriodResponse.parse(period);
}

function toJournalResponse(row: typeof journalEntriesTable.$inferSelect) {
  const { userId: _userId, ...entry } = row;
  return CreateJournalEntryResponse.parse(entry);
}

function toProfileResponse(row: typeof bloomProfilesTable.$inferSelect) {
  const {
    clerkUserId: _clerkUserId,
    createdAt: _createdAt,
    ...profile
  } = row;
  return GetBloomProfileResponse.parse(profile);
}

function utcDay(value: string): number {
  return Math.floor(Date.parse(`${value}T00:00:00.000Z`) / 86_400_000);
}

function localCalendarDate(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((item) => item.type === type)?.value ?? "";
    return `${part("year")}-${part("month")}-${part("day")}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function estimateCycle(starts: string[]): {
  averageCycleLength: number | null;
  nextPeriodEstimate: string | null;
  estimateConfidence: "none" | "limited" | "variable" | "moderate";
} {
  if (starts.length < 2) {
    return {
      averageCycleLength: null,
      nextPeriodEstimate: null,
      estimateConfidence: starts.length === 1 ? "limited" : "none",
    };
  }

  const intervals = starts
    .slice(1)
    .map((date, index) => utcDay(date) - utcDay(starts[index]!))
    .filter((days) => days >= 15 && days <= 60)
    .slice(-5);
  if (intervals.length === 0) {
    return { averageCycleLength: null, nextPeriodEstimate: null, estimateConfidence: "limited" };
  }

  const mean = intervals.reduce((sum, days) => sum + days, 0) / intervals.length;
  const averageCycleLength = Math.round(mean);
  const variance =
    intervals.reduce((sum, days) => sum + (days - mean) ** 2, 0) / intervals.length;
  const lastStart = starts.at(-1)!;
  const estimate = new Date(`${lastStart}T00:00:00.000Z`);
  estimate.setUTCDate(estimate.getUTCDate() + averageCycleLength);

  return {
    averageCycleLength,
    nextPeriodEstimate: estimate.toISOString().slice(0, 10),
    estimateConfidence:
      variance > 36 ? "variable" : intervals.length < 3 ? "limited" : "moderate",
  };
}

router.get("/bloom/dashboard", requireAuth, async (_req, res): Promise<void> => {
  const userId = authenticatedUserId(res);
  await ensureProfile(userId);
  const [profile] = await db
    .select()
    .from(bloomProfilesTable)
    .where(eq(bloomProfilesTable.clerkUserId, userId))
    .limit(1);
  if (!profile) {
    res.status(500).json({ error: "Could not load profile" });
    return;
  }

  const [periodRows, journalRows] = await Promise.all([
    db
      .select()
      .from(periodsTable)
      .where(eq(periodsTable.userId, userId))
      .orderBy(desc(periodsTable.startDate))
      .limit(24),
    db
      .select()
      .from(journalEntriesTable)
      .where(eq(journalEntriesTable.userId, userId))
      .orderBy(desc(journalEntriesTable.recordedOn), desc(journalEntriesTable.createdAt))
      .limit(8),
  ]);
  const periods = periodRows.map(toPeriodResponse);
  const starts = [...new Set(periodRows.map((period) => period.startDate))].sort();
  const estimate = estimateCycle(starts);
  const today = localCalendarDate(profile.timezone);
  const latestStart = [...starts].reverse().find((date) => date <= today);
  const daysUntilEstimate =
    estimate.nextPeriodEstimate === null
      ? null
      : utcDay(estimate.nextPeriodEstimate) - utcDay(today);

  GetBloomDashboardResponse.parse({
    currentCycleDay: latestStart ? utcDay(today) - utcDay(latestStart) + 1 : null,
    nextPeriodEstimate: estimate.nextPeriodEstimate,
    estimateConfidence: estimate.estimateConfidence,
    daysUntilEstimate,
    recentPeriods: periods.slice(0, 5),
    recentJournalEntries: journalRows.map(toJournalResponse),
    averageCycleLength: estimate.averageCycleLength,
    recordedCycleCount: starts.length,
  });
  res.json({
    currentCycleDay: latestStart ? utcDay(today) - utcDay(latestStart) + 1 : null,
    nextPeriodEstimate: estimate.nextPeriodEstimate,
    estimateConfidence: estimate.estimateConfidence,
    daysUntilEstimate,
    recentPeriods: periods.slice(0, 5),
    recentJournalEntries: journalRows.map(toJournalResponse),
    averageCycleLength: estimate.averageCycleLength,
    recordedCycleCount: starts.length,
  });
});

router.get("/bloom/periods", requireAuth, async (_req, res): Promise<void> => {
  const userId = authenticatedUserId(res);
  await ensureProfile(userId);
  const rows = await db
    .select()
    .from(periodsTable)
    .where(eq(periodsTable.userId, userId))
    .orderBy(desc(periodsTable.startDate));
  res.json(ListPeriodsResponse.parse(rows.map(toPeriodResponse)));
});

router.post("/bloom/periods", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreatePeriodBody.safeParse(req.body);
  if (!parsed.success || !validPeriodDates(parsed.data)) {
    res.status(400).json({ error: "Check the period dates and try again" });
    return;
  }
  const userId = authenticatedUserId(res);
  await ensureProfile(userId);
  try {
    const [row] = await db
      .insert(periodsTable)
      .values({ userId, ...parsed.data })
      .returning();
    if (!row) throw new Error("Period insert returned no record");
    res.status(201).json(toPeriodResponse(row));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "23505") {
      res.status(409).json({ error: "A period already starts on that date" });
      return;
    }
    throw error;
  }
});

router.patch("/bloom/periods/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdatePeriodParams.safeParse(req.params);
  const parsed = UpdatePeriodBody.safeParse(req.body);
  if (!params.success || !parsed.success || !validPeriodDates(parsed.data)) {
    res.status(400).json({ error: "Check the period details and try again" });
    return;
  }
  if (Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: "At least one field is required" });
    return;
  }
  const userId = authenticatedUserId(res);
  await ensureProfile(userId);
  try {
    const [row] = await db
      .update(periodsTable)
      .set(parsed.data)
      .where(and(eq(periodsTable.id, params.data.id), eq(periodsTable.userId, userId)))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Period record not found" });
      return;
    }
    res.json(UpdatePeriodResponse.parse(toPeriodResponse(row)));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "23505") {
      res.status(409).json({ error: "A period already starts on that date" });
      return;
    }
    throw error;
  }
});

router.delete("/bloom/periods/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeletePeriodParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid period identifier" });
    return;
  }
  const userId = authenticatedUserId(res);
  const [deleted] = await db
    .delete(periodsTable)
    .where(and(eq(periodsTable.id, params.data.id), eq(periodsTable.userId, userId)))
    .returning({ id: periodsTable.id });
  if (!deleted) {
    res.status(404).json({ error: "Period record not found" });
    return;
  }
  DeletePeriodResponse.parse(undefined);
  res.sendStatus(204);
});

router.get("/bloom/journal", requireAuth, async (_req, res): Promise<void> => {
  const userId = authenticatedUserId(res);
  await ensureProfile(userId);
  const rows = await db
    .select()
    .from(journalEntriesTable)
    .where(eq(journalEntriesTable.userId, userId))
    .orderBy(desc(journalEntriesTable.recordedOn), desc(journalEntriesTable.createdAt))
    .limit(200);
  res.json(ListJournalEntriesResponse.parse(rows.map(toJournalResponse)));
});

router.post("/bloom/journal", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateJournalEntryBody.safeParse(req.body);
  if (!parsed.success || !isCalendarDate(parsed.data.recordedOn)) {
    res.status(400).json({ error: "Check the entry date and try again" });
    return;
  }
  const userId = authenticatedUserId(res);
  await ensureProfile(userId);
  const [row] = await db
    .insert(journalEntriesTable)
    .values({ userId, ...parsed.data })
    .returning();
  if (!row) {
    res.status(500).json({ error: "Could not save journal entry" });
    return;
  }
  res.status(201).json(toJournalResponse(row));
});

router.patch("/bloom/journal/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateJournalEntryParams.safeParse(req.params);
  const parsed = UpdateJournalEntryBody.safeParse(req.body);
  if (
    !params.success ||
    !parsed.success ||
    (parsed.data.recordedOn !== undefined && !isCalendarDate(parsed.data.recordedOn))
  ) {
    res.status(400).json({ error: "Check the journal details and try again" });
    return;
  }
  if (Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: "At least one field is required" });
    return;
  }
  const userId = authenticatedUserId(res);
  const [row] = await db
    .update(journalEntriesTable)
    .set(parsed.data)
    .where(and(eq(journalEntriesTable.id, params.data.id), eq(journalEntriesTable.userId, userId)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Journal entry not found" });
    return;
  }
  res.json(UpdateJournalEntryResponse.parse(toJournalResponse(row)));
});

router.delete("/bloom/journal/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteJournalEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid journal identifier" });
    return;
  }
  const userId = authenticatedUserId(res);
  const [deleted] = await db
    .delete(journalEntriesTable)
    .where(
      and(
        eq(journalEntriesTable.id, params.data.id),
        eq(journalEntriesTable.userId, userId),
      ),
    )
    .returning({ id: journalEntriesTable.id });
  if (!deleted) {
    res.status(404).json({ error: "Journal entry not found" });
    return;
  }
  DeleteJournalEntryResponse.parse(undefined);
  res.sendStatus(204);
});

router.get("/bloom/profile", requireAuth, async (_req, res): Promise<void> => {
  const userId = authenticatedUserId(res);
  await ensureProfile(userId);
  const [row] = await db
    .select()
    .from(bloomProfilesTable)
    .where(eq(bloomProfilesTable.clerkUserId, userId))
    .limit(1);
  if (!row) {
    res.status(500).json({ error: "Could not load profile" });
    return;
  }
  res.json(toProfileResponse(row));
});

router.put("/bloom/profile", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateBloomProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Check profile preferences and try again" });
    return;
  }
  const userId = authenticatedUserId(res);
  await ensureProfile(userId);
  const [row] = await db
    .update(bloomProfilesTable)
    .set(parsed.data)
    .where(eq(bloomProfilesTable.clerkUserId, userId))
    .returning();
  if (!row) {
    res.status(500).json({ error: "Could not save profile" });
    return;
  }
  res.json(UpdateBloomProfileResponse.parse(toProfileResponse(row)));
});

router.get("/bloom/insights", requireAuth, async (_req, res): Promise<void> => {
  const userId = authenticatedUserId(res);
  const entries = await db
    .select({
      symptoms: journalEntriesTable.symptoms,
      pain: journalEntriesTable.pain,
      recordedOn: journalEntriesTable.recordedOn,
    })
    .from(journalEntriesTable)
    .where(eq(journalEntriesTable.userId, userId))
    .orderBy(desc(journalEntriesTable.recordedOn))
    .limit(200);
  const counts = new Map<string, number>();
  for (const entry of entries) {
    for (const symptom of new Set(entry.symptoms)) {
      counts.set(symptom, (counts.get(symptom) ?? 0) + 1);
    }
  }
  const insights = [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([symptom, count]) => ({
      id: `symptom-${symptom.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      title: `${symptom} appears in ${count} entries`,
      detail: `You recorded ${symptom.toLowerCase()} on ${count} separate journal entries.`,
      sampleSize: entries.length,
      limitation: "Based only on entries you saved in Bloom. This is not a diagnosis or a complete health picture.",
    }));
  if (entries.length >= 2) {
    const painScores = entries
      .map((entry) => entry.pain)
      .filter((value): value is number => typeof value === "number");
    if (painScores.length >= 2) {
      const mean = painScores.reduce((sum, value) => sum + value, 0) / painScores.length;
      insights.push({
        id: "logged-pain-average",
        title: "Your logged pain average",
        detail: `Average severity ${mean.toFixed(1)} out of 10 across ${painScores.length} entries where you rated pain.`,
        sampleSize: painScores.length,
        limitation: "Reflects only entries with a pain rating; it does not indicate a medical condition.",
      });
    }
  }
  res.json(GetBloomInsightsResponse.parse(insights));
});

router.get("/bloom/export", requireAuth, async (_req, res): Promise<void> => {
  const userId = authenticatedUserId(res);
  await ensureProfile(userId);
  const [[profile], periods, journalEntries] = await Promise.all([
    db
      .select()
      .from(bloomProfilesTable)
      .where(eq(bloomProfilesTable.clerkUserId, userId))
      .limit(1),
    db
      .select()
      .from(periodsTable)
      .where(eq(periodsTable.userId, userId))
      .orderBy(desc(periodsTable.startDate)),
    db
      .select()
      .from(journalEntriesTable)
      .where(eq(journalEntriesTable.userId, userId))
      .orderBy(desc(journalEntriesTable.recordedOn)),
  ]);
  if (!profile) {
    res.status(500).json({ error: "Could not export profile" });
    return;
  }
  res.json(
    ExportBloomDataResponse.parse({
      exportedAt: new Date().toISOString(),
      profile: toProfileResponse(profile),
      periods: periods.map(toPeriodResponse),
      journalEntries: journalEntries.map(toJournalResponse),
    }),
  );
});

router.delete("/bloom/account", requireAuth, async (_req, res): Promise<void> => {
  const userId = authenticatedUserId(res);
  await db.delete(bloomProfilesTable).where(eq(bloomProfilesTable.clerkUserId, userId));
  DeleteBloomAccountDataResponse.parse(undefined);
  res.sendStatus(204);
});

export default router;
