"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast, api } from "@/components/ui";

type Item = { id: string; kind: string; label: string; done: boolean };

export function ChecklistClient({ initial }: { initial: Item[] }) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState(initial);
  const [draft, setDraft] = useState("");
  const [kind, setKind] = useState("prep");

  const prep = useMemo(() => items.filter((i) => i.kind === "prep"), [items]);
  const emergency = useMemo(() => items.filter((i) => i.kind === "emergency"), [items]);
  const prepDone = prep.filter((i) => i.done).length;

  async function toggle(item: Item) {
    setItems((xs) => xs.map((x) => (x.id === item.id ? { ...x, done: !x.done } : x)));
    try {
      await api(`/api/checklist/${item.id}`, { method: "PUT", body: JSON.stringify({ done: !item.done }) });
      router.refresh();
    } catch (e) {
      setItems((xs) => xs.map((x) => (x.id === item.id ? { ...x, done: item.done } : x)));
      toast(e instanceof Error ? e.message : "Couldn't update", "err");
    }
  }

  async function add() {
    if (!draft.trim()) return;
    try {
      const d = await api<{ item: Item }>("/api/checklist", { method: "POST", body: JSON.stringify({ label: draft.trim(), kind }) });
      setItems((xs) => [...xs, d.item]);
      setDraft("");
      toast("Added to your list");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't add", "err");
    }
  }

  async function remove(id: string) {
    setItems((xs) => xs.filter((x) => x.id !== id));
    try {
      await api(`/api/checklist/${id}`, { method: "DELETE" });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't remove", "err");
    }
  }

  function List({ title, data, icon }: { title: string; data: Item[]; icon: string }) {
    return (
      <section className="card p-6 mb-4" aria-label={title}>
        <h2 className="font-display text-xl mb-4">{icon} {title}</h2>
        <ul className="space-y-2">
          {data.map((i) => (
            <li key={i.id} className="flex items-center gap-3 surface-2 rounded-xl px-3 py-2.5">
              <input type="checkbox" id={`chk-${i.id}`} className="h-4 w-4 accent-[rgb(var(--accent))]" checked={i.done} onChange={() => toggle(i)} />
              <label htmlFor={`chk-${i.id}`} className={`text-sm flex-1 cursor-pointer ${i.done ? "line-through muted" : ""}`}>{i.label}</label>
              <button className="btn-ghost btn !p-1 !min-h-0 text-xs" aria-label={`Remove ${i.label}`} onClick={() => remove(i.id)}>×</button>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <div className="rise">
      <h1 className="font-display text-3xl">Care checklist</h1>
      <p className="muted text-sm mt-1 mb-6">Your period prep and emergency kit — exactly how you like it.</p>

      {prep.length > 0 && (
        <div className="card p-5 mb-6" role="status">
          <p className="text-sm">Period-prep readiness: <strong>{prepDone}/{prep.length}</strong></p>
          <div className="h-2 rounded-full mt-2" style={{ background: "rgb(var(--line))" }}>
            <div className="h-2 rounded-full transition-all" style={{ width: `${(prepDone / prep.length) * 100}%`, background: "rgb(var(--accent))" }} />
          </div>
        </div>
      )}

      <List title="Period preparation" data={prep} icon="🧺" />
      <List title="Emergency kit" data={emergency} icon="🩹" />

      <section className="card p-6" aria-label="Add item">
        <h2 className="font-display text-xl mb-4">Add your own</h2>
        <div className="flex flex-wrap gap-2">
          <input
            className="input flex-1 min-w-48" value={draft} placeholder="e.g. refill hot water bottle"
            onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <select className="input w-auto" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="List">
            <option value="prep">Prep</option>
            <option value="emergency">Emergency kit</option>
          </select>
          <button className="btn btn-primary" onClick={add} disabled={!draft.trim()}>Add</button>
        </div>
      </section>
    </div>
  );
}
