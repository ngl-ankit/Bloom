"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChipGroup, EmptyState, Slider, useToast, api } from "@/components/ui";
import { SYMPTOM_VALUES, MOOD_VALUES } from "@/lib/validate";

type Entry = {
  id: string; recordedOn: string; symptoms: string[]; pain: number | null; mood: string | null;
  energy: number | null; flow: string | null; comfortActions: string[]; comfortHelped: boolean | null; notes: string | null;
};

export function JournalClient({ initialEntries }: { initialEntries: Entry[] }) {
  const router = useRouter();
  const toast = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [date, setDate] = useState(today);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [pain, setPain] = useState<number | null>(null);
  const [mood, setMood] = useState<string[]>([]);
  const [energy, setEnergy] = useState<number | null>(null);
  const [flow, setFlow] = useState("");
  const [comforts, setComforts] = useState("");
  const [comfortHelped, setComfortHelped] = useState<boolean | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const existing = entries.find((e) => e.recordedOn === date);

  function loadEntry(e: Entry) {
    setSymptoms(e.symptoms); setPain(e.pain); setMood(e.mood ? [e.mood] : []); setEnergy(e.energy);
    setFlow(e.flow ?? ""); setComforts(e.comfortActions.join(", "));
    setComfortHelped(e.comfortHelped); setNotes(e.notes ?? "");
  }
  function reset() {
    setSymptoms([]); setPain(null); setMood([]); setEnergy(null); setFlow(""); setComforts(""); setComfortHelped(null); setNotes("");
  }
  function onDateChange(d: string) {
    setDate(d);
    const hit = entries.find((x) => x.recordedOn === d);
    if (hit) loadEntry(hit); else reset();
  }

  async function save() {
    setBusy(true);
    try {
      const body = {
        recordedOn: date,
        symptoms,
        pain,
        mood: mood[0] ?? null,
        energy,
        flow: flow || null,
        comfortActions: comforts.split(",").map((s) => s.trim()).filter(Boolean),
        comfortHelped,
        notes: notes || null,
      };
      const { entry } = await api<{ entry: Entry }>("/api/journal", { method: "POST", body: JSON.stringify(body) });
      setEntries((prev) => [entry, ...prev.filter((x) => x.recordedOn !== date)].sort((a, b) => b.recordedOn.localeCompare(a.recordedOn)));
      toast(`Saved ${date} ✓`);
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Something went wrong", "err");
    } finally { setBusy(false); }
  }

  return (
    <div className="rise">
      <h1 className="font-display text-3xl">Daily log</h1>
      <p className="muted text-sm mt-1 mb-6">One gentle snapshot per day. Everything is private and editable.</p>

      <section className="card p-6 mb-8" aria-label="Log editor">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="label" htmlFor="j-date">Date</label>
            <input className="input" id="j-date" type="date" max={today} value={date} onChange={(e) => onDateChange(e.target.value)} />
          </div>
          {existing && <span className="badge-soft mb-2">Editing an existing entry</span>}
        </div>

        <ChipGroup label="Symptoms" options={SYMPTOM_VALUES} value={symptoms} onChange={setSymptoms} multiple />
        <Slider label="Pain (0 = none, 10 = severe)" value={pain} onChange={setPain} />
        <ChipGroup label="Mood" options={MOOD_VALUES} value={mood} onChange={setMood} />
        <Slider label="Energy (0 = empty, 10 = full)" value={energy} onChange={setEnergy} />

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label" htmlFor="j-flow">Flow (if any)</label>
            <select className="input" id="j-flow" value={flow} onChange={(e) => setFlow(e.target.value)}>
              <option value="">Not set</option>
              {["spotting", "light", "medium", "heavy"].map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="j-comfort">Comfort actions you tried (comma-separated)</label>
            <input className="input" id="j-comfort" value={comforts} onChange={(e) => setComforts(e.target.value)} placeholder="Heating pad, chamomile tea" />
          </div>
        </div>

        <div className="mb-4">
          <span className="label">Did your comfort actions help?</span>
          <div className="flex gap-2">
            {[["Yes", true], ["A little", false], ["Not sure", null]].map(([label, v]) => (
              <button key={String(label)} type="button" className="chip" data-checked={comfortHelped === v} aria-pressed={comfortHelped === v}
                onClick={() => setComfortHelped(v as boolean | null)}>{label as string}</button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="label" htmlFor="j-notes">Notes (optional)</label>
          <textarea className="input min-h-20" id="j-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How was your day, really?" />
        </div>

        <button className="btn btn-primary w-full md:w-auto" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save entry"}</button>
      </section>

      <section aria-label="Past entries">
        <h2 className="font-display text-2xl mb-4">Past entries</h2>
        {entries.length === 0 ? (
          <EmptyState icon="📝" title="No entries yet" body="Your log is empty right now — saving today's snapshot takes under a minute." />
        ) : (
          <ul className="space-y-3">
            {entries.map((e) => (
              <li key={e.id} className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button className="font-semibold text-sm underline" onClick={() => onDateChange(e.recordedOn)}>{e.recordedOn}</button>
                  <div className="flex gap-1.5 flex-wrap">
                    {e.flow && <span className="badge-soft">{e.flow} flow</span>}
                    {e.pain !== null && <span className="badge-soft">pain {e.pain}/10</span>}
                    {e.energy !== null && <span className="badge-soft">energy {e.energy}/10</span>}
                    {e.mood && <span className="badge-soft">{e.mood}</span>}
                  </div>
                </div>
                {e.symptoms.length > 0 && <p className="text-sm muted mt-2">{e.symptoms.map((s) => s.replace(/_/g, " ")).join(" · ")}</p>}
                {e.notes && <p className="text-sm mt-2">{e.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
