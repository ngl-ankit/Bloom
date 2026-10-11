"use client";

import { Icon } from "@/components/icon";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState, useToast, api } from "@/components/ui";

type Craving = { id: string; item: string; category: string; shareWithPartner: boolean };
type Profile = {
  favoriteSnacks: string[]; favoriteDrinks: string[]; comfortFoods: string[]; flowersOrSurprises: string[];
  comfortActivities: string[]; dislikes: string[]; dietaryRestrictions: string[]; allergies: string[]; preferredSupport: string | null;
};

const CATEGORIES = ["snack", "drink", "comfort", "surprise", "other"] as const;

const IDEA_MAP: Record<string, string[]> = {
  snack: ["Put a little portion in a pretty bowl", "Pair it with a cozy drink", "Enjoy it slowly with a show you love"],
  drink: ["Make it in your favorite mug", "Try it warm with a blanket", "Brew a small pot and sip slowly"],
  comfort: ["Set aside unhurried time for it today", "Dim the lights and lean in", "Combine it with soft music"],
  surprise: ["Small gestures count — a single stem or a sweet note", "Leave it somewhere you'll find it later", "Keep one little surprise on hand for hard days"],
  other: ["Whatever it is, you're allowed to want it", "Pair it with rest", "No guilt allowed"],
};

