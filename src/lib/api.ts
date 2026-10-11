import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { AuthError } from "./session";

export function ok<T>(data: T, init?: number) {
  return NextResponse.json(data, { status: init ?? 200 });
}

export function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/** For server actions: convert any thrown error into a plain {error} object. */
export function actionFail(e: unknown): { error: string } {
  if (e instanceof ZodError) {
    const first = e.issues[0];
    return { error: first ? `${first.path.join(".") || "Input"}: ${first.message}` : "Invalid input." };
  }
  if (e instanceof AuthError) return { error: "Please sign in to continue." };
  console.error("[action] unhandled error:", e instanceof Error ? e.message : e);
  return { error: "Something went wrong on our side. Please try again." };
}

export function actionOk<T extends object>(data: T): T {
  return data;
}

export function handleError(e: unknown) {
  if (e instanceof AuthError) return fail(401, "Please sign in to continue.");
  if (e instanceof ZodError) {
    const first = e.issues[0];
    return fail(400, first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input.");
  }
  console.error("[api] unhandled error:", e instanceof Error ? e.message : e);
  return fail(500, "Something went wrong on our side. Please try again.");
}

export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ZodError([{ code: "custom", path: ["body"], message: "Request body must be valid JSON" }]);
  }
  return schema.parse(raw);
}

// ---------------------------------------------------------------------------
// In-process rate limiter (per instance). Deployed behind a single web service
// this throttles burst abuse; auth endpoints additionally rely on token costs.
// ---------------------------------------------------------------------------
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

export function clientKey(req: Request, scope: string): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local";
  return `${scope}:${ip}`;
}
