import { describe, expect, it } from "vitest";
import { DEFAULT_PERMISSIONS, effectivePermissions } from "../src/lib/permissions";
import { computeInsights } from "../src/lib/insights";

describe("permission model", () => {
  it("denies every category by default", () => {
    expect(Object.values(DEFAULT_PERMISSIONS).every((v) => v === false)).toBe(true);
  });
  it("denies everything when pairing is not active, even with stored grants", () => {
    const stored = { periodEstimates: true, cravings: true, symptoms: false, carePreferences: true };
    const revoked = effectivePermissions({ status: "disconnected", permissions: stored });
    const pending = effectivePermissions({ status: "pending", permissions: stored });
    expect(Object.values(revoked).every((v) => v === false)).toBe(true);
    expect(Object.values(pending).every((v) => v === false)).toBe(true);
  });
  it("passes through grants only for active pairings", () => {
    const stored = { periodEstimates: true, cravings: false, symptoms: false, carePreferences: false };
    expect(effectivePermissions({ status: "active", permissions: stored })).toEqual(stored);
  });
});

type FakeEntry = Parameters<typeof computeInsights>[0][number];

function entry(recordedOn: string, symptoms: string[], pain: number | null): FakeEntry {
  return {
    id: recordedOn, userId: "u", recordedOn, symptoms, pain,
    mood: null, energy: null, flow: null, comfortActions: [], comfortHelped: null,
    notes: null, createdAt: new Date(), updatedAt: new Date(),
  } as FakeEntry;
}

describe("insights", () => {
  const today = "2026-10-11";
  it("shows a starter card when there is little data", () => {
    const out = computeInsights([entry("2026-10-10", ["cramps"], 6)], [], today);
    expect(out[0].kind).toBe("summary");
    expect(out[0].sampleSize).toBe(1);
  });
  it("surfaces a recurring symptom with its sample size", () => {
    const entries = [
      entry("2026-10-01", ["cramps", "fatigue"], 6),
      entry("2026-10-02", ["cramps"], 5),
      entry("2026-10-03", ["headache"], 2),
    ];
    const out = computeInsights(entries, [], today);
    const cramps = out.find((i) => i.title.includes("cramps"));
    expect(cramps).toBeTruthy();
    expect(cramps!.sampleSize).toBe(3);
    expect(cramps!.detail).toContain("3 logged days");
  });
  it("always includes the non-diagnostic safety note last", () => {
    const entries = [
      entry("2026-10-01", ["cramps"], 6),
      entry("2026-10-02", ["cramps"], 5),
    ];
    const out = computeInsights(entries, [], today);
    expect(out[out.length - 1].kind).toBe("guidance");
    expect(out[out.length - 1].detail).toContain("not a diagnosis");
  });
});
