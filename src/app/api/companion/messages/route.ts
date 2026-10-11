import { sendMessage } from "@/actions/companion";
import { fail, handleError, ok } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await sendMessage(body);
    if ("error" in result) return fail(400, result.error);
    return ok(result, 201);
  } catch (e) { return handleError(e); }
}
