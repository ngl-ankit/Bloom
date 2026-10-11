import { disconnectPairing } from "@/actions/pairing";
import { fail, handleError, ok } from "@/lib/api";

export async function POST() {
  try {
    const result = await disconnectPairing();
    if ("error" in result) return fail(404, result.error);
    return ok(result);
  } catch (e) { return handleError(e); }
}
