import { getCurrentUser } from "@/lib/session";
import { handleError, ok } from "@/lib/api";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return ok({ authenticated: false });
    return ok({ authenticated: true, user: { email: user.email, displayName: user.displayName, timezone: user.timezone } });
  } catch (e) { return handleError(e); }
}
