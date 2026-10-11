/**
 * Partner-side data assembly. Every category is included ONLY when the owner's
 * stored permission flag is true — the caller passes permissions resolved from
 * an ACTIVE pairing. Deny by default at every layer.
 */
import { desc, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { comfortProfile, cravings, journalEntries, periods } from "@/db/schema";
import { formatDateOnly, predictNextPeriod, type CyclePrediction } from "./cycle";
import type { PermissionFlags } from "@/db/schema";

export type PartnerView = {
  periodEstimates: { prediction: CyclePrediction } | null;
  cravings: { id: string; item: string; category: string; createdAt: string }[] | null;
  symptoms: { recordedOn: string; symptoms: string[]; pain: number | null; mood: string | null }[] | null;
  carePreferences:
    | { favoriteSnacks: string[]; comfortActivities: string[]; dislikes: string[]; allergies: string[]; preferredSupport: string | null }
    | null;
};

export async function buildPartnerView(ownerId: string, permissions: PermissionFlags): Promise<PartnerView> {
  const view: PartnerView = {
    periodEstimates: null, cravings: null, symptoms: null, carePreferences: null,
  };

  if (permissions.periodEstimates) {
    const spans = await db
      .select({ startDate: periods.startDate, endDate: periods.endDate })
      .from(periods)
      .where(eq(periods.userId, ownerId));
    view.periodEstimates = { prediction: predictNextPeriod(spans, formatDateOnly(new Date())) };
  }

  if (permissions.cravings) {
    // ONLY entries explicitly marked shareable by the owner.
    const rows = await db
      .select()
      .from(cravings)
      .where(and(eq(cravings.userId, ownerId), eq(cravings.shareWithPartner, true)))
      .orderBy(desc(cravings.createdAt))
      .limit(20);
    view.cravings = rows.map((c) => ({ id: c.id, item: c.item, category: c.category, createdAt: c.createdAt.toISOString() }));
  }

  if (permissions.symptoms) {
    const rows = await db
      .select({ recordedOn: journalEntries.recordedOn, symptoms: journalEntries.symptoms, pain: journalEntries.pain, mood: journalEntries.mood })
      .from(journalEntries)
      .where(eq(journalEntries.userId, ownerId))
      .orderBy(desc(journalEntries.recordedOn))
      .limit(7);
    view.symptoms = rows;
  }

  if (permissions.carePreferences) {
    const rows = await db.select().from(comfortProfile).where(eq(comfortProfile.userId, ownerId)).limit(1);
    const p = rows[0];
    if (p) {
      view.carePreferences = {
        favoriteSnacks: p.favoriteSnacks,
        comfortActivities: p.comfortActivities,
        dislikes: p.dislikes,
        allergies: p.allergies,
        preferredSupport: p.preferredSupport,
      };
    }
  }

  return view;
}
