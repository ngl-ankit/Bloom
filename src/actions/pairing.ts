"use server";

import { and, eq, gt, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { invitations, notifications, pairings, users } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { actionFail, actionOk } from "@/lib/api";
import { invitationSchema, permissionsSchema } from "@/lib/validate";
import { hashToken, newToken } from "@/lib/session";
import { DEFAULT_PERMISSIONS } from "@/lib/permissions";
import { rateLimit } from "@/lib/api";

const INVITE_TTL_MS = 7 * 24 * 3600_000;

async function activePairingRows(userId: string) {
  return db
    .select({ id: pairings.id, status: pairings.status })
    .from(pairings)
    .where(or(eq(pairings.ownerId, userId), eq(pairings.partnerId, userId)));
}

export async function createInvitation(input: unknown) {
  try {
    const user = await requireUser();
    if (!rateLimit(`invite:${user.id}`, 5, 3600_000))
      return { error: "Too many invitations recently. Please try again in an hour." };
    const data = invitationSchema.parse(input);

    const mine = await activePairingRows(user.id);
    if (mine.some((p) => p.status === "active" || p.status === "pending"))
      return { error: "You already have a pairing in progress. Disconnect it or revoke the pending invitation first." };

    const invitee = await db.select({ id: users.id }).from(users).where(eq(users.email, data.email)).limit(1);
    if (invitee.length && invitee[0].id === user.id) return { error: "You can't invite yourself." };
    if (invitee.length)
      return { error: "That person already has a Bloom account — send them the invitation link; they can accept it while signed in." };

    const token = newToken();
    const rows = await db
      .insert(invitations)
      .values({
        ownerId: user.id,
        email: data.email,
        message: data.message ?? null,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      })
      .returning();

    await db.insert(notifications).values({
      userId: user.id,
      kind: "invitation",
      title: "Invitation created",
      body: `A pairing invitation for ${data.email} was created. Share the link to complete pairing.`,
      dedupeKey: `invite-created:${rows[0].id}`,
    });

    revalidatePath("/partner");
    return { token, expiresAt: rows[0].expiresAt };
  } catch (e) { return actionFail(e); }
}

export async function revokeInvitation(id: string) {
  try {
    const user = await requireUser();
    const rows = await db
      .update(invitations)
      .set({ status: "revoked" })
      .where(and(eq(invitations.id, id), eq(invitations.ownerId, user.id), eq(invitations.status, "pending")))
      .returning({ id: invitations.id });
    if (!rows.length) return { error: "Pending invitation not found." };
    revalidatePath("/partner");
    return { revoked: true };
  } catch (e) { return actionFail(e); }
}

/** Accept an invitation — called by the invitee; creates a PENDING pairing. */
export async function acceptInvitation(token: string) {
  try {
    const user = await requireUser();
    const rows = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.tokenHash, hashToken(token)),
          eq(invitations.status, "pending"),
          gt(invitations.expiresAt, new Date()),
        ),
      )
      .limit(1);
    const invite = rows[0];
    if (!invite) return { error: "This invitation is invalid, expired, or revoked." };
    if (invite.ownerId === user.id) return { error: "You can't accept your own invitation." };

    const already = await activePairingRows(user.id);
    if (already.some((p) => p.status === "active" || p.status === "pending"))
      return { error: "You already have a pairing. Disconnect it before accepting a new one." };

    // Pairing starts PENDING — pairing alone shares nothing at all.
    await db.insert(pairings).values({ ownerId: invite.ownerId, partnerId: user.id, status: "pending", permissions: DEFAULT_PERMISSIONS });
    await db.update(invitations).set({ status: "accepted", acceptedAt: new Date() }).where(eq(invitations.id, invite.id));
    await db.insert(notifications).values({
      userId: invite.ownerId,
      kind: "invitation",
      title: "Your invitation was accepted",
      body: "They accepted your pairing invitation. Nothing is shared yet — choose what to allow when you're ready.",
      dedupeKey: `invite-accepted:${invite.id}`,
    });
    revalidatePath("/partner");
    return { accepted: true };
  } catch (e) { return actionFail(e); }
}

/** Owner grants/updates granular permissions on a PENDING pairing → becomes active. */
export async function updatePermissions(pairingId: string, input: unknown) {
  try {
    const user = await requireUser();
    const data = permissionsSchema.parse(input);
    const rows = await db
      .update(pairings)
      .set({ permissions: data, status: "active", updatedAt: new Date() })
      .where(and(eq(pairings.id, pairingId), eq(pairings.ownerId, user.id), eq(pairings.status, "pending")))
      .returning({ partnerId: pairings.partnerId });
    if (!rows.length) return { error: "Pending pairing not found." };
    await db.insert(notifications).values({
      userId: rows[0].partnerId,
      kind: "system",
      title: "Sharing was updated",
      body: "Someone you care for updated what they share with you. Open your care dashboard to see what they've allowed.",
      dedupeKey: `perm-update:${pairingId}:${Date.now()}`,
    });
    revalidatePath("/partner"); revalidatePath("/care");
    return { permissions: data };
  } catch (e) { return actionFail(e); }
}

/** Either side can disconnect. Immediate, total permission revocation. */
export async function disconnectPairing() {
  try {
    const user = await requireUser();
    const rows = await db
      .update(pairings)
      .set({ status: "disconnected", permissions: DEFAULT_PERMISSIONS, updatedAt: new Date() })
      .where(
        and(
          eq(pairings.status, "active"),
          or(eq(pairings.ownerId, user.id), eq(pairings.partnerId, user.id)),
        ),
      )
      .returning({ id: pairings.id, ownerId: pairings.ownerId, partnerId: pairings.partnerId });
    if (!rows.length) return { error: "No active pairing to disconnect." };
    const other = rows[0].ownerId === user.id ? rows[0].partnerId : rows[0].ownerId;
    await db.insert(notifications).values({
      userId: other,
      kind: "system",
      title: "Pairing disconnected",
      body: "Your trusted-person pairing was disconnected. No further information is shared.",
      dedupeKey: `disconnected:${rows[0].id}:${Date.now()}`,
    });
    revalidatePath("/partner"); revalidatePath("/care");
    return { disconnected: true };
  } catch (e) { return actionFail(e); }
}
