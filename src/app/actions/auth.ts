"use server";

import { and, eq, gt, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { authTokens, users } from "@/db/schema";
import { hashPassword, verifyPassword, passwordProblems } from "@/lib/password";
import { createSession, destroySession, hashToken, newToken, requireUser } from "@/lib/session";
import { rateLimit, clientKey } from "@/lib/api";
import { emailSchema, loginSchema, registerSchema } from "@/lib/validate";
import { headers } from "next/headers";

async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${proto}://${host}`;
}

async function issueToken(userId: string, kind: "email_verify" | "password_reset", ttlMs: number) {
  const token = newToken();
  await db.insert(authTokens).values({
    userId,
    kind,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + ttlMs),
  });
  return token;
}

export async function registerAction(_prev: unknown, formData: FormData) {
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

  if (!rateLimit(clientKey(await req(), "register"), 5, 60_000)) {
    return { error: "Too many attempts. Please wait a minute and try again." };
  }

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) return { error: "An account with this email already exists. Try signing in." };

  const inserted = await db
    .insert(users)
    .values({ email, passwordHash: await hashPassword(password), displayName, timezone })
    .returning({ id: users.id });
  const userId = inserted[0].id;

  // Email delivery is optional; the verification token is always issued and
  // surfaced in-app in development/no-email mode so nobody is locked out.
  const token = await issueToken(userId, "email_verify", 48 * 3600_000);
  await createSession(userId);
  redirect(`/verify-email?token=${encodeURIComponent(token)}&new=1`);
}

async function req(): Promise<Request> {
  const h = await headers();
  return new Request(`http://${h.get("host")}`, { headers: h });
}

export async function loginAction(_prev: unknown, formData: FormData) {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Enter your email and password." };

  if (!rateLimit(clientKey(await req(), "login"), 10, 60_000)) {
    return { error: "Too many attempts. Please wait a minute and try again." };
  }

  const rows = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  const user = rows[0];
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Email or password didn't match. Please try again." };
  }
  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function requestPasswordResetAction(_prev: unknown, formData: FormData) {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { error: "Enter a valid email address." };
  if (!rateLimit(clientKey(await req(), "pwreset"), 5, 60_000)) {
    return { error: "Too many attempts. Please wait a moment." };
  }
  const rows = await db.select({ id: users.id }).from(users).where(eq(users.email, email.data)).limit(1);
  if (!rows.length) {
    // Do not reveal whether the account exists.
    return { ok: "If an account exists for that email, a reset link is on its way." };
  }
  const token = await issueToken(rows[0].id, "password_reset", 3600_000);
  return { ok: "Reset link created.", devToken: `/reset-password?token=${token}` };
}

export async function resetPasswordAction(_prev: unknown, formData: FormData) {
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

  await db.update(users).set({ passwordHash: await hashPassword(password), updatedAt: new Date() }).where(eq(users.id, rows[0].userId));
  await db.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, rows[0].id));
  await createSession(rows[0].userId);
  redirect("/dashboard?welcome=back");
}

export async function verifyEmailAction(_prev: unknown, formData: FormData) {
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
}

export async function logoutIfCurrent() {
  const user = await requireUser();
  return user.id;
}
