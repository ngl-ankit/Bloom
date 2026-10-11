/**
 * Deterministic cycle-math engine. Pure functions, no LLM, timezone-safe:
 * all dates are date-only strings "YYYY-MM-DD" parsed as UTC.
 */

export type PeriodSpan = { startDate: string; endDate: string | null };

export type PredictionConfidence = "low" | "medium" | "high";

export type CyclePrediction = {
  nextPeriodStart: string | null;
  averageCycleLength: number | null;
  averagePeriodLength: number | null;
  dayOfCycle: number | null;
  cycleLengthStdDev: number | null;
  confidence: PredictionConfidence;
  confidenceNote: string;
};

export function parseDateOnly(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) throw new Error(`Invalid date-only string: ${s}`);
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${s}`);
  return d;
}

export function formatDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(s: string, days: number): string {
  const d = parseDateOnly(s);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDateOnly(d);
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseDateOnly(a).getTime() - parseDateOnly(b).getTime()) / 86400000);
}

/** Sort spans ascending by start date; must already be validated upstream. */
function sorted(spans: PeriodSpan[]): PeriodSpan[] {
  return [...spans].sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/**
 * Cycle lengths between consecutive starts. Ignores biologically implausible
 * gaps (< 15 or > 60 days) so a long tracking hiatus doesn't poison averages.
 */
export function cycleLengths(spans: PeriodSpan[]): number[] {
  const s = sorted(spans);
  const out: number[] = [];
  for (let i = 1; i < s.length; i++) {
    const len = diffDays(s[i].startDate, s[i - 1].startDate);
    if (len >= 15 && len <= 60) out.push(len);
  }
  return out;
}

/** Observed period durations (1..14 days); open-ended spans count days since start, capped. */
export function periodLengths(spans: PeriodSpan[], today: string): number[] {
  return sorted(spans)
    .map((p) => {
      const end = p.endDate ?? (diffDays(today, p.startDate) >= 0 ? today : null);
      if (!end) return null;
      const len = diffDays(end, p.startDate) + 1;
      return len >= 1 && len <= 14 ? len : null;
    })
    .filter((n): n is number => n !== null);
}

export function mean(xs: number[]): number | null {
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Population standard deviation. */
export function stdev(xs: number[]): number | null {
  if (xs.length < 2) return null;
  const m = mean(xs)!;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
}

/**
 * Predict the next period from history. NEVER a guarantee — the caller must
 * label this as an estimate. Confidence reflects sample size and variability.
 */
export function predictNextPeriod(spans: PeriodSpan[], today: string): CyclePrediction {
  const s = sorted(spans);
  if (s.length === 0) {
    return {
      nextPeriodStart: null,
      averageCycleLength: null,
      averagePeriodLength: null,
      dayOfCycle: null,
      cycleLengthStdDev: null,
      confidence: "low",
      confidenceNote: "No recorded periods yet — log your first period to unlock estimates.",
    };
  }

  const lens = cycleLengths(spans);
  const avgCycle = mean(lens);
  const avgPeriod = mean(periodLengths(spans, today));
  const sd = stdev(lens);

  const last = s[s.length - 1];
  const anchor =
    diffDays(today, last.startDate) >= 0 ? last.startDate : s[s.length - 1].startDate;
  const lastPeriodLen = periodLengths([last], today)[0] ?? Math.round(avgPeriod ?? 5);
  const nextFromLast = addDays(last.startDate, Math.round(avgCycle ?? 28));

  const nextPeriodStart = diffDays(nextFromLast, today) < -60 ? null : nextFromLast;
  const dayOfCycle = diffDays(today, anchor) + 1 > 0 ? diffDays(today, anchor) + 1 : null;

  let confidence: PredictionConfidence = "low";
  let note: string;
  if (avgCycle === null || nextPeriodStart === null) {
    note = "Estimates need at least two recorded periods with a plausible gap between them.";
  } else if (s.length < 3 || sd === null || sd > 9) {
    confidence = "low";
    note = "Based on limited or irregular history — treat this as a rough estimate.";
  } else if (s.length < 5 || sd > 4) {
    confidence = "medium";
    note = "Reasonable estimate from your history; cycles vary naturally by a few days.";
  } else {
    confidence = "high";
    note = "Based on consistent recent cycles — still an estimate, not a guarantee.";
  }

  return {
    nextPeriodStart,
    averageCycleLength: avgCycle === null ? null : Math.round(avgCycle),
    averagePeriodLength: avgPeriod === null ? null : Math.round(avgPeriod),
    dayOfCycle,
    cycleLengthStdDev: sd === null ? null : Math.round(sd * 10) / 10,
    confidence,
    confidenceNote: note,
  };
}

/** Upcoming-period window for reminders: today is within [start-minsBefore, start]. */
export function isReminderDue(prediction: CyclePrediction, today: string, daysBefore: number): boolean {
  if (!prediction.nextPeriodStart) return false;
  const windowStart = addDays(prediction.nextPeriodStart, -daysBefore);
  const t = diffDays(today, windowStart);
  return t >= 0 && diffDays(prediction.nextPeriodStart, today) >= 0;
}
