import { markNotificationsRead } from "@/actions/account";
import { fail, handleError, ok } from "@/lib/api";

export async function POST() {
  try {
    const result = await markNotificationsRead();
    if ("error" in result) return fail(400, result.error);
    return ok(result);
  } catch (e) { return handleError(e); }
}
