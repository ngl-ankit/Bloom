import { and, eq, gt } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { invitations, users } from "@/db/schema";
import { getCurrentUser, hashToken } from "@/lib/session";
import { AcceptForm } from "./accept-form";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const viewer = await getCurrentUser();

  const rows = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.tokenHash, hashToken(token)), gt(invitations.expiresAt, new Date())))
    .limit(1);
  const invite = rows[0];

  let inviterName: string | null = null;
  if (invite) {
    const owner = await db.select({ name: users.displayName }).from(users).where(eq(users.id, invite.ownerId)).limit(1);
    inviterName = owner[0]?.name ?? "Someone who cares about you";
  }

  const valid = invite && invite.status === "pending";

  return (
    <main id="main" className="petal-bg min-h-dvh flex items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-8 text-center rise">
        <div className="text-4xl mb-3" aria-hidden>{valid ? "💌" : "🥀"}</div>
        {!viewer ? (
          <>
            <h1 className="font-display text-2xl">A care invitation</h1>
            {inviterName && <p className="muted text-sm mt-3">{inviterName} would like you to be their trusted person on Bloom.</p>}
            <p className="muted text-sm mt-2">Sign in or create an account first — accepting takes one tap after that.</p>
            <div className="flex gap-2 justify-center mt-6">
              <Link className="btn btn-primary" href={`/register?next=/invite/${token}`}>Create account</Link>
              <Link className="btn btn-secondary" href={`/login?next=/invite/${token}`}>Sign in</Link>
            </div>
          </>
        ) : valid ? (
          <>
            <h1 className="font-display text-2xl">You're invited 💞</h1>
            <p className="muted text-sm mt-3">{inviterName} invited you to be their trusted person.</p>
            {invite.message && <p className="text-sm mt-3 surface-2 rounded-2xl p-4">“{invite.message}”</p>}
            <p className="text-xs muted mt-4">
              Accepting creates the pairing, but nothing is shared until they choose permissions — and either of you can disconnect anytime.
              Your care dashboard will show only what is explicitly allowed.
            </p>
            <AcceptForm token={token} />
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl">Invitation unavailable</h1>
            <p className="muted text-sm mt-3">This link was already used, revoked, or has expired. Ask your person to create a fresh one from Bloom → Trusted person.</p>
            <Link className="btn btn-secondary mt-6" href="/dashboard">Go to Bloom</Link>
          </>
        )}
      </div>
    </main>
  );
}
