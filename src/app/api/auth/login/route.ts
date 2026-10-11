import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { clientKey, fail, handleError, ok, parseBody, rateLimit } from "@/lib/api";
import { loginSchema } from "@/lib/validate";

export async function POST(req: Request) {
  try {
    if (!rateLimit(clientKey(req, "login-api"), 10, 60_000)) return fail(429, "Too many attempts. Please wait a minute.");
    const data = await parseBody(req, loginSchema);
    const rows = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
    const user = rows[0];
    if (!user || !(await verifyPassword(data.password, user.passwordHash))) {
      return fail(401, "Email or password didn't match.");
    }
    await createSession(user.id);
    return ok({ authenticated: true });
  } catch (e) { return handleError(e); }
}
