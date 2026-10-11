import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { pairings } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { findActivePairingForPartner } from "@/lib/permissions";
import { EmptyState } from "@/components/ui";
import { CareClient } from "./client";

export const dynamic = "force-dynamic";

export default async function CarePage() {
  const user = await requireUser();
  const pairing = await findActivePairingForPartner(user.id);

  if (!pairing) {
    return (
      <div className="rise">
        <h1 className="font-display text-3xl mb-6">Care dashboard</h1>
        <EmptyState
          icon="🤍"
          title="No active pairing"
          body="When someone you care for grants you access, the bits they've chosen — and only those — will appear here."
        />
      </div>
    );
  }

  // Double gate: pairing status re-checked server-side, per-category flags enforced in lib/care.
  const fresh = await db.select().from(pairings).where(and(eq(pairings.id, pairing.id), eq(pairings.status, "active"))).limit(1);
  const p = fresh[0];
  if (!p) {
    return <EmptyState icon="🤍" title="No active pairing" body="This pairing is no longer active." />;
  }

  const { buildPartnerView } = await import("@/lib/care");
  const view = await buildPartnerView(p.ownerId, p.permissions);

  return (
    <CareClient
      permissions={p.permissions}
      view={{
        periodEstimates: view.periodEstimates ? {
          nextPeriodStart: view.periodEstimates.prediction.nextPeriodStart,
          confidence: view.periodEstimates.prediction.confidence,
          confidenceNote: view.periodEstimates.prediction.confidenceNote,
          averageCycleLength: view.periodEstimates.prediction.averageCycleLength,
        } : null,
        cravings: view.cravings,
        symptoms: view.symptoms,
        carePreferences: view.carePreferences,
      }}
    />
  );
}
