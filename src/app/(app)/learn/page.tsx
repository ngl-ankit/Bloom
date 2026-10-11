import { EmptyState } from "@/components/ui";

export const metadata = { title: "Learn — Bloom" };

const ARTICLES = [
  {
    id: "cycle-basics",
    title: "Cycle basics: the four phases",
    readMinutes: 4,
    body: [
      "The menstrual cycle is usually counted from the first day of one period to the first day of the next. A typical range is anywhere from about 21 to 35 days for adults, and it commonly varies a few days month to month.",
      "Four phases are usually described: menstrual (the period itself), follicular (as the lining rebuilds and energy often returns), ovulation around mid-cycle (an egg is released — the timing can shift), and luteal (before the next period, when some people notice tenderness, tiredness, or mood shifts).",
      "Bloom's calendar shows phase-based care ideas, but phases after menstruation are approximations — ovulation timing can't be confirmed from period dates alone.",
    ],
  },
  {
    id: "pain",
    title: "Managing period pain: what generally helps",
    readMinutes: 5,
    body: [
      "Mild-to-moderate cramps are one of the most common menstrual experiences. Many people find warmth (a heating pad or warm bath), gentle movement, rest, hydration, and relaxation techniques helpful.",
      "Some people use over-the-counter pain relief — follow the label and your clinician's advice; Bloom never suggests doses or medications.",
      "Pain that is severe, sudden, very different from your usual pattern, or that stops you doing daily things deserves a healthcare professional's attention. Pain that doesn't improve with usual measures is worth asking about — help exists.",
    ],
  },
  {
    id: "tracking-better",
    title: "Getting the most from tracking",
    readMinutes: 3,
    body: [
      "Log your period's first day, and the last day when it ends — Bloom uses both to estimate flow duration and future dates.",
      "Add symptoms and mood on any day, not just period days: comparisons need 'ordinary days' too.",
      "After a few cycles, the Insights page starts showing your own patterns, always with the sample size used. If your cycles vary a lot, that's common — the confidence labels will say so plainly.",
    ],
  },
  {
    id: "when-to-see-a-doctor",
    title: "When it's time to see a clinician",
    readMinutes: 4,
    body: [
      "Consider booking an appointment if you notice: bleeding much heavier than usual (soaking protection hourly), bleeding between periods or after sex, periods lasting much longer than yours typically do, severe pelvic pain, fever with pelvic pain, or sudden changes that worry you.",
      "None of these are diagnoses — they're simply signs a professional should take a look. Bring your Bloom journal; a concrete log of dates and symptoms makes appointments easier.",
      "If you feel faint, dizzy with heavy bleeding, or something feels like an emergency, seek urgent care.",
    ],
  },
  {
    id: "cravings",
    title: "Cravings, kindly explained",
    readMinutes: 3,
    body: [
      "Cravings around the cycle are extremely common and there's no need to assign them a medical meaning. Food is also comfort, culture, and joy.",
      "Bloom never claims a specific craving is caused by a specific hormone. What it does: keeps your favorites handy, helps you share a hint with someone you trust, and reminds you that enjoying food is allowed.",
      "Balance, not rules: if something feels off in your eating overall, a clinician or dietitian is the right guide.",
    ],
  },
  {
    id: "supporting-someone",
    title: "Supporting someone you love",
    readMinutes: 4,
    body: [
      "The best support usually starts with listening, not fixing. Ask what would help: snacks? quiet? company?",
      "Respect the privacy settings they choose — seeing less than you'd like is the system working as they intended, not a slight.",
      "Small, practical gestures often mean the most: their favorite chocolate, an easy dinner, a warm water bottle, taking a task off their list.",
    ],
  },
];

export default function LearnPage() {
  return (
    <div className="rise">
      <h1 className="font-display text-3xl">Learn</h1>
      <p className="muted text-sm mt-1 mb-6">
        Calm, judgment-free explainers. General education only — never a diagnosis or a replacement for care.
      </p>
      {ARTICLES.length === 0 ? (
        <EmptyState icon="book" title="Library coming soon" body="Educational content will live here." />
      ) : (
        <div className="space-y-4">
          {ARTICLES.map((a) => (
            <details key={a.id} className="card p-6 group" id={a.id}>
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="font-display text-xl">{a.title}</span>
                <span className="badge-soft shrink-0">{a.readMinutes} min</span>
              </summary>
              <div className="prose-sm mt-4 space-y-3 text-sm muted">
                {a.body.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
