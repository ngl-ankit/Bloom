import Link from "next/link";

export const metadata = { title: "Privacy & Consent — Bloom" };

export default function PrivacyPage() {
  return (
    <main id="main" className="petal-bg min-h-dvh px-4 py-12">
      <div className="mx-auto max-w-3xl rise">
        <h1 className="font-display text-4xl mb-2">Privacy & Consent</h1>
        <p className="muted text-sm mb-8">Plain language, because your health data deserves clarity, not lawyers' fog.</p>

        <div className="card p-8 space-y-6">
          <section>
            <h2 className="font-display text-xl mb-2">What we collect</h2>
            <p className="text-sm muted">Your email, a display name, your timezone, and whatever you choose to record: period dates, symptoms, moods, cravings, comfort preferences, checklist items, and conversations with the AI companion. Nothing else. No analytics on health fields, no third-party trackers.</p>
          </section>
          <section>
            <h2 className="font-display text-xl mb-2">What stays private, always</h2>
            <p className="text-sm muted">Health records are isolated per account and are never exposed to other users, advertisers, or analytics. URLs never contain health data. Application logs exclude personal health information by design.</p>
          </section>
          <section>
            <h2 className="font-display text-xl mb-2">Sharing with a trusted person</h2>
            <p className="text-sm muted">Only if you invite someone and only for the categories you explicitly grant: period estimates, shareable cravings, symptom summaries, or care preferences. Every category defaults to private. Disconnecting revokes everything instantly. Pairing is always optional and reversible — the application deliberately cannot enable covert monitoring.</p>
          </section>
          <section>
            <h2 className="font-display text-xl mb-2">The AI companion</h2>
            <p className="text-sm muted">Conversations are sent to your configured AI provider (e.g., Grok via x.ai) so it can reply. Only the conversation text and minimal cycle statistics (average cycle/period length) are shared — never raw symptom logs unless you write them into a message yourself. Without a provider key, the companion runs in offline mode and nothing leaves the server.</p>
          </section>
          <section>
            <h2 className="font-display text-xl mb-2">Your controls</h2>
            <p className="text-sm muted">Export all of your data as JSON, or delete your account and every record in it, from Settings. Notifications can be tuned or silenced, with quiet hours respected. Verification and reset links expire; invitation links are single-use.</p>
          </section>
          <section>
            <h2 className="font-display text-xl mb-2">Security practices</h2>
            <p className="text-sm muted">Passwords are hashed (scrypt with per-user salts). Sessions use HTTP-only, same-site cookies over HTTPS in production. Databases use least-privilege rules; every API request is authorized server-side. In production, security headers including a strict Content-Security-Policy are applied.</p>
          </section>
          <section>
            <h2 className="font-display text-xl mb-2">Honest limitations</h2>
            <p className="text-sm muted">Bloom is a wellness tool, not a medical device, and makes no regulatory compliance claims (including GDPR or HIPAA) — those require legal review of your specific deployment. If you deploy Bloom yourself, you become the data controller and should review your obligations with qualified counsel. Backup/restore depends on your chosen database plan.</p>
          </section>
        </div>

        <div className="flex gap-3 mt-8 justify-center">
          <Link className="btn btn-secondary" href="/">Back home</Link>
        </div>
      </div>
    </main>
  );
}
