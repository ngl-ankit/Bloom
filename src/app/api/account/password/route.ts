import { changePassword } from "@/actions/account";
import { fail, handleError, ok } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await changePassword(body);
    if ("error" in result) return fail(400, result.error);
    return ok(result);
  } catch (e) { return handleError(e); }
}
