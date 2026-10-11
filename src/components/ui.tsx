"use client";

import { Icon, type IconName } from "@/components/icon";
import { createContext, useCallback, useContext, useEffect, useId, useState } from "react";

// Tiny reusable client UI kit (buttons/inputs are CSS classes in globals.css).

export function Field({ label, hint, children }: { label: string; hint?: string; children: (id: string) => React.ReactNode }) {
  const id = useId();
  return (
    <div className="mb-4">
      <label className="label" htmlFor={id}>{label}</label>
      {children(id)}
      {hint && <p className="muted text-xs mt-1">{hint}</p>}
    </div>
  );
}

export function ChipGroup({
  options, value, onChange, label, multiple = false,
}: {
  label: string;
  options: readonly string[];
  value: string[];
  onChange: (v: string[]) => void;
  multiple?: boolean;
}) {
  return (
    <div className="mb-4" role="group" aria-label={label}>
      <span className="label">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const checked = value.includes(o);
          return (
            <button
              key={o}
              type="button"
              className="chip"
              data-checked={checked}
              aria-pressed={checked}
              onClick={() => {
                if (multiple) onChange(checked ? value.filter((v) => v !== o) : [...value, o]);
                else onChange(checked ? [] : [o]);
              }}
            >
              {o.replace(/_/g, " ")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Slider({ label, value, onChange, min = 0, max = 10 }: {
  label: string; value: number | null; onChange: (v: number | null) => void; min?: number; max?: number;
}) {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-baseline">
        <span className="label">{label}</span>
        <button type="button" className="text-xs muted underline" onClick={() => onChange(null)}>clear</button>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value ?? 0}
        disabled={value === null}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[rgb(var(--accent))]"
        aria-label={label}
      />
    </div>
  );
}

export function EmptyState({ icon = "flower", title, body, action }: {
  icon?: IconName; title: string; body: string; action?: React.ReactNode;
}) {
  return (
    <div className="card p-8 text-center rise">
      <div className="mb-4 text-[rgb(var(--accent))]" aria-hidden><Icon name={icon} size={36} /></div>
      <h3 className="font-display text-lg mb-1">{title}</h3>
      <p className="muted text-sm max-w-md mx-auto mb-4">{body}</p>
      {action}
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 p-8 muted" role="status" aria-live="polite">
      <span className="inline-block h-4 w-4 rounded-full border-2 border-[rgb(var(--line))] border-t-[rgb(var(--accent))] animate-spin" />
      <span className="text-sm">{label}…</span>
    </div>
  );
}

type Toast = { id: number; msg: string; kind: "ok" | "err" };
const ToastCtx = createContext<(msg: string, kind?: "ok" | "err") => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastHost({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((msg: string, kind: "ok" | "err" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[min(92vw,26rem)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`card px-4 py-3 text-sm rise ${t.kind === "err" ? "border-[rgb(var(--accent))]" : ""}`}
            role="status"
          >
            <Icon name={t.kind === "err" ? "alert" : "check"} size={18} className="mr-2 text-[rgb(var(--accent))]" />{t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  return (
    <button
      type="button"
      className="btn-ghost btn !p-2 !min-h-0"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle("dark", next);
        try { localStorage.setItem("bloom-theme", next ? "dark" : "light"); } catch {}
      }}
    >
      <Icon name={dark ? "sun" : "moon"} />
    </button>
  );
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Something went wrong");
  return data as T;
}
