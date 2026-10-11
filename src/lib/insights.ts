/**
 * Transparent, data-derived insights. Every insight states its sample size and
 * limitations. NEVER diagnostic — educational observations only.
 */
import type { JournalEntry, Period } from "@/db/schema";
import { cycleLengths, diffDays, mean, stdev } from "./cycle";

export type Insight = {
  title: string;
  detail: string;
  sampleSize: number;
  kind: "pattern" | "summary" | "guidance";
};

const SYMPTOM_LABELS: Record<string, string> = {
  cramps: "cramps",
  headache: "headaches",
  bloating: "bloating",
  fatigue: "fatigue",
  acne: "acne",
  backache: "backache",
  nausea: "nausea",
  breast_tenderness: "breast tenderness",
  dizziness: "dizziness",
  insomnia: "trouble sleeping",
  diarrhea: "digestive upset",
  constipation: "constipation",
};

export function computeInsights(
  entries: JournalEntry[],
  periods: Period[],
  today: string,
): Insight[] {
  const insights: Insight[] = [];
  if (entries.length < 2) {
    insights.push({
      kind: "summary",
      title: "Your insights grow with each entry",
      detail:
        "Log a few days of symptoms and mood, and patterns will start appearing here — always based only on the data you recorded, with sample sizes shown.",
      sampleSize: entries.length,
    });
    return insights;
  }

  // Most frequent symptoms
  const counts = new Map<string, number>();
  for (const e of entries) for (const s of e.symptoms) counts.set(s, (counts.get(s) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  for (const [symptom, count] of top) {
    if (count >= 2 && count / entries.length >= 0.25) {
      insights.push({
        kind: "pattern",
        title: `You often log ${SYMPTOM_LABELS[symptom] ?? symptom}`,
        detail: `Recorded on ${count} of ${entries.length} logged days. This reflects what you've recorded so far — if a symptom is severe, worsening, or new, it's worth mentioning to a healthcare professional.`,
        sampleSize: entries.length,
      });
    }
  }

  // Average pain on period days vs other days (of recorded data)
  const periodDays = new Set<string>();
  for (const p of periods) {
    const end = p.endDate ?? p.startDate;
    for (let d = p.startDate; d <= end; d = addDay(d)) periodDays.add(d);
  }
  const painOn = entries.filter((e) => e.pain !== null && periodDays.has(e.recordedOn));
  const painOff = entries.filter((e) => e.pain !== null && !periodDays.has(e.recordedOn));
  const avgOn = mean(painOn.map((e) => e.pain!));
  const avgOff = mean(painOff.map((e) => e.pain!));
  if (avgOn !== null && avgOff !== null && painOn.length >= 2 && painOff.length >= 2 && avgOn > avgOff + 0.5) {
    insights.push({
      kind: "pattern",
      title: "Discomfort tends to be higher on period days",
      detail: `Your logged pain averages ${avgOn.toFixed(1)}/10 on recorded period days vs ${avgOff.toFixed(1)}/10 on other logged days (based on ${painOn.length} and ${painOff.length} entries).`,
      sampleSize: painOn.length + painOff.length,
    });
  }

  // Cycle regularity
  const lens = cycleLengths(periods.map((p) => ({ startDate: p.startDate, endDate: p.endDate })));
  if (lens.length >= 2) {
    const avg = mean(lens)!;
    const sd = stdev(lens);
    insights.push({
      kind: "summary",
      title: `Your recent cycles average about ${Math.round(avg)} days`,
      detail:
        sd !== null && sd > 7
          ? `Cycle lengths varied quite a bit (typical spread ±${sd.toFixed(1)} days across ${lens.length} cycles). Variation is common — estimates will stay rough until patterns settle.`
          : `Across ${lens.length} recorded cycles, lengths were fairly consistent (spread ±${sd?.toFixed(1) ?? "?"} days). Remember estimates are never guarantees.`,
      sampleSize: lens.length,
    });
  }

  // Comfort actions that helped
  const helped = entries.filter((e) => e.comfortHelped === true && e.comfortActions.length > 0);
  if (helped.length >= 1) {
    const actions = new Map<string, number>();
    for (const e of helped) for (const a of e.comfortActions) actions.set(a, (actions.get(a) ?? 0) + 1);
    const best = [...actions.entries()].sort((a, b) => b[1] - a[1])[0];
    if (best) {
      insights.push({
        kind: "pattern",
        title: `“${best[0]}” helped you before`,
        detail: `You marked it as helpful on ${best[1]} logged day(s). Your care ideas are saved in Comfort & Cravings too.`,
        sampleSize: helped.length,
      });
    }
  }

  // Gentle guidance if nothing notable yet
  if (insights.length <= 1) {
    insights.push({
      kind: "summary",
      title: "Keep logging — patterns need a little data",
      detail: `You have ${entries.length} logged days so far. A few weeks of entries (including non-period days) makes comparisons much more meaningful.`,
      sampleSize: entries.length,
    });
  }

  // Fixed safety note, always last
  insights.push({
    kind: "guidance",
    title: "When to seek medical care",
    detail:
      "These insights describe your own records only — they are not a diagnosis. Consider seeing a healthcare professional if you experience very heavy bleeding, severe or suddenly different pain, bleeding between periods, fever with pelvic pain, or anything that worries you.",
    sampleSize: 0,
  });

  return insights;
}

function addDay(d: string): string {
  const dt = new Date(`${d}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}
