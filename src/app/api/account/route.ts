import { deleteAccount } from "@/actions/account";
import { fail, handleError } from "@/lib/api";

export async function DELETE() {
  try {
    const result = await deleteAccount();
    // On success deleteAccount redirects internally; if it returns, it failed.
    if (result && "error" in result) return fail(400, result.error);
    return fail(500, "Unexpected state");
  } catch (e) { return handleError(e); }
}
