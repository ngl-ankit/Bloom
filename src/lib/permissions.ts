/**
 * Trusted-person permission model. DENY BY DEFAULT:
 * nothing is shared merely because two accounts are paired — every field
 * category requires the owner's explicit, revocable grant.
 */
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pairings } from "@/db/schema";

export type ShareCategory = "periodEstimates" | "cravings" | "symptoms" | "carePreferences";

export type PairingStatus = "pending" | "active" | "revoked" | "disconnected";

export type PairingPermissions = Record<ShareCategory, boolean>;

export const DEFAULT_PERMISSIONS: PairingPermissions = {
  periodEstimates: false,
  cravings: false,
  symptoms: false,
  carePreferences: false,
};

/**
 * Returns the active pairing where `userId` is the OWNER (the person whose
 * data may be shown), or null. The paired person reads via pairingId.
 */
export async function findActivePairingForOwner(userId: string) {
  const rows = await db
    .select()
    .from(pairings)
    .where(and(eq(pairings.ownerId, userId), eq(pairings.status, "active")))
    .orderBy(desc(pairings.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function findActivePairingForPartner(userId: string) {
  const rows = await db
    .select()
    .from(pairings)
    .where(and(eq(pairings.partnerId, userId), eq(pairings.status, "active")))
    .orderBy(desc(pairings.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * THE gate every paired read must pass. Returns true only when an ACTIVE
 * pairing exists AND the specific category is granted. Anything else denies.
 */
export async function canPartnerView(
  pairingId: string,
  category: ShareCategory,
): Promise<boolean> {
  const rows = await db.select().from(pairings).where(eq(pairings.id, pairingId)).limit(1);
  const pairing = rows[0];
  if (!pairing || pairing.status !== "active") return false;
  return pairing.permissions[category] === true;
}

/** Owner-side view of what their partner can currently see. */
export function effectivePermissions(pairing: {
  status: string;
  permissions: PairingPermissions;
}): PairingPermissions {
  return pairing.status === "active" ? { ...pairing.permissions } : { ...DEFAULT_PERMISSIONS };
}
