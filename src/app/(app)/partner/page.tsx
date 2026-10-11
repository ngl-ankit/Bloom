import { desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { invitations, pairings, users } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { PartnerClient } from "./client";

export const dynamic = "force-dynamic";

export default async function PartnerPage() {
  const user = await requireUser();
  const myInvites = await db.select().from(invitations).where(eq(invitations.ownerId, user.id)).orderBy(desc(invitations.createdAt)).limit(20);
  const pairingRows = await db
    .select()
    .from(pairings)
    .where(or(eq(pairings.ownerId, user.id), eq(pairings.partnerId, user.id)))
    .orderBy(desc(pairings.createdAt))
    .limit(5);

  const pairing = pairingRows.find((p) => p.status === "pending" || p.status === "active") ?? null;
  let partnerName: string | null = null;
  if (pairing) {
    const otherId = pairing.ownerId === user.id ? pairing.partnerId : pairing.ownerId;
    const other = await db.select({ name: users.displayName }).from(users).where(eq(users.id, otherId)).limit(1);
    partnerName = other[0]?.name ?? null;
  }

  return (
    <PartnerClient
      invitations={myInvites.map((i) => ({
        id: i.id, email: i.email, status: i.status, createdAt: i.createdAt.toISOString(), expiresAt: i.expiresAt.toISOString(),
      }))}
      pairing={
        pairing
          ? {
              id: pairing.id,
              role: pairing.ownerId === user.id ? "owner" : "partner",
              status: pairing.status,
              permissions: pairing.permissions,
              partnerName,
            }
          : null
      }
    />
  );
}