function TagEditor({ label, values, onChange, hint }: { label: string; values: string[]; onChange: (v: string[]) => void; hint?: string }) {
  const [draft, setDraft] = useState("");
  return (
    <div className="mb-4">
      <span className="label">{label}</span>
      <div className="flex flex-wrap gap-2 mb-2">
        {values.map((v) => (
          <span key={v} className="chip !cursor-default" data-checked="true">
            {v}
            <button type="button" className="ml-1.5" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}>×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="input flex-1"
          value={draft}
          placeholder={hint ?? "Add an item…"}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const v = draft.trim();
              if (v && !values.includes(v)) onChange([...values, v]);
              setDraft("");
            }
          }}
        />
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => { const v = draft.trim(); if (v && !values.includes(v)) onChange([...values, v]); setDraft(""); }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

export function CravingsClient({ cravings: initialCravings, profile: initialProfile }: { cravings: Craving[]; profile: Profile | null }) {
  const router = useRouter();
  const toast = useToast();
  const [cravings, setCravings] = useState(initialCravings);
  const [item, setItem] = useState("");
  const [category, setCategory] = useState<string>("snack");
  const [share, setShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<Profile>(initialProfile ?? {
    favoriteSnacks: [], favoriteDrinks: [], comfortFoods: [], flowersOrSurprises: [],
    comfortActivities: [], dislikes: [], dietaryRestrictions: [], allergies: [], preferredSupport: null,
  });
  const [profileSaved, setProfileSaved] = useState(false);

  const ideas = IDEA_MAP[category] ?? IDEA_MAP.other;

  async function addCraving() {
    if (!item.trim()) return;
    setBusy(true);
    try {
      const { craving } = await api<{ craving: Craving }>("/api/cravings", {
        method: "POST",
        body: JSON.stringify({ item: item.trim(), category, shareWithPartner: share }),
      });
      setCravings((c) => [craving, ...c]);
      setItem(""); setShare(false);
      toast("Craving logged");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't save", "err");
    } finally { setBusy(false); }
  }

  async function removeCraving(id: string) {
    try {
      await api(`/api/cravings/${id}`, { method: "DELETE" });
      setCravings((c) => c.filter((x) => x.id !== id));
      toast("Removed");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't remove", "err");
    }
  }

  async function saveProfile() {
    setBusy(true);
    try {
      await api("/api/comfort-profile", { method: "POST", body: JSON.stringify(profile) });
      toast("Care profile saved");
      setProfileSaved(true);
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't save", "err");
    } finally { setBusy(false); }
  }

  return (
    <div className="rise">
      <h1 className="font-display text-3xl">Cravings & comfort</h1>
      <p className="muted text-sm mt-1 mb-6">
        Cravings are simply cravings — Bloom won't claim they mean anything medical. Save what you love; share only what you choose.
      </p>

      <section className="card p-6 mb-8" aria-label="Log a craving">
        <h2 className="font-display text-xl mb-4">Log a craving</h2>
        <div className="grid md:grid-cols-[1fr_auto] gap-3 items-end mb-3">
          <div>
            <label className="label" htmlFor="c-item">What are you craving?</label>
            <input className="input" id="c-item" value={item} maxLength={120} onChange={(e) => setItem(e.target.value)} placeholder="Dark chocolate, pickles, a warm hug…" />
          </div>
          <div>
            <label className="label" htmlFor="c-cat">Category</label>
            <select className="input" id="c-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-3 text-sm mb-4 cursor-pointer">
          <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--accent))]" checked={share} onChange={(e) => setShare(e.target.checked)} />
          Let my trusted person see this one (they'd get a gentle heads-up)
        </label>
        <button className="btn btn-primary" disabled={busy || !item.trim()} onClick={addCraving}>Log craving</button>
        <p className="text-xs muted mt-3">A little idea: {ideas[0].toLowerCase()} — or {ideas[1].toLowerCase()}.</p>
      </section>

      <section aria-label="Logged cravings" className="mb-10">
        <h2 className="font-display text-2xl mb-4">Logged cravings</h2>
        {cravings.length === 0 ? (
          <EmptyState icon="cookie" title="Nothing logged yet" body="When a craving strikes, jot it here — for yourself, or to drop a hint." />
        ) : (
          <ul className="grid sm:grid-cols-2 gap-3">
            {cravings.map((c) => (
              <li key={c.id} className="card p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{c.item}</p>
                  <p className="text-xs muted mt-0.5">{c.category}{c.shareWithPartner ? " · shared with trusted person" : " · private"}</p>
                </div>
                <button className="btn-ghost btn !p-1.5 !min-h-0 text-xs" aria-label={`Delete craving ${c.item}`} onClick={() => removeCraving(c.id)}><Icon name="trash" size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-6" aria-label="Care profile">
        <h2 className="font-display text-xl mb-1">Your care profile</h2>
        <p className="muted text-sm mb-5">
          Saved so suggestions fit you — and so a trusted person (only if you enable sharing) knows how to care for you well.
        </p>
        <TagEditor label="Favorite snacks" values={profile.favoriteSnacks} onChange={(v) => setProfile({ ...profile, favoriteSnacks: v })} />
        <TagEditor label="Favorite drinks" values={profile.favoriteDrinks} onChange={(v) => setProfile({ ...profile, favoriteDrinks: v })} />
        <TagEditor label="Comfort foods" values={profile.comfortFoods} onChange={(v) => setProfile({ ...profile, comfortFoods: v })} />
        <TagEditor label="Flowers or small surprises" values={profile.flowersOrSurprises} onChange={(v) => setProfile({ ...profile, flowersOrSurprises: v })} />
        <TagEditor label="Comfort activities" values={profile.comfortActivities} onChange={(v) => setProfile({ ...profile, comfortActivities: v })} />
        <TagEditor label="Dislikes (please avoid)" values={profile.dislikes} onChange={(v) => setProfile({ ...profile, dislikes: v })} />
        <TagEditor label="Dietary restrictions" values={profile.dietaryRestrictions} onChange={(v) => setProfile({ ...profile, dietaryRestrictions: v })} />
        <TagEditor label="Allergies" values={profile.allergies} onChange={(v) => setProfile({ ...profile, allergies: v })} hint="e.g. peanuts" />
        <div className="mb-5">
          <label className="label" htmlFor="support-pref">How do you like to be supported?</label>
          <textarea id="support-pref" className="input min-h-20" value={profile.preferredSupport ?? ""} onChange={(e) => setProfile({ ...profile, preferredSupport: e.target.value })} placeholder="e.g. bring snacks and don't ask questions" />
        </div>
        <button className="btn btn-primary" disabled={busy} onClick={saveProfile}>{busy && !profileSaved ? "Saving…" : "Save care profile"}</button>
      </section>
    </div>
  );
}
