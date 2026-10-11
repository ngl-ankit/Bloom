"use client";

import { Icon } from "@/components/icon";
import { useEffect, useRef, useState } from "react";
import { api, EmptyState, useToast } from "@/components/ui";

type Msg = { id: string; role: string; content: string; createdAt: string };
type Convo = { id: string; title: string; createdAt: string };

const STARTERS = [
  "I'm crampy and low — help me feel a little better",
  "What could I ask my doctor about heavy periods?",
  "I'm craving all the chocolate, is that okay?",
  "Gentle ideas for winding down tonight?",
];

export function CompanionClient({ aiReady, userName }: { aiReady: boolean; userName: string }) {
  const toast = useToast();
  const [convos, setConvos] = useState<Convo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<{ conversations: Convo[] }>("/api/companion/conversations")
      .then((d) => setConvos(d.conversations))
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function openConvo(id: string) {
    setActiveId(id);
    try {
      const d = await api<{ messages: Msg[] }>(`/api/companion/conversations/${id}/messages`);
      setMessages(d.messages);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't load conversation", "err");
    }
  }

  async function removeConvo(id: string) {
    if (!confirm("Delete this conversation permanently?")) return;
    try {
      await api(`/api/companion/conversations/${id}`, { method: "DELETE" });
      setConvos((c) => c.filter((x) => x.id !== id));
      if (activeId === id) { setActiveId(null); setMessages([]); }
      toast("Conversation deleted");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't delete", "err");
    }
  }

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    setInput("");
    setBusy(true);
    const optimistic: Msg = { id: `tmp-${Date.now()}`, role: "user", content: message, createdAt: new Date().toISOString() };
    setMessages((m) => [...m, optimistic]);
    try {
      const d = await api<{ conversationId: string; reply: Msg; offlineMode: boolean }>("/api/companion/messages", {
        method: "POST",
        body: JSON.stringify({ conversationId: activeId, message }),
      });
      setActiveId(d.conversationId);
      setMessages((m) => [...m, d.reply]);
      if (!convos.some((c) => c.id === d.conversationId)) {
        setConvos((c) => [{ id: d.conversationId, title: message.slice(0, 60), createdAt: new Date().toISOString() }, ...c]);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't send", "err");
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
    } finally { setBusy(false); }
  }

  return (
    <div className="grid md:grid-cols-[16rem_1fr] gap-6">
      <aside className="hidden md:block" aria-label="Conversations">
        <button className="btn btn-secondary w-full mb-3" onClick={() => { setActiveId(null); setMessages([]); }}>+ New conversation</button>
        {convos.length === 0 ? (
          <p className="muted text-xs">No conversations yet.</p>
        ) : (
          <ul className="space-y-2 max-h-[60vh] overflow-auto">
            {convos.map((c) => (
              <li key={c.id} className="flex items-center gap-1">
                <button
                  className={`flex-1 text-left text-sm rounded-xl px-3 py-2 truncate ${activeId === c.id ? "surface-2 font-semibold" : "muted hover:bg-[rgb(var(--surface-2))]"}`}
                  onClick={() => openConvo(c.id)}
                >
                  {c.title}
                </button>
                <button className="btn-ghost btn !p-1.5 !min-h-0 text-xs" aria-label={`Delete conversation: ${c.title}`} onClick={() => removeConvo(c.id)}><Icon name="trash" size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="card flex flex-col min-h-[65vh]" aria-label="Chat">
        <div className="flex-1 overflow-auto p-5 space-y-4">
          {messages.length === 0 ? (
            <div>
              <h2 className="font-display text-xl">Hi {userName}</h2>
              <p className="muted text-sm mt-2 mb-4">
                Talk about anything on your mind — symptoms, feelings, cravings, rest. I listen, offer general
                wellness information, and help you reflect on your own logged patterns. I can't diagnose or
                prescribe, and I'll tell you when something deserves a clinician's attention.
              </p>
              {!aiReady && (
                <p className="text-xs muted mb-4">Offline mode: replies are simple and general right now.</p>
              )}
              <div className="flex flex-wrap gap-2">
                {STARTERS.map((s) => (
                  <button key={s} className="chip" onClick={() => send(s)}>{s}</button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`max-w-[85%] ${m.role === "user" ? "ml-auto" : ""}`}>
                <div
                  className={`rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${m.role === "user" ? "text-[rgb(var(--accent-ink))]" : "surface-2"}`}
                  style={m.role === "user" ? { background: "rgb(var(--accent))" } : {}}
                >
                  {m.content}
                </div>
                {m.role === "assistant" && (
                  <p className="text-[10px] muted mt-1">{aiReady ? "General support — not medical advice" : "Offline mode — general support, not medical advice"}</p>
                )}
              </div>
            ))
          )}
          {busy && <div className="muted text-sm" role="status" aria-live="polite">Thinking softly…</div>}
          <div ref={bottomRef} />
        </div>

        <form
          className="border-t border-[rgb(var(--line))] p-4 flex gap-2"
          onSubmit={(e) => { e.preventDefault(); send(); }}
        >
          <label className="sr-only" htmlFor="chat-input">Message</label>
          <input
            id="chat-input"
            className="input flex-1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Write anything…"
            maxLength={4000}
          />
          <button className="btn btn-primary" disabled={busy || !input.trim()}>Send</button>
        </form>
      </section>
    </div>
  );
}
