import Link from "next/link";
import { getCurrentUser } from "@/lib/session";

const FAQS = [
  {
    q: "Is my data private?",
    a: "Yes. Your cycle logs, symptoms, moods, and conversations are yours alone. Nothing is shared with anyone unless you explicitly allow it — pairing is optional, permission-by-permission, and reversible at any moment. You can export or permanently delete all of your data from Settings.",
  },
  {
    q: "Do I need a partner or friend to use Bloom?",
    a: "Not at all. Most people use Bloom fully independently. Inviting a trusted person is entirely your choice, and even then you decide exactly which categories they can see — period estimates, cravings, symptoms, or care preferences — with everything private by default.",
  },
  {
    q: "Are the period predictions guaranteed?",
    a: "No. Predictions are estimates calculated from the history you log, with an honest confidence level shown. Cycles naturally vary, and Bloom will never present an estimate as a certainty.",
  },
  {
    q: "Is the AI companion a doctor?",
    a: "No. The companion offers general wellness information, empathetic listening, and help reflecting on your own logged patterns. It never diagnoses, never prescribes, and will point you toward healthcare professionals when something deserves medical attention.",
  },
  {
    q: "What if I don't want to share sensitive details to sign up?",
    a: "Registration only asks for an email, password, and the name you'd like to be called. Cycle details, symptoms, and preferences are always optional and always editable.",
  },
];

const FEATURES = [
  { icon: "🌸", title: "Cycle tracking that respects reality", body: "Log periods with flow and notes, edit anything, and see estimates that show their confidence honestly — never invented certainty." },
  { icon: "📝", title: "A journal that listens", body: "Record symptoms, pain, mood, and energy in seconds. Watch patterns emerge from your own data, with sample sizes shown." },
  { icon: "🤍", title: "A companion who gets it", body: "Talk through cravings, cramps, or feelings with an empathetic AI that knows its limits — available whenever you need it." },
  { icon: "🍫", title: "Cravings, honored", body: "Save favorite snacks, drinks, and comforts. Log a craving privately, or share it with someone you trust." },
  { icon: "🤝", title: "Care, together (if you want)", body: "Invite a partner or best friend with a secure, expiring invitation. Share only what you choose, revoke anytime." },
  { icon: "🔔", title: "Gentle reminders", body: "Discreet nudges before your estimated period, supply restocks, and care checklists — with quiet hours and full control." },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  return (
    <div>
      <header className="sticky top-0 z-40 border-b border-[rgb(var(--line))] bg-[rgb(var(--surface))]">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <span className="font-display text-2xl" style={{ color: "rgb(var(--accent))" }}>Bloom</span>
          <nav className="flex items-center gap-2" aria-label="Account">
            {user ? (
              <Link className="btn btn-primary" href="/dashboard">Open Bloom</Link>
            ) : (
              <>
                <Link className="btn btn-ghost" href="/login">Sign in</Link>
                <Link className="btn btn-primary" href="/register">Get started</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="hero px-4" aria-labelledby="hero-title">
          <div className="mx-auto max-w-6xl py-20 text-center">
            <p className="badge-soft mx-auto">Private · Supportive · Yours</p>
            <h1 id="hero-title" className="font-display text-4xl md:text-6xl leading-tight mt-4">
              Your cycle, <em style={{ color: "rgb(var(--accent))" }}>understood</em> —<br className="hidden md:block" /> and gently cared for.
            </h1>
            <p className="muted max-w-2xl mx-auto mt-5 text-base md:text-lg">
              Bloom brings your period tracking, symptom journal, comfort cravings, and an empathetic
              wellness companion into one private place — with optional care-sharing for someone you trust.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <Link className="btn btn-primary text-base px-7" href={user ? "/dashboard" : "/register"}>
                {user ? "Open Bloom" : "Create your space"}
              </Link>
              <Link className="btn btn-secondary text-base px-7" href="#learn-more">See what's inside</Link>
            </div>
            <p className="text-xs muted mt-5">No health details required to sign up · Your records stay yours</p>
          </div>
        </section>

        <section id="learn-more" className="px-4 py-20" aria-labelledby="features-title">
          <div className="mx-auto max-w-6xl">
            <h2 id="features-title" className="font-display text-3xl md:text-4xl text-center">Everything your cycle deserves</h2>
            <p className="muted text-center mt-3 max-w-xl mx-auto">Built for real life — whether you track every detail or just want a little more ease this week.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
              {FEATURES.map((f) => (
                <article key={f.title} className="card p-6 rise">
                  <span className="feature-icon" aria-hidden>{f.icon}</span>
                  <h3 className="font-display text-lg mt-4">{f.title}</h3>
                  <p className="muted text-sm mt-2">{f.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-20" aria-labelledby="privacy-title">
          <div className="mx-auto max-w-4xl card p-8 md:p-12">
            <h2 id="privacy-title" className="font-display text-3xl">Privacy, promised plainly</h2>
            <ul className="mt-6 space-y-4">
              {[
                ["Your health data is isolated", "Period logs, symptoms, and conversations are stored per-account and never exposed to other users — paired or not."],
                ["Sharing only ever explicit", "A trusted person sees a category only after you grant it, and the moment you disconnect, access ends."],
                ["No health data in URLs or logs", "What you record is never used for analytics or left in application logs."],
                ["Export and delete, anytime", "Download everything you've written, or erase your account permanently — no dark patterns."],
                ["Honest about AI", "The companion is optional, clearly labeled, and works from a private, minimal context. Without an AI key, Bloom still works fully."],
              ].map(([t, b]) => (
                <li key={t} className="timeline-item">
                  <h3 className="font-semibold text-sm">{t}</h3>
                  <p className="muted text-sm mt-0.5">{b}</p>
                </li>
              ))}
            </ul>
            <p className="text-xs muted mt-6">For the complete detail, read the <Link href="/privacy" className="underline">Privacy & Consent notice</Link>.</p>
          </div>
        </section>

        <section className="px-4 pb-24" aria-labelledby="faq-title">
          <div className="mx-auto max-w-3xl">
            <h2 id="faq-title" className="font-display text-3xl text-center">Questions, answered</h2>
            <div className="mt-8 space-y-3">
              {FAQS.map((f) => (
                <details key={f.q} className="card p-5 group">
                  <summary className="font-semibold cursor-pointer list-none flex items-center justify-between">
                    {f.q}
                    <span aria-hidden className="muted group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="muted text-sm mt-3">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-24">
          <div className="mx-auto max-w-3xl card p-10 text-center">
            <h2 className="font-display text-3xl">Begin, gently.</h2>
            <p className="muted mt-3">Set up in two minutes. Change everything later.</p>
            <Link className="btn btn-primary text-base px-8 mt-6" href={user ? "/dashboard" : "/register"}>
              {user ? "Open Bloom" : "Create your space"}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[rgb(var(--line))] px-4 py-10">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4 text-sm muted">
          <span className="font-display text-lg" style={{ color: "rgb(var(--accent))" }}>Bloom</span>
          <nav className="flex gap-4" aria-label="Footer">
            <Link href="/privacy" className="hover:underline">Privacy & Consent</Link>
            <Link href="/login" className="hover:underline">Sign in</Link>
            <Link href="/register" className="hover:underline">Register</Link>
          </nav>
          <p>Bloom offers general wellness information, not medical advice.</p>
        </div>
      </footer>
    </div>
  );
}
