"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast, api } from "@/components/ui";

type Inv = { id: string; email: string; status: string; createdAt: string; expiresAt: string };
type Perms = { periodEstimates: boolean; cravings: boolean; symptoms: boolean; carePreferences: boolean };
type Pairing = { id: string; role: "owner" | "partner"; status: string; permissions: Perms; partnerName: string | null };

const CATEGORIES: { key: keyof Perms; label: string; detail: string }[] = [
  { key: "periodEstimates", label: "Upcoming-period estimates", detail: "Only the estimated date and confidence — never your logs." },
  { key: "cravings", label: "Cravings you marked shareable", detail: "Only entries where you flipped 'share' stay visible." },
  { key: "symptoms", label: "Recent symptom summaries", detail: "The last 7 days of what you logged, nothing deeper." },
  { key: "carePreferences", label: "Care preferences", detail: "Snacks, comforts, dislikes, allergies, and how you like support." },
];

export function PartnerClient({ invitations, pairing }: { invitations: Inv[]; pairing: Pairing | null }) {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [perms, setPerms] = useState<Perms>(pairing?.permissions ?? { periodEstimates: false, cravings: false, symptoms: false, carePreferences: false });

  async function invite() {
    setBusy(true);
    try {
      const d = await api<{ token: string }>("/api/invitations", { method: "POST", body: JSON.stringify({ email, message: message || undefined }) });
      setInviteLink(`${window.location.origin}/invite/${d.token}`);
      toast("Invitation created — share the link 💞");
      setEmail(""); setMessage("");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't create invitation", "err");
    } finally { setBusy(false); }
  }

  async function revokeInv(id: string) {
    try {
      await api(`/api/invitations/${id}`, { method: "DELETE" });
      toast("Invitation revoked");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't revoke", "err");
    }
  }

  async function savePerms() {
    if (!pairing) return;
    setBusy(true);
    try {
      await api(`/api/pairing/${pairing.id}/permissions`, { method: "PUT", body: JSON.stringify(perms) });
      toast("Sharing updated — they've been notified kindly");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't update", "err");
    } finally { setBusy(false); }
  }

  async function disconnect() {
    if (!confirm("Disconnect this pairing? Access ends immediately and cannot be undone.")) return;
    try {
      await api("/api/pairing/disconnect", { method: "POST" });
      toast("Pairing disconnected — access fully revoked");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't disconnect", "err");
    }
  }

  return (
    <div className="rise">
      <h1 className="font-display text-3xl">Trusted person</h1>
      <p className="muted text-sm mt-1 mb-6">
        Optionally invite a partner or best friend. Pairing is always mutual, permission-by-permission, private by default, and reversible in one click.
      </p>

      {!pairing && (
        <section className="card p-6 mb-8" aria-label="Invite someone">
          <h2 className="font-display text-xl mb-4">Invite someone you trust</h2>
          <div className="mb-4">
            <label className="label" htmlFor="inv-email">Their email</label>
            <input className="input" id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="them@example.com" />
          </div>
          <div className="mb-4">
            <label className="label" htmlFor="inv-msg">A little message (optional)</label>
            <textarea className="input min-h-20" id="inv-msg" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Why you'd love them along" maxLength={500} />
          </div>
          <button className="btn btn-primary" disabled={busy || !email.trim()} onClick={invite}>Create invitation</button>
          {inviteLink && (
            <div className="surface-2 rounded-2xl p-4 mt-4 text-sm" role="status">
              <p className="font-semibold mb-1">Share this link (works once, expires in 7 days):</p>
              <code className="break-all text-xs">{inviteLink}</code>
            </div>
          )}
          <p className="text-xs muted mt-4">
            If email delivery isn't configured, simply copy the link and send it yourself. Nothing is shared until they accept and you choose permissions.
          </p>
        </section>
      )}

      {pairing && (
        <section className="card p-6 mb-8" aria-label="Pairing status">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-display text-xl">
              {pairing.role === "owner" ? `Paired with ${pairing.partnerName ?? "them"}` : `You care for ${pairing.partnerName ?? "them"}`}
            </h2>
            <span className="badge-soft capitalize">{pairing.status}</span>
          </div>

          {pairing.role === "owner" ? (
            pairing.status === "pending" ? (
              <>
                <p className="text-sm muted mb-4">They accepted your invitation 🎉 Choose what they may see — everything below starts off.</p>
                {CATEGORIES.map((c) => (
                  <label key={c.key} className="flex items-start gap-3 mb-3 text-sm cursor-pointer surface-2 rounded-2xl p-4">
                    <input type="checkbox" className="mt-1 h-4 w-4 accent-[rgb(var(--accent))]" checked={perms[c.key]} onChange={(e) => setPerms({ ...perms, [c.key]: e.target.checked })} />
                    <span><strong>{c.label}</strong><br /><span className="muted text-xs">{c.detail}</span></span>
                  </label>
                ))}
                <div className="flex gap-2 mt-4">
                  <button className="btn btn-primary" disabled={busy} onClick={savePerms}>Allow selected</button>
                  <button className="btn btn-secondary" onClick={disconnect}>Disconnect instead</button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm muted mb-4">Currently sharing these categories — untick any to revoke instantly:</p>
                {CATEGORIES.map((c) => (
                  <label key={c.key} className="flex items-start gap-3 mb-3 text-sm cursor-pointer surface-2 rounded-2xl p-4">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-[rgb(var(--accent))]"
                      checked={pairing.status === "active" ? perms[c.key] : false}
                      onChange={(e) => setPerms({ ...perms, [c.key]: e.target.checked })}
                    />
                    <span><strong>{c.label}</strong><br /><span className="muted text-xs">{c.detail}</span></span>
                  </label>
                ))}
                <div className="flex gap-2 mt-4">
                  {pairing.status === "active" && <button className="btn btn-secondary" disabled={busy} onClick={savePerms}>Update sharing</button>}
                  <button className="btn btn-secondary" onClick={disconnect}>Disconnect entirely</button>
                </div>
              </>
            )
          ) : (
            <>
              <p className="text-sm muted mb-4">
                You're their trusted person. Your care dashboard shows only what they allow:{" "}
                {CATEGORIES.filter((c) => pairing.permissions[c.key]).map((c) => c.label).join(", ") || "nothing yet"}.
              </p>
              <div className="flex gap-2">
                {pairing.status === "active" && <a className="btn btn-primary" href="/care">Open care dashboard</a>}
                <button className="btn btn-secondary" onClick={disconnect}>Disconnect</button>
              </div>
            </>
          )}
        </section>
      )}

      {invitations.length > 0 && (
        <section aria-label="Invitations">
          <h2 className="font-display text-2xl mb-4">Invitations</h2>
          <ul className="space-y-2">
            {invitations.map((i) => (
              <li key={i.id} className="card p-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div>
                  <p className="font-semibold">{i.email}</p>
                  <p className="text-xs muted">{i.status} · created {i.createdAt.slice(0, 10)} · expires {i.expiresAt.slice(0, 10)}</p>
                </div>
                {i.status === "pending" && <button className="btn btn-secondary !py-1.5 !px-3 text-xs" onClick={() => revokeInv(i.id)}>Revoke</button>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-6 mt-8" aria-label="How sharing works">
        <h2 className="font-display text-xl mb-3">How sharing works</h2>
        <ul className="text-sm muted space-y-2 list-disc pl-5">
          <li>Invitations are single-use, expire in 7 days, and can be revoked anytime.</li>
          <li>Pairing alone shares nothing — every category needs your explicit grant.</li>
          <li>Revoking or disconnecting ends access immediately.</li>
          <li>Conversations with the AI companion are never shared with anyone.</li>
        </ul>
      </section>
    </div>
  );
}
