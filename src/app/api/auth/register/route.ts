import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, passwordProblems } from "@/lib/password";
import { createSession } from "@/lib/session";
import { clientKey, fail, handleError, ok, parseBody, rateLimit } from "@/lib/api";
import { registerSchema } from "@/lib/validate";

export async function POST(req: Request) {
  try {
    if (!rateLimit(clientKey(req, "register-api"), 5, 60_000)) return fail(429, "Too many attempts. Please wait a minute.");
    const data = await parseBody(req, registerSchema);
    const problems = passwordProblems(data.password);
    if (problems.length) return fail(400, `Password needs ${problems.join(", ")}.`);
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, data.email)).limit(1);
    if (existing.length) return fail(409, "An account with this email already exists.");
    const inserted = await db
      .insert(users)
      .values({ email: data.email, passwordHash: await hashPassword(data.password), displayName: data.displayName, timezone: data.timezone })
      .returning({ id: users.id });
    await createSession(inserted[0].id);
    return ok({ created: true }, 201);
  } catch (e) { return handleError(e); }
}
