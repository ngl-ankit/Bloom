"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChipGroup, useToast } from "@/components/ui";
import { api } from "@/components/ui";

const COMFORT_OPTIONS = ["Heating pad", "Warm bath", "Dark chocolate", "Tea", "Rest", "Walk", "Music", "Comfy blanket", "Rom-coms", "Journaling"] as const;
const SNACK_OPTIONS = ["Dark chocolate", "Milk chocolate", "Ice cream", "Chips", "Fruit", "Nuts", "Cookies", "Cheese"] as const;

export function OnboardingClient() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [timezone, setTimezone] = useState("UTC");

  const [averageCycleLength, setAverageCycleLength] = useState<string>("28");
  const [averagePeriodLength, setAveragePeriodLength] = useState<string>("5");
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [comforts, setComforts] = useState<string[]>([]);
  const [snacks, setSnacks] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [preferredSupport, setPreferredSupport] = useState("");

  useEffect(() => {
    try { setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"); } catch {}
  }, []);

  async function finish() {
    setSaving(true);
    try {
      await api("/api/profile", {
        method: "POST",
        body: JSON.stringify({
          averageCycleLength: averageCycleLength ? Number(averageCycleLength) : null,
          averagePeriodLength: averagePeriodLength ? Number(averagePeriodLength) : null,
          remindersEnabled,
        }),
      });
      await api("/api/comfort-profile", {
        method: "POST",
        body: JSON.stringify({
          favoriteSnacks: snacks,
          comfortActivities: comforts,
          dislikes,
          allergies,
          preferredSupport: preferredSupport || null,
        }),
      });
      toast("You're all set — welcome to Bloom");
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Something went wrong", "err");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto rise">
      <div className="flex gap-2 mb-6" aria-hidden>
        {[1, 2, 3].map((s) => (
          <div key={s} className="h-1.5 flex-1 rounded-full" style={{ background: s <= step ? "rgb(var(--accent))" : "rgb(var(--line))" }} />
        ))}
      </div>

      {step === 1 && (
        <section className="card p-8" aria-labelledby="ob1">
          <h1 id="ob1" className="font-display text-2xl">A few gentle questions</h1>
          <p className="muted text-sm mt-2 mb-6">Everything here is optional and private. Estimates improve when we know your typical rhythm — skip anything you'd rather not share.</p>
          <div className="mb-4">
            <label className="label" htmlFor="cycle">Average cycle length (days)</label>
            <input className="input" id="cycle" type="number" min={15} max={60} value={averageCycleLength} onChange={(e) => setAverageCycleLength(e.target.value)} />
            <p className="muted text-xs mt-1">Counted from the first day of one period to the first day of the next. Common range: 21–35.</p>
          </div>
          <div className="mb-4">
            <label className="label" htmlFor="plen">Average period length (days)</label>
            <input className="input" id="plen" type="number" min={1} max={14} value={averagePeriodLength} onChange={(e) => setAveragePeriodLength(e.target.value)} />
          </div>
          <button className="btn btn-primary w-full mt-2" onClick={() => setStep(2)}>Continue</button>
        </section>
      )}

      {step === 2 && (
        <section className="card p-8" aria-labelledby="ob2">
          <h1 id="ob2" className="font-display text-2xl">What helps you feel better?</h1>
          <p className="muted text-sm mt-2 mb-6">We'll keep these handy for care suggestions and (if you invite someone) gentle ideas.</p>
          <ChipGroup label="Comfort activities" options={COMFORT_OPTIONS} value={comforts} onChange={setComforts} multiple />
          <ChipGroup label="Favorite snacks" options={SNACK_OPTIONS} value={snacks} onChange={setSnacks} multiple />
          <button className="btn btn-primary w-full" onClick={() => setStep(3)}>Continue</button>
          <button className="btn btn-ghost w-full mt-2" onClick={() => setStep(3)}>Skip for now</button>
        </section>
      )}

      {step === 3 && (
        <section className="card p-8" aria-labelledby="ob3">
          <h1 id="ob3" className="font-display text-2xl">Reminders & boundaries</h1>
          <p className="muted text-sm mt-2 mb-6">You're in control of every notification and every share.</p>
          <label className="flex items-center gap-3 mb-4 text-sm cursor-pointer">
            <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--accent))]" checked={remindersEnabled} onChange={(e) => setRemindersEnabled(e.target.checked)} />
            Remind me a couple of days before my estimated period (in-app, discreet)
          </label>
          <div className="mb-4">
            <label className="label" htmlFor="support">How do you like to be supported? (optional)</label>
            <textarea className="input min-h-20" id="support" value={preferredSupport} onChange={(e) => setPreferredSupport(e.target.value)} placeholder="e.g. bring snacks, don't offer advice unless I ask" />
          </div>
          <div className="mb-4">
            <label className="label" htmlFor="allergies">Allergies (optional, shared only if you enable care-sharing)</label>
            <input className="input" id="allergies" value={allergies.join(", ")} onChange={(e) => setAllergies(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="e.g. peanuts, latex" />
          </div>
          <p className="muted text-xs mb-4">Timezone detected: <strong>{timezone}</strong> — used only so reminders arrive at sane hours.</p>
          <button className="btn btn-primary w-full" disabled={saving} onClick={finish}>
            {saving ? "Setting things up…" : "Enter Bloom"}
          </button>
        </section>
      )}
    </div>
  );
}
