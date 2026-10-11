"use client";

import { EmptyState } from "@/components/ui";

type Perms = { periodEstimates: boolean; cravings: boolean; symptoms: boolean; carePreferences: boolean };
type View = {
  periodEstimates: { nextPeriodStart: string | null; confidence: string; confidenceNote: string; averageCycleLength: number | null } | null;
  cravings: { id: string; item: string; category: string }[] | null;
  symptoms: { recordedOn: string; symptoms: string[]; pain: number | null; mood: string | null }[] | null;
  carePreferences: { favoriteSnacks: string[]; comfortActivities: string[]; dislikes: string[]; allergies: string[]; preferredSupport: string | null } | null;
};

const IDEAS = [
  "A warm drink and an unhurried chat",
  "Their favorite snack, no questions asked",
  "A cozy blanket and a movie night",
  "Taking something off their plate today",
];

export function CareClient({ permissions, view }: { permissions: Perms; view: View }) {
  const anythingShared = Object.values(permissions).some(Boolean);

  return (
    <div className="rise">
      <h1 className="font-display text-3xl">Care dashboard</h1>
      <p className="muted text-sm mt-1 mb-6">
        Showing only what they've chosen to share. If a category is missing, it's private — no workarounds exist, by design.
      </p>

      {!anythingShared && (
        <EmptyState icon="🤍" title="They haven't shared anything yet" body="Pairing is connected, but every category starts private. You'll see care ideas here if they choose to share." />
      )}

      {view.periodEstimates && (
        <section className="card p-6 mb-4" aria-label="Upcoming period estimate">
          <h2 className="font-display text-xl mb-2">Upcoming days 🌙</h2>
          {view.periodEstimates.nextPeriodStart ? (
            <>
              <p className="text-sm">Their next period is <strong>estimated around {view.periodEstimates.nextPeriodStart}</strong>.</p>
              <p className="text-xs muted mt-2">{view.periodEstimates.confidenceNote} Maybe plan something gentle or bring their favorites that week.</p>
            </>
          ) : (
            <p className="text-sm muted">Not enough history yet for an estimate.</p>
          )}
        </section>
      )}

      {view.cravings && (
        <section className="card p-6 mb-4" aria-label="Shared cravings">
          <h2 className="font-display text-xl mb-3">Cravings they've shared</h2>
          {view.cravings.length === 0 ? (
            <p className="text-sm muted">No shared cravings right now.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {view.cravings.map((c) => (
                <li key={c.id} className="chip !cursor-default" data-checked="true">{c.item}</li>
              ))}
            </ul>
          )}
          <p className="text-xs muted mt-3">A gentle “would chocolate help?” beats assumptions — this list only shows what they marked shareable.</p>
        </section>
      )}

      {view.symptoms && (
        <section className="card p-6 mb-4" aria-label="Shared symptom summaries">
          <h2 className="font-display text-xl mb-3">Recent days they've shared</h2>
          {view.symptoms.length === 0 ? (
            <p className="text-sm muted">Nothing logged recently.</p>
          ) : (
            <ul className="space-y-2">
              {view.symptoms.map((s) => (
                <li key={s.recordedOn} className="surface-2 rounded-xl px-3 py-2 text-sm">
                  <span className="muted">{s.recordedOn}</span> — {s.symptoms.length ? s.symptoms.map((x) => x.replace(/_/g, " ")).join(", ") : "no symptoms logged"}
                  {s.pain !== null ? ` · pain ${s.pain}/10` : ""}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {view.carePreferences && (
        <section className="card p-6 mb-4" aria-label="Care preferences">
          <h2 className="font-display text-xl mb-3">How to care for them well</h2>
          {view.carePreferences.preferredSupport && <p className="text-sm mb-3">“{view.carePreferences.preferredSupport}”</p>}
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold mb-1">Favorite snacks</h3>
              <p className="muted">{view.carePreferences.favoriteSnacks.join(", ") || "—"}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Comfort activities</h3>
              <p className="muted">{view.carePreferences.comfortActivities.join(", ") || "—"}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Please avoid</h3>
              <p className="muted">{view.carePreferences.dislikes.join(", ") || "—"}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Allergies</h3>
              <p className="muted">{view.carePreferences.allergies.join(", ") || "none listed"}</p>
            </div>
          </div>
        </section>
      )}

      {anythingShared && (
        <section className="card p-6" aria-label="Support ideas">
          <h2 className="font-display text-xl mb-3">Little ideas today</h2>
          <ul className="space-y-2 text-sm">
            {IDEAS.map((i) => <li key={i} className="timeline-item">{i}</li>)}
          </ul>
          <p className="text-xs muted mt-4">These are general kindnesses — always let them lead.</p>
        </section>
      )}
    </div>
  );
}
