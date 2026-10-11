"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState, useToast, api } from "@/components/ui";

type Notif = { id: string; kind: string; title: string; body: string; readAt: string | null; createdAt: string };
type Prefs = {
  periodReminderDaysBefore: number; suppliesReminderEnabled: boolean; checklistReminderEnabled: boolean;
  emailEnabled: boolean; quietHoursStart: number; quietHoursEnd: number;
};

const KIND_LABELS: Record<string, string> = {
  period_upcoming: "Cycle", craving_hint: "Care idea", invitation: "Pairing",
  checklist: "Checklist", supplies: "Supplies", system: "System",
};

export function NotificationsClient({ notifications: initial, prefs: initialPrefs }: { notifications: Notif[]; prefs: Prefs }) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState(initial);
  const [prefs, setPrefs] = useState(initialPrefs);
  const [busy, setBusy] = useState(false);

  async function markAll() {
    try {
      await api("/api/notifications/read", { method: "POST" });
      setItems((xs) => xs.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })));
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't update", "err");
    }
  }

  async function savePrefs() {
    setBusy(true);
    try {
      await api("/api/reminder-preferences", { method: "POST", body: JSON.stringify(prefs) });
      toast("Reminder preferences saved");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't save", "err");
    } finally { setBusy(false); }
  }

  return (
    <div className="rise">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-3xl">Notifications</h1>
          <p className="muted text-sm mt-1">Everything is quiet-hours aware and always in your control.</p>
        </div>
        {items.some((i) => !i.readAt) && <button className="btn btn-secondary" onClick={markAll}>Mark all read</button>}
      </div>

      <section className="card p-6 mb-8" aria-label="Reminder settings">
        <h2 className="font-display text-xl mb-4">Reminder settings</h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label" htmlFor="days">Days before estimated period to remind</label>
            <input
              id="days" type="number" min={0} max={7} className="input" value={prefs.periodReminderDaysBefore}
              onChange={(e) => setPrefs({ ...prefs, periodReminderDaysBefore: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label" htmlFor="quiet">Quiet hours start (your timezone)</label>
            <input
              id="quiet" type="number" min={0} max={23} className="input" value={prefs.quietHoursStart}
              onChange={(e) => setPrefs({ ...prefs, quietHoursStart: Number(e.target.value) })}
            />
          </div>
        </div>
        <label className="flex items-center gap-3 mb-2 text-sm cursor-pointer">
          <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--accent))]" checked={prefs.suppliesReminderEnabled} onChange={(e) => setPrefs({ ...prefs, suppliesReminderEnabled: e.target.checked })} />
          Remind me to restock supplies before my estimated period
        </label>
        <label className="flex items-center gap-3 mb-2 text-sm cursor-pointer">
          <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--accent))]" checked={prefs.checklistReminderEnabled} onChange={(e) => setPrefs({ ...prefs, checklistReminderEnabled: e.target.checked })} />
          Nudge me about my care checklist
        </label>
        <label className="flex items-center gap-3 mb-4 text-sm cursor-pointer">
          <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--accent))]" checked={prefs.emailEnabled} onChange={(e) => setPrefs({ ...prefs, emailEnabled: e.target.checked })} />
          Also email me (skips your quiet hours)
        </label>
        <button className="btn btn-primary" disabled={busy} onClick={savePrefs}>Save preferences</button>
      </section>

      <section aria-label="Notification history">
        <h2 className="font-display text-2xl mb-4">History</h2>
        {items.length === 0 ? (
          <EmptyState icon="bell" title="All quiet" body="Reminders and gentle care notes will land here when they have something kind to say." />
        ) : (
          <ul className="space-y-2">
            {items.map((n) => (
              <li key={n.id} className={`card p-4 ${n.readAt ? "opacity-70" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm">{n.title}</p>
                  <span className="badge-soft">{KIND_LABELS[n.kind] ?? n.kind}</span>
                </div>
                <p className="muted text-sm mt-1">{n.body}</p>
                <p className="text-[10px] muted mt-2">{n.createdAt.slice(0, 16).replace("T", " ")}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
