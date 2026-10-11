"use server";

import { and, eq, gt, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { db } from "@/db";
import { authTokens, users } from "@/db/schema";
import { hashPassword, passwordProblems, verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/api";
import { createSession, destroySession, hashToken, newToken } from "@/lib/session";
import { authError } from "@/lib/auth-error";
import { emailSchema, loginSchema, registerSchema } from "@/lib/validate";

async function requestKey(scope: string): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  return `${scope}:${ip}`;
}

async function issueToken(userId: string, kind: "email_verify" | "password_reset", ttlMs: number, executor: Pick<typeof db, "insert"> = db) {
  const token = newToken();
  await executor.insert(authTokens).values({
    userId,
    kind,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + ttlMs),
  });
  return token;
}

export async function registerAction(_prev: unknown, formData: FormData) {
  try {
    const parsed = registerSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
      displayName: formData.get("displayName"),
      timezone: formData.get("timezone") || "UTC",
    });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details" };
    const { email, password, displayName, timezone } = parsed.data;

    const problems = passwordProblems(password);
    if (problems.length) return { error: `Password needs ${problems.join(", ")}.` };

    if (!rateLimit(await requestKey("register"), 5, 60_000)) {
      return { error: "Too many attempts. Please wait a minute and try again." };
    }

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length) return { error: "An account with this email already exists. Try signing in." };

    const token = await db.transaction(async (tx) => {
      const [user] = await tx.insert(users)
        .values({ email, passwordHash: await hashPassword(password), displayName, timezone })
        .returning({ id: users.id });
      const token = await issueToken(user.id, "email_verify", 48 * 3600_000, tx);
      await createSession(user.id, tx);
      return token;
    });
    redirect(`/verify-email?token=${encodeURIComponent(token)}&new=1`);
  } catch (error) {
    unstable_rethrow(error);
    return authError(error);
  }
}

export async function loginAction(_prev: unknown, formData: FormData) {
  try {
    const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
    if (!parsed.success) return { error: "Enter your email and password." };

    if (!rateLimit(await requestKey("login"), 10, 60_000)) {
      return { error: "Too many attempts. Please wait a minute and try again." };
    }

    const rows = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
    const user = rows[0];
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return { error: "Email or password didn't match. Please try again." };
    }
    await createSession(user.id);
    redirect("/dashboard");
  } catch (error) {
    unstable_rethrow(error);
    return authError(error);
  }
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function requestPasswordResetAction(_prev: unknown, formData: FormData): Promise<{ error?: string; ok?: string; devToken?: string }> {
  try {
    const email = emailSchema.safeParse(formData.get("email"));
    if (!email.success) return { error: "Enter a valid email address." };
    if (!rateLimit(await requestKey("pwreset"), 5, 60_000)) {
      return { error: "Too many attempts. Please wait a moment." };
    }
    const rows = await db.select({ id: users.id }).from(users).where(eq(users.email, email.data)).limit(1);
    if (!rows.length) {
      // Do not reveal whether the account exists.
      return { ok: "If an account exists for that email, a reset link is on its way." };
    }
    const token = await issueToken(rows[0].id, "password_reset", 3600_000);
    return { ok: "Reset link created.", devToken: `/reset-password?token=${token}` };
  } catch (error) {
    unstable_rethrow(error);
    return authError(error);
  }
}

export async function resetPasswordAction(_prev: unknown, formData: FormData) {
  try {
    const token = String(formData.get("token") || "");
    const password = String(formData.get("password") || "");
    const problems = passwordProblems(password);
    if (problems.length) return { error: `Password needs ${problems.join(", ")}.` };

    const rows = await db
      .select()
      .from(authTokens)
      .where(
        and(
          eq(authTokens.tokenHash, hashToken(token)),
          eq(authTokens.kind, "password_reset"),
          isNull(authTokens.usedAt),
          gt(authTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!rows.length) return { error: "This reset link is invalid or has expired. Request a new one." };

    await db
      .update(users)
      .set({ passwordHash: await hashPassword(password), updatedAt: new Date() })
      .where(eq(users.id, rows[0].userId));
    await db.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, rows[0].id));
    await createSession(rows[0].userId);
    redirect("/dashboard?welcome=back");
  } catch (error) {
    unstable_rethrow(error);
    return authError(error);
  }
}

export async function verifyEmailAction(_prev: unknown, formData: FormData): Promise<{ error?: string; ok?: string }> {
  try {
    const token = String(formData.get("token") || "");
    const rows = await db
      .select()
      .from(authTokens)
      .where(
        and(
          eq(authTokens.tokenHash, hashToken(token)),
          eq(authTokens.kind, "email_verify"),
          isNull(authTokens.usedAt),
          gt(authTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!rows.length) return { error: "This verification link is invalid or has expired." };
    await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, rows[0].userId));
    await db.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, rows[0].id));
    return { ok: "Your email is verified. Thank you!" };
  } catch (error) {
    unstable_rethrow(error);
    return authError(error);
  }
}
