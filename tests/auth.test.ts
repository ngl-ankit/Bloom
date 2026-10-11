import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  select: vi.fn(), insert: vi.fn(), transaction: vi.fn(), execute: vi.fn(),
  createSession: vi.fn(), verifyPassword: vi.fn(), rateLimit: vi.fn(),
}));
vi.mock("@/db", () => ({ db: mocks }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => { throw Object.assign(new Error("redirect"), { digest: `NEXT_REDIRECT;${path}` }); },
  unstable_rethrow: (error: { digest?: string }) => { if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error; },
}));
vi.mock("@/lib/session", () => ({
  createSession: mocks.createSession, destroySession: vi.fn(),
  hashToken: () => "hashed-token", newToken: () => "verification-token",
}));
vi.mock("@/lib/password", () => ({
  hashPassword: async () => "password-hash", verifyPassword: mocks.verifyPassword,
  passwordProblems: () => [],
}));
vi.mock("@/lib/api", () => ({ rateLimit: mocks.rateLimit }));

import { loginAction, registerAction } from "@/actions/auth";
import { authError } from "@/lib/auth-error";
import { GET as health } from "@/app/api/healthz/route";
import { proxy } from "@/proxy";

function form() {
  const data = new FormData();
  data.set("email", "test@example.com");
  data.set("password", "strong-password-123");
  data.set("displayName", "Test");
  return data;
}
function rows(value: object[]) {
  mocks.select.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => value }) }) });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.rateLimit.mockReturnValue(true);
  mocks.verifyPassword.mockResolvedValue(true);
  mocks.createSession.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("authentication actions", () => {
  it("keeps database failures inline for login instead of crashing the page", async () => {
    mocks.select.mockImplementation(() => { throw { cause: { code: "42P01" } }; });
    expect((await loginAction(null, form()))?.error).toContain("temporarily unavailable");
    expect(mocks.createSession).not.toHaveBeenCalled();
  });
  it("keeps database failures inline for signup", async () => {
    mocks.select.mockImplementation(() => { throw new Error("connection failed"); });
    expect((await registerAction(null, form()))?.error).toContain("temporarily unavailable");
  });
  it("preserves the success redirect after setting a session", async () => {
    rows([{ id: "user-id", passwordHash: "hash" }]);
    await expect(loginAction(null, form())).rejects.toMatchObject({ digest: "NEXT_REDIRECT;/dashboard" });
    expect(mocks.createSession).toHaveBeenCalledWith("user-id");
  });
  it("rejects incorrect credentials without setting a session", async () => {
    rows([{ id: "user-id", passwordHash: "hash" }]);
    mocks.verifyPassword.mockResolvedValue(false);
    expect((await loginAction(null, form()))?.error).toContain("didn't match");
    expect(mocks.createSession).not.toHaveBeenCalled();
  });
  it("handles session storage failures inline", async () => {
    rows([{ id: "user-id", passwordHash: "hash" }]);
    mocks.createSession.mockRejectedValue(new Error("session insert failed"));
    expect((await loginAction(null, form()))?.error).toContain("temporarily unavailable");
  });
  it("creates the user, verification token and session in one transaction", async () => {
    rows([]);
    const tx = { insert: vi.fn().mockReturnValue({ values: () => ({ returning: async () => [{ id: "user-id" }] }) }) };
    mocks.transaction.mockImplementation((fn) => fn(tx));
    await expect(registerAction(null, form())).rejects.toMatchObject({ digest: "NEXT_REDIRECT;/verify-email?token=verification-token&new=1" });
    expect(tx.insert).toHaveBeenCalledTimes(2);
    expect(mocks.createSession).toHaveBeenCalledWith("user-id", tx);
  });
  it("reports a duplicate signup race without exposing database details", async () => {
    rows([]);
    mocks.transaction.mockRejectedValue({ cause: { code: "23505" } });
    expect((await registerAction(null, form()))?.error).toContain("already exists");
  });
  it("keeps login rate limiting in place", async () => {
    mocks.rateLimit.mockReturnValue(false);
    expect((await loginAction(null, form()))?.error).toContain("Too many attempts");
    expect(mocks.select).not.toHaveBeenCalled();
  });
  it("does not log SQL or credentials from wrapped errors", () => {
    authError(new Error("SQL contains test@example.com and secret", { cause: { code: "42P01" } }));
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).toContain("42P01");
    expect(logged).not.toContain("test@example.com");
    expect(logged).not.toContain("secret");
  });
});

describe("stale sessions", () => {
  it.each(["/login", "/register"])("allows %s with an expired cookie", (path) => {
    const response = proxy(new NextRequest(`https://bloom.test${path}`, { headers: { cookie: "bloom_session=expired" } }));
    expect(response.headers.get("location")).toBeNull();
  });
  it("still redirects anonymous protected-page requests to login", () => {
    const response = proxy(new NextRequest("https://bloom.test/dashboard"));
    expect(response.headers.get("location")).toContain("/login?next=%2Fdashboard");
  });
});

describe("readiness", () => {
  it("reports success only after the auth-schema query succeeds", async () => {
    mocks.execute.mockResolvedValue({ rows: [] });
    const response = await health();
    expect(response.status).toBe(200);
    expect((await response.json()).database).toBe("connected");
  });
  it.each(["42P01", "ECONNREFUSED"])("fails readiness for %s", async (code) => {
    mocks.execute.mockRejectedValue({ code });
    const response = await health();
    expect(response.status).toBe(503);
    expect((await response.json()).status).toBe("unavailable");
  });
});
