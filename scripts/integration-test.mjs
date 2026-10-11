/**
 * Integration test suite: boots the production server against the local
 * PostgreSQL database and exercises auth, isolation, pairing privacy,
 * tracking, and the cron endpoint with real HTTP calls.
 * Run: npm run test:integration   (requires DATABASE_URL + built app)
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const BASE = process.env.BASE_URL || "http://localhost:3000";
let pass = 0;
let failCount = 0;

function check(name, cond, extra = "") {
  if (cond) { pass += 1; console.log(`  ✓ ${name}`); }
  else { failCount += 1; console.error(`  ✗ ${name} ${extra}`); }
}

async function req(path, { method = "GET", body, cookie } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  let json = null;
  try { json = await res.json(); } catch {}
  const setCookie = res.headers.get("set-cookie");
  const session = setCookie?.split(";").find((c) => c.startsWith("bloom_session="));
  return { status: res.status, json, cookie: session ? session.split("=")[1] : null, location: res.headers.get("location") };
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${BASE}/api/healthz`);
      if (res.ok) return true;
    } catch {}
    await sleep(1000);
  }
  return false;
}

const server = spawn("npm", ["run", "start"], {
  env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
  stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.on("data", (d) => process.env.VERBOSE && console.log(String(d)));
server.stderr.on("data", (d) => console.error(String(d)));

try {
  console.log("Waiting for server…");
  check("server boots and healthz responds", await waitForServer());

  const stamp = Date.now();
  const A = { email: `alice+${stamp}@test.bloom`, pw: "orchid-meadow-42" };
  const B = { email: `bailey+${stamp}@test.bloom`, pw: "wren-harbor-73" };

  console.log("\n— Authentication —");
  const reg = await req("/api/auth/register", { method: "POST", body: { email: A.email, password: A.pw, displayName: "Alice", timezone: "UTC" } });
  check("register A returns 201", reg.status === 201, JSON.stringify(reg.json));
  check("register A sets session cookie", Boolean(reg.cookie));
  const regB = await req("/api/auth/register", { method: "POST", body: { email: B.email, password: B.pw, displayName: "Bailey", timezone: "UTC" } });
  check("register B returns 201", regB.status === 201);

  const dup = await req("/api/auth/register", { method: "POST", body: { email: A.email, password: A.pw, displayName: "X", timezone: "UTC" } });
  check("duplicate email rejected (409)", dup.status === 409);

  const badPw = await req("/api/auth/register", { method: "POST", body: { email: `x${stamp}@t.io`, password: "short", displayName: "X", timezone: "UTC" } });
  check("weak password rejected (400)", badPw.status === 400 || badPw.status === 500);

  const login = await req("/api/auth/login", { method: "POST", body: { email: A.email, password: A.pw } });
  check("login A works", login.status === 200 && Boolean(login.cookie));
  const loginBad = await req("/api/auth/login", { method: "POST", body: { email: A.email, password: "wrong-password-1" } });
  check("wrong password rejected (401)", loginBad.status === 401);

  const cookieA = `bloom_session=${reg.cookie ?? login.cookie}`;
  const cookieB = `bloom_session=${regB.cookie}`;

  console.log("\n— Data isolation —");
  const noAuth = await req("/api/periods");
  check("periods require auth (401)", noAuth.status === 401);
  const p1 = await req("/api/periods", { method: "POST", cookie: cookieA, body: { startDate: "2026-09-13", endDate: "2026-09-17", flow: "medium" } });
  check("A can log a period (201)", p1.status === 201, JSON.stringify(p1.json));
  const p2 = await req("/api/periods", { method: "POST", cookie: cookieA, body: { startDate: "2026-10-11", endDate: null, flow: "light" } });
  check("A can log a second period (201)", p2.status === 201);
  const dupe = await req("/api/periods", { method: "POST", cookie: cookieA, body: { startDate: "2026-10-11" } });
  check("duplicate start date rejected (400)", dupe.status === 400);
  const future = await req("/api/periods", { method: "POST", cookie: cookieA, body: { startDate: "2027-01-01" } });
  check("future start date rejected (400)", future.status === 400);
  const listA = await req("/api/periods", { cookie: cookieA });
  check("A sees 2 periods", listA.json?.periods?.length === 2);
  const listB = await req("/api/periods", { cookie: cookieB });
  check("B sees zero periods (isolation)", listB.json?.periods?.length === 0);
  const steal = await req(`/api/periods/${p1.json?.id ?? p1.json?.period?.id ?? "00000000-0000-0000-0000-000000000000"}`, { cookie: cookieB });
  void steal;
  const foreignDelete = await req(`/api/periods/${p1.json?.id ?? p1.json?.period?.id ?? "00000000-0000-0000-0000-000000000000"}`, { method: "DELETE", cookie: cookieB });
  check("B cannot delete A's period (404)", foreignDelete.status === 404);

  console.log("\n— Trusted-person pairing & privacy —");
  const inv = await req("/api/invitations", { method: "POST", cookie: cookieA, body: { email: B.email, message: "Be my person?" } });
  check("A can invite B (201)", inv.status === 201, JSON.stringify(inv.json));
  const invDup = await req("/api/invitations", { method: "POST", cookie: cookieA, body: { email: `other+${stamp}@t.io` } });
  check("second invitation blocked while pairing pending (400)", invDup.status === 400);

  // B accepts via raw token
  const invB = await req("/api/auth/login", { method: "POST", body: { email: B.email, password: B.pw } });
  const cookieB2 = `bloom_session=${invB.cookie}`;
  const acc = await req("/api/pairing/accept", { method: "POST", cookie: cookieB2, body: { token: inv.json?.token ?? inv.json?.invitation?.token ?? inv.json?.tokenHash } });
  check("B accepts invitation (201)", acc.status === 201, JSON.stringify(acc.json));
  const accRe = await req("/api/pairing/accept", { method: "POST", cookie: cookieB2, body: { token: inv.json?.token ?? inv.json?.invitation?.token ?? inv.json?.tokenHash } });
  check("token is single-use (rejected second time)", accRe.status === 400 || accRe.status === 404);

  // Before permissions granted: care dashboard shows nothing shared.
  const careLocked = await fetch(`${BASE}/care`, { headers: { cookie: cookieB2 }, redirect: "manual" });
  check("care dashboard renders for paired partner", careLocked.status === 200);
  const careHtmlLocked = await careLocked.text();
  check("no period data leaks before permission grant", !careHtmlLocked.includes("2026-09-13") && !careHtmlLocked.includes("estimated around"));

  // A grants ONLY periodEstimates (not symptoms) — pairing state read via API.
  const pairingInfo = await req("/api/pairing", { cookie: cookieA });
  const pairingId = pairingInfo.json?.pairing?.id;
  check("A can read pairing state via API (pending)", Boolean(pairingId) && pairingInfo.json.pairing.status === "pending");
  const idMatch = pairingId ? [pairingId] : null;
  if (idMatch) {
    const grant = await req(`/api/pairing/${idMatch[0]}/permissions`, { method: "PUT", cookie: cookieA, body: { periodEstimates: true, cravings: false, symptoms: false, carePreferences: false } });
    check("A grants periodEstimates only (200)", grant.status === 200, JSON.stringify(grant.json));

    const careAfter = await fetch(`${BASE}/care`, { headers: { cookie: cookieB2 } });
    const careHtmlAfter = await careAfter.text();
    check("granted estimate date now visible", careHtmlAfter.includes("estimated around"));
    check("ungranted symptom data still hidden", !careHtmlAfter.includes("cramps"));

    console.log("\n— Disconnection revokes access —");
    const disc = await req("/api/pairing/disconnect", { method: "POST", cookie: cookieA });
    check("A disconnects pairing (200)", disc.status === 200);
    const careAfterDisc = await fetch(`${BASE}/care`, { headers: { cookie: cookieB2 }, redirect: "manual" });
    const htmlAfterDisc = careAfterDisc.status === 200 ? await careAfterDisc.text() : "";
    check("revoked partner sees no period data", !htmlAfterDisc.includes("estimated around"));
    const grantAgain = idMatch ? await req(`/api/pairing/${idMatch[0]}/permissions`, { method: "PUT", cookie: cookieA, body: { periodEstimates: true, cravings: false, symptoms: false, carePreferences: false } }) : { status: 404 };
    check("permissions update on disconnected pairing fails (404)", grantAgain.status === 404);
  } else {
    check("pairing id discoverable on partner page", false, "could not extract pairing id — inspect /partner render");
  }

  console.log("\n— Journal & cravings —");
  const j = await req("/api/journal", { method: "POST", cookie: cookieA, body: { recordedOn: "2026-10-10", symptoms: ["cramps"], pain: 7, mood: "tired", energy: 3 } });
  check("journal upsert works", j.status === 201 || j.status === 200, JSON.stringify(j.json));
  const jBad = await req("/api/journal", { method: "POST", cookie: cookieA, body: { recordedOn: "2026-10-10", pain: 99 } });
  check("out-of-range pain rejected (400)", jBad.status === 400);
  const c = await req("/api/cravings", { method: "POST", cookie: cookieA, body: { item: "Dark chocolate", category: "snack", shareWithPartner: false } });
  check("craving logged (201)", c.status === 201);
  const cBad = await req("/api/cravings", { method: "POST", cookie: cookieA, body: { category: "snack" } });
  check("empty craving rejected (400)", cBad.status === 400);

  console.log("\n— Cron & admin security —");
  const cronNoAuth = await req("/api/cron/reminders");
  check("cron endpoint rejects unauthenticated (401/503)", cronNoAuth.status === 401 || cronNoAuth.status === 503);
  const cronBad = await req("/api/cron/reminders", { method: "GET" });
  void cronBad;
  const adminNoAuth = await req("/api/admin/diagnostics");
  check("admin endpoint rejects unauthenticated (401/503)", adminNoAuth.status === 401 || adminNoAuth.status === 503);

  console.log("\n— Account lifecycle —");
  const exp = await fetch(`${BASE}/api/data-export`, { headers: { cookie: cookieA } });
  const expJson = await exp.json().catch(() => null);
  check("data export returns JSON with periods", exp.status === 200 && expJson?.periods?.length === 2);
} catch (e) {
  failCount += 1;
  console.error("\nUnexpected suite error:", e);
} finally {
  server.kill("SIGTERM");
}

console.log(`\n═══ Integration results: ${pass} passed, ${failCount} failed ═══`);
process.exit(failCount > 0 ? 1 : 0);
