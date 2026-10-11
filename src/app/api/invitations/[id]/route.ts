import { revokeInvitation } from "@/actions/pairing";
import { fail, handleError, ok } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const result = await revokeInvitation(id);
    if ("error" in result) return fail(404, result.error);
    return ok(result);
  } catch (e) { return handleError(e); }
}
