"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from "recharts";

export function InsightsCharts({
  cycleLengths, painByDay, avgCycle, avgPeriod,
}: {
  cycleLengths: { start: string; length: number }[];
  painByDay: { date: string; pain: number }[];
  avgCycle: number | null;
  avgPeriod: number | null;
}) {
  const empty = cycleLengths.length === 0 && painByDay.length === 0;
  if (empty) {
    return (
      <p className="muted text-sm">
        Charts appear once you have at least two periods or a few pain entries.
        {avgCycle ? ` Your current averages: ${avgCycle}-day cycles, ${avgPeriod}-day periods.` : ""}
      </p>
    );
  }
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {cycleLengths.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Cycle length over time (days)</h3>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={cycleLengths} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" />
                <XAxis dataKey="start" tick={{ fontSize: 10, fill: "rgb(var(--ink-soft))" }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis domain={[15, 60]} tick={{ fontSize: 10, fill: "rgb(var(--ink-soft))" }} />
                <Tooltip contentStyle={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--line))", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="length" fill="rgb(var(--accent))" radius={[6, 6, 0, 0]} name="days" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {painByDay.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Pain you logged (0–10)</h3>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={painByDay} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "rgb(var(--ink-soft))" }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: "rgb(var(--ink-soft))" }} />
                <Tooltip contentStyle={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--line))", borderRadius: 12, fontSize: 12 }} />
                <Line type="monotone" dataKey="pain" stroke="rgb(var(--accent))" strokeWidth={2} dot={{ r: 3 }} name="pain" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
