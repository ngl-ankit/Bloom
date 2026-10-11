import { exportData } from "@/actions/account";
import { fail, handleError } from "@/lib/api";

export async function GET() {
  try {
    const result = await exportData();
    if ("error" in result) return fail(400, result.error);
    return new Response(JSON.stringify(result.data, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="bloom-data-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (e) { return handleError(e); }
}
