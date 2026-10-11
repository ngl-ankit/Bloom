import { acceptInvitation } from "@/actions/pairing";
import { fail, handleError, ok } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { token?: unknown };
    const token = typeof body.token === "string" ? body.token : "";
    if (!token) return fail(400, "Invitation token missing.");
    const result = await acceptInvitation(token);
    if ("error" in result) return fail(400, result.error);
    return ok(result, 201);
  } catch (e) { return handleError(e); }
}
