"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState, Spinner, useToast, api } from "@/components/ui";
import { addDays, diffDays, formatDateOnly, predictNextPeriod } from "@/lib/cycle";

type PeriodRow = { id: string; startDate: string; endDate: string | null; flow: string | null; notes: string | null };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthMatrix(year: number, month: number): string[][] {
  const first = new Date(Date.UTC(year, month, 1));
  const startOffset = (first.getUTCDay() + 6) % 7; // Monday-first
  const days: string[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(first);
    d.setUTCDate(1 - startOffset + i);
    days.push(formatDateOnly(d));
  }
  const weeks: string[][] = [];
  for (let w = 0; w < 6; w++) weeks.push(days.slice(w * 7, w * 7 + 7));
  return weeks;
}

export function CalendarClient({ periods: initial }: { periods: PeriodRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState<PeriodRow[]>(initial);
  const today = formatDateOnly(new Date());

  const [viewYear, setViewYear] = useState(Number(today.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(Number(today.slice(5, 7)) - 1);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState("");
  const [flow, setFlow] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const prediction = useMemo(
    () => predictNextPeriod(rows.map((r) => ({ startDate: r.startDate, endDate: r.endDate })), today),
    [rows, today],
  );

  const inPeriod = (d: string) => rows.find((r) => d >= r.startDate && (r.endDate ? d <= r.endDate : d === r.startDate));
  const isPredicted = (d: string) =>
    prediction.nextPeriodStart !== null &&
    prediction.averagePeriodLength !== null &&
    d >= prediction.nextPeriodStart &&
    diffDays(d, prediction.nextPeriodStart) < prediction.averagePeriodLength;

  async function refresh() {
    const data = await api<{ periods: PeriodRow[] }>("/api/periods");
    setRows(data.periods);
    router.refresh();
  }

  async function save() {
    setBusy(true);
    try {
      const body = { startDate, endDate: endDate || null, flow: flow || null, notes: notes || null };
      if (editId) await api(`/api/periods/${editId}`, { method: "PUT", body: JSON.stringify(body) });
      else await api("/api/periods", { method: "POST", body: JSON.stringify(body) });
      toast(editId ? "Entry updated" : "Period logged");
      setShowForm(false); setEditId(null); setNotes("");
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Something went wrong", "err");
    } finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this period entry? This can't be undone.")) return;
    try {
      await api(`/api/periods/${id}`, { method: "DELETE" });
      toast("Entry deleted");
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Something went wrong", "err");
    }
  }

  function startEdit(p: PeriodRow) {
    setEditId(p.id); setStartDate(p.startDate); setEndDate(p.endDate ?? ""); setFlow(p.flow ?? ""); setNotes(p.notes ?? ""); setShowForm(true);
  }
  function startNew() {
    setEditId(null); setStartDate(today); setEndDate(""); setFlow(""); setNotes(""); setShowForm(true);
  }

  const weeks = monthMatrix(viewYear, viewMonth);
  const monthName = new Date(Date.UTC(viewYear, viewMonth, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="rise">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-3xl">Your calendar</h1>
          <p className="muted text-sm mt-1">Filled circles are recorded periods; dashed outlines are estimates.</p>
        </div>
        <button className="btn btn-primary" onClick={startNew}>+ Log a period</button>
      </div>

      {rows.length === 0 && !showForm && (
        <EmptyState icon="calendar" title="No periods recorded yet" body="Log your first period — start and end dates only, everything is editable later." />
      )}

      <section className="card p-4 md:p-6 mb-6" aria-label="Menstrual calendar">
        <div className="flex items-center justify-between mb-4">
          <button className="btn btn-ghost" aria-label="Previous month" onClick={() => { const m = viewMonth === 0 ? 11 : viewMonth - 1; const y = viewMonth === 0 ? viewYear - 1 : viewYear; setViewMonth(m); setViewYear(y); }}>←</button>
          <h2 className="font-display text-xl">{monthName}</h2>
          <button className="btn btn-ghost" aria-label="Next month" onClick={() => { const m = viewMonth === 11 ? 0 : viewMonth + 1; const y = viewMonth === 11 ? viewYear + 1 : viewYear; setViewMonth(m); setViewYear(y); }}>→</button>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center text-xs muted mb-1" aria-hidden>
          {WEEKDAYS.map((w) => <div key={w} className="py-1">{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {weeks.flat().map((d) => {
            const inMonth = Number(d.slice(5, 7)) - 1 === viewMonth;
            const p = inPeriod(d);
            const predicted = !p && isPredicted(d);
            return (
              <button
                key={d}
                type="button"
                className={`cal-day ${p ? "period" : ""} ${predicted ? "predicted" : ""} ${d === today ? "today" : ""}`}
                style={{ opacity: inMonth ? 1 : 0.35 }}
                aria-label={`${d}${p ? ", recorded period" : predicted ? ", estimated period" : ""}`}
                onClick={() => { const hit = inPeriod(d); if (hit) startEdit(hit); else { setStartDate(d); setEditId(null); setEndDate(""); setFlow(""); setNotes(""); setShowForm(true); } }}
              >
                <span>{Number(d.slice(8, 10))}</span>
                {p?.flow && <span className="cal-dot" style={{ background: "rgb(var(--accent))" }} aria-hidden title={p.flow} />}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-4 mt-4 text-xs muted">
          <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded" style={{ background: "rgba(217,94,110,0.25)", border: "1px solid rgba(217,94,110,0.5)" }} /> Recorded</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded border border-dashed" style={{ borderColor: "rgb(var(--accent))" }} /> Estimated</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded ring-2 ring-[rgb(var(--ring))]" /> Today</span>
        </div>
      </section>

      {prediction.nextPeriodStart && (
        <section className="card p-6 mb-6" aria-label="Estimate summary">
          <h2 className="font-display text-xl">Current estimate</h2>
          <p className="mt-2 text-sm">
            Next period estimated around <strong>{prediction.nextPeriodStart}</strong> ·
            average cycle {prediction.averageCycleLength} days · average period {prediction.averagePeriodLength} days.
          </p>
          <p className="text-xs muted mt-2">{prediction.confidenceNote}</p>
        </section>
      )}

      {rows.length > 0 && (
        <section className="card p-6" aria-label="Period history">
          <h2 className="font-display text-xl mb-4">History</h2>
          <ul className="space-y-3">
            {rows.map((p) => (
              <li key={p.id} className="surface-2 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{p.startDate}{p.endDate ? ` → ${p.endDate}` : " (ongoing)"}</p>
                  <p className="text-xs muted mt-0.5">
                    {p.flow ? `${p.flow} flow` : "flow not set"}{p.notes ? ` · ${p.notes}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-secondary !py-1.5 !px-3 text-xs" onClick={() => startEdit(p)}>Edit</button>
                  <button className="btn btn-ghost !py-1.5 !px-3 text-xs" onClick={() => remove(p.id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true" aria-label="Period entry">
          <div className="card p-6 w-full max-w-md rise">
            <h2 className="font-display text-xl mb-4">{editId ? "Edit period" : "Log a period"}</h2>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="label" htmlFor="p-start">Start date</label>
                <input className="input" id="p-start" type="date" value={startDate} max={today} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="p-end">End date (optional)</label>
                <input className="input" id="p-end" type="date" value={endDate} min={startDate} max={today} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="mb-3">
              <label className="label" htmlFor="p-flow">Flow (optional)</label>
              <select className="input" id="p-flow" value={flow} onChange={(e) => setFlow(e.target.value)}>
                <option value="">Not set</option>
                {["spotting", "light", "medium", "heavy"].map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="mb-4">
              <label className="label" htmlFor="p-notes">Notes (optional)</label>
              <textarea className="input min-h-20" id="p-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering" />
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary flex-1" disabled={busy || !startDate} onClick={save}>{busy ? "Saving…" : "Save"}</button>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
