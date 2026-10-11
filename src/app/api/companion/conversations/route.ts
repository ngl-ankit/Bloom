import { listConversations } from "@/actions/companion";
import { fail, handleError, ok } from "@/lib/api";

export async function GET() {
  try {
    const result = await listConversations();
    if ("error" in result) return fail(400, result.error);
    return ok(result);
  } catch (e) { return handleError(e); }
}
