import { destroySession } from "@/lib/session";
import { handleError, ok } from "@/lib/api";

export async function POST() {
  try {
    await destroySession();
    return ok({ loggedOut: true });
  } catch (e) { return handleError(e); }
}
