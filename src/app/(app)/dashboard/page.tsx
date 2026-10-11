import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { comfortProfile, journalEntries, periods } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { formatDateOnly, predictNextPeriod } from "@/lib/cycle";
import { computeInsights } from "@/lib/insights";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

const PHASE_TIPS = [
  { phase: "Menstrual", tip: "Rest counts as productivity today. Warmth, iron-rich food, and kindness help." },
  { phase: "Follicular", tip: "Energy often climbs in this phase — a good window for the stuff that needs momentum." },
  { phase: "Ovulation (approx.)", tip: "Mid-cycle days can bring peak energy. Hydrate and take that walk." },
  { phase: "Luteal", tip: "If you feel tender or tired, that's common. Snacks, warmth, and early nights are valid." },
];

function phaseFor(dayOfCycle: number | null, avgCycle: number | null): string {
  if (dayOfCycle === null || !avgCycle) return "Menstrual";
  if (dayOfCycle <= 5) return "Menstrual";
  if (avgCycle >= 21 && dayOfCycle >= Math.floor(avgCycle / 2) && dayOfCycle <= Math.floor(avgCycle / 2) + 2) return "Ovulation (approx.)";
  if (dayOfCycle > Math.floor(avgCycle / 2) + 2) return "Luteal";
  return "Follicular";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const today = formatDateOnly(new Date());

  const myPeriods = await db.select().from(periods).where(eq(periods.userId, user.id)).orderBy(desc(periods.startDate)).limit(12);
  const recentEntries = await db.select().from(journalEntries).where(eq(journalEntries.userId, user.id)).orderBy(desc(journalEntries.recordedOn)).limit(7);
  const profile = await db.select().from(comfortProfile).where(eq(comfortProfile.userId, user.id)).limit(1);

  const prediction = predictNextPeriod(myPeriods.map((p) => ({ startDate: p.startDate, endDate: p.endDate })), today);
  const insights = computeInsights(recentEntries, myPeriods, today).filter((i) => i.kind !== "guidance");
  const tip = PHASE_TIPS.find((t) => t.phase === phaseFor(prediction.dayOfCycle, prediction.averageCycleLength))!;

  const hasData = myPeriods.length > 0;

  return (
    <div className="rise">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-3xl">Hello, {user.displayName} 🌸</h1>
          <p className="muted text-sm mt-1">{new Date(`${today}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
        <div className="flex gap-2">
          <Link className="btn btn-secondary" href="/journal">Log today</Link>
          <Link className="btn btn-primary" href="/calendar">Calendar</Link>
        </div>
      </div>

      {!hasData ? (
        <EmptyState
          icon="🌱"
          title="Your cycle story starts here"
          body="Log your first period and Bloom will gently learn your rhythm — always privately, always editable."
          action={<Link className="btn btn-primary" href="/calendar">Log your first period</Link>}
        />
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          <section className="card p-6 md:col-span-2" aria-labelledby="cycle-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="cycle-card" className="font-display text-xl">Cycle overview</h2>
                {prediction.nextPeriodStart ? (
                  <>
                    <p className="text-3xl font-display mt-3" style={{ color: "rgb(var(--accent))" }}>
                      ~{prediction.nextPeriodStart}
                    </p>
                    <p className="muted text-sm mt-1">
                      Estimated next period · {prediction.dayOfCycle !== null ? `day ${prediction.dayOfCycle} of your cycle` : ""}
                    </p>
                    <span className="badge-soft mt-2 capitalize">Confidence: {prediction.confidence}</span>
                  </>
                ) : (
                  <p className="muted mt-3">Estimates appear after two recorded periods.</p>
                )}
              </div>
              <div className="text-right text-sm muted shrink-0">
                <p><strong className="text-[rgb(var(--ink))]">{prediction.averageCycleLength ?? "–"}</strong> day cycle</p>
                <p className="mt-1"><strong className="text-[rgb(var(--ink))]">{prediction.averagePeriodLength ?? "–"}</strong> day period</p>
              </div>
            </div>
            <p className="text-xs muted mt-4 border-t border-[rgb(var(--line))] pt-3">{prediction.confidenceNote} Estimates are never guarantees.</p>
          </section>

          <section className="card p-6" aria-labelledby="phase-card">
            <h2 id="phase-card" className="font-display text-xl">Today's care</h2>
            <p className="text-sm mt-3">{tip.tip}</p>
            <p className="text-xs muted mt-3">General wellness idea — not medical advice.</p>
            <Link className="btn btn-secondary w-full mt-4" href="/checklist">Open care checklist</Link>
          </section>

          <section className="card p-6 md:col-span-2" aria-labelledby="recent-card">
            <h2 id="recent-card" className="font-display text-xl mb-3">Recent journal days</h2>
            {recentEntries.length === 0 ? (
              <p className="muted text-sm">No journal entries yet. <Link href="/journal" className="underline">Log how today felt</Link>.</p>
            ) : (
              <ul className="space-y-2">
                {recentEntries.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 text-sm surface-2 rounded-xl px-3 py-2">
                    <span className="muted">{e.recordedOn}</span>
                    <span className="truncate">
                      {e.symptoms.length ? e.symptoms.map((s) => s.replace(/_/g, " ")).join(", ") : "No symptoms logged"}
                      {e.pain !== null ? ` · pain ${e.pain}/10` : ""}
                      {e.mood ? ` · ${e.mood}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-6" aria-labelledby="insight-card">
            <h2 id="insight-card" className="font-display text-xl mb-3">A gentle observation</h2>
            {insights.length ? (
              <>
                <p className="text-sm font-semibold">{insights[0].title}</p>
                <p className="muted text-sm mt-2">{insights[0].detail}</p>
                <Link className="text-sm underline mt-3 inline-block" href="/insights">See all insights</Link>
              </>
            ) : (
              <p className="muted text-sm">Insights appear as you log your days.</p>
            )}
          </section>

          {profile[0]?.allergies?.length ? (
            <p className="text-xs muted md:col-span-3">Allergies on file (used only for care suggestions): {profile[0].allergies.join(", ")}.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
