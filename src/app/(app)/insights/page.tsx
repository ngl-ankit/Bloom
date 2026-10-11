import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { journalEntries, periods } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { formatDateOnly, predictNextPeriod } from "@/lib/cycle";
import { computeInsights } from "@/lib/insights";
import { EmptyState } from "@/components/ui";
import { InsightsCharts } from "./charts";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const user = await requireUser();
  const today = formatDateOnly(new Date());
  const myPeriods = await db.select().from(periods).where(eq(periods.userId, user.id)).orderBy(desc(periods.startDate)).limit(12);
  const entries = await db.select().from(journalEntries).where(eq(journalEntries.userId, user.id)).orderBy(desc(journalEntries.recordedOn)).limit(90);

  const asc = [...entries].reverse();
  const spans = myPeriods.map((p) => ({ startDate: p.startDate, endDate: p.endDate }));
  const prediction = predictNextPeriod(spans, today);

  return (
    <div className="rise">
      <h1 className="font-display text-3xl">Insights</h1>
      <p className="muted text-sm mt-1 mb-6">Every insight below is computed from your own saved records — never from assumptions about your body.</p>

      {entries.length === 0 && myPeriods.length === 0 ? (
        <EmptyState icon="📈" title="Insights bloom with data" body="Log a few days and a couple of periods, and honest patterns — with their sample sizes — will appear here." />
      ) : (
        <div className="space-y-4">
          <section className="card p-6">
            <h2 className="font-display text-xl mb-4">Cycle patterns</h2>
            <InsightsCharts
              cycleLengths={(() => {
                const ascSpans = [...spans].reverse(); // periods arrive newest-first
                return ascSpans.length >= 2
                  ? ascSpans
                      .slice(0, -1)
                      .map((s, i) => ({
                          start: s.startDate,
                          length: Math.round((new Date(ascSpans[i + 1].startDate).getTime() - new Date(s.startDate).getTime()) / 86400000),
                        }))
                      .filter((x) => x.length >= 15 && x.length <= 60)
                  : [];
              })()}
              painByDay={asc.filter((e) => e.pain !== null).map((e) => ({ date: e.recordedOn, pain: e.pain! }))}
              avgCycle={prediction.averageCycleLength}
              avgPeriod={prediction.averagePeriodLength}
            />
          </section>

          <section aria-label="Observations" className="space-y-3">
            {computeInsights(entries, myPeriods, today).map((i, idx) => (
              <article key={idx} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold">{i.title}</h3>
                  <span className="badge-soft shrink-0">{i.kind === "guidance" ? "always here" : i.kind}</span>
                </div>
                <p className="muted text-sm mt-2">{i.detail}</p>
              </article>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
