import { describe, expect, it } from "vitest";
import {
  addDays, cycleLengths, diffDays, isReminderDue, periodLengths,
  predictNextPeriod, stdev,
} from "../src/lib/cycle";

const D = (s: string) => ({ startDate: s, endDate: null as string | null });

describe("date helpers", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-01-30", 3)).toBe("2026-02-02");
    expect(addDays("2025-12-30", 7)).toBe("2026-01-06");
    expect(diffDays("2026-03-01", "2026-02-28")).toBe(1);
  });
});

describe("cycleLengths", () => {
  it("computes gaps between consecutive starts", () => {
    const lens = cycleLengths([D("2026-01-01"), D("2026-01-29"), D("2026-02-26")]);
    expect(lens).toEqual([28, 28]);
  });
  it("ignores implausible gaps (<15 or >60 days)", () => {
    const lens = cycleLengths([D("2026-01-01"), D("2026-01-05"), D("2026-04-01"), D("2026-04-29")]);
    expect(lens).toEqual([28]);
  });
});

describe("periodLengths", () => {
  it("counts inclusive duration for closed spans", () => {
    expect(periodLengths([{ startDate: "2026-01-01", endDate: "2026-01-05" }], "2026-02-01")).toEqual([5]);
  });
  it("ignores implausible durations (>14 days)", () => {
    expect(periodLengths([{ startDate: "2026-01-01", endDate: "2026-02-01" }], "2026-02-01")).toEqual([]);
  });
});

describe("predictNextPeriod", () => {
  it("returns null prediction with no history", () => {
    const p = predictNextPeriod([], "2026-10-11");
    expect(p.nextPeriodStart).toBeNull();
    expect(p.confidence).toBe("low");
  });
  it("predicts from two consistent cycles with low confidence", () => {
    const spans = [D("2026-09-13"), D("2026-10-11")];
    const p = predictNextPeriod(spans, "2026-10-11");
    expect(p.nextPeriodStart).toBe("2026-11-08");
    expect(p.confidence).toBe("low");
  });
  it("gains confidence with consistent history", () => {
    const spans = ["2026-06-14", "2026-07-12", "2026-08-09", "2026-09-06", "2026-10-04"].map(D);
    const p = predictNextPeriod(spans, "2026-10-11");
    expect(p.nextPeriodStart).toBe("2026-11-01");
    expect(p.confidence).toBe("high");
    expect(p.dayOfCycle).toBe(8);
  });
  it("stays low-confidence for erratic cycles", () => {
    const spans = ["2026-07-01", "2026-07-20", "2026-08-18", "2026-09-29"].map(D);
    const p = predictNextPeriod(spans, "2026-10-11");
    expect(p.confidence).toBe("low");
  });
});

describe("isReminderDue", () => {
  const p = { ...predictNextPeriod([D("2026-09-13"), D("2026-10-11")], "2026-10-11") };
  it("fires inside the window", () => {
    expect(isReminderDue(p, "2026-11-06", 2)).toBe(true);
    expect(isReminderDue(p, "2026-11-08", 2)).toBe(true);
  });
  it("stays quiet outside the window", () => {
    expect(isReminderDue(p, "2026-11-05", 2)).toBe(false);
    expect(isReminderDue(p, "2026-11-10", 2)).toBe(false);
  });
});

describe("stdev", () => {
  it("is null for fewer than two samples", () => {
    expect(stdev([5])).toBeNull();
  });
  it("measures spread", () => {
    expect(stdev([28, 28, 28])).toBe(0);
  });
});
