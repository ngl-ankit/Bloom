import { deletePeriod, updatePeriod } from "@/actions/tracking";
import { fail, handleError, ok } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json();
    const result = await updatePeriod(id, body);
    if ("error" in result) return fail(404, result.error);
    return ok(result.period);
  } catch (e) { return handleError(e); }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const result = await deletePeriod(id);
    if ("error" in result) return fail(404, result.error);
    return ok(result);
  } catch (e) { return handleError(e); }
}
