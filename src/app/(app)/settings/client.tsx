"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle, useToast, api } from "@/components/ui";

type UserMeta = { displayName: string; email: string; timezone: string; theme: string };

export function SettingsClient({ user, hasReminderPrefs }: { user: UserMeta; hasReminderPrefs: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(user.displayName);
  const [tz, setTz] = useState(user.timezone);
  const [busy, setBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");

  async function saveProfile() {
    setBusy(true);
    try {
      await api("/api/profile", { method: "POST", body: JSON.stringify({ displayName: name, timezone: tz, theme: user.theme as "light" | "dark" | "system" }) });
      toast("Profile saved");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't save", "err");
    } finally { setBusy(false); }
  }

  async function changePassword() {
    setBusy(true);
    try {
      await api("/api/account/password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) });
      toast("Password changed");
      setCurrentPassword(""); setNewPassword("");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't change password", "err");
    } finally { setBusy(false); }
  }

  async function downloadExport() {
    try {
      const res = await fetch("/api/data-export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bloom-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Export downloaded — check your downloads");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't export", "err");
    }
  }

  async function deleteAccount() {
    if (confirmDelete !== user.email) {
      toast("Type your email exactly to confirm deletion.", "err");
      return;
    }
    try {
      await api("/api/account", { method: "DELETE" });
      window.location.href = "/";
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't delete account", "err");
    }
  }

  return (
    <div className="rise">
      <h1 className="font-display text-3xl">Settings</h1>
      <p className="muted text-sm mt-1 mb-6">Account, security, and your data — all in one calm place.</p>

      <section className="card p-6 mb-4" aria-label="Profile">
        <h2 className="font-display text-xl mb-4">Profile</h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label" htmlFor="s-name">Display name</label>
            <input id="s-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </div>
          <div>
            <label className="label" htmlFor="s-tz">Timezone</label>
            <input id="s-tz" className="input" value={tz} onChange={(e) => setTz(e.target.value)} placeholder="e.g. America/New_York" />
          </div>
        </div>
        <div className="flex items-center gap-3 mb-4 text-sm">
          <span className="label !mb-0">Appearance</span>
          <ThemeToggle />
          <span className="muted text-xs">Theme follows your toggle; stored per account too.</span>
        </div>
        <button className="btn btn-primary" disabled={busy} onClick={saveProfile}>Save profile</button>
      </section>

      <section className="card p-6 mb-4" aria-label="Security">
        <h2 className="font-display text-xl mb-1">Security</h2>
        <p className="muted text-sm mb-4">Signed in as <strong>{user.email}</strong>. Changing your password keeps other sessions logged in where possible.</p>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label" htmlFor="s-cpw">Current password</label>
            <input id="s-cpw" className="input" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="s-npw">New password</label>
            <input id="s-npw" className="input" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-primary" disabled={busy || !currentPassword || !newPassword} onClick={changePassword}>Change password</button>
      </section>

      <section className="card p-6 mb-4" aria-label="Data">
        <h2 className="font-display text-xl mb-2">Your data</h2>
        <p className="muted text-sm mb-4">
          Download everything Bloom stores about you — periods, journal, cravings, conversations, notifications — as JSON.
        </p>
        <button className="btn btn-secondary" onClick={downloadExport}>Download my data (JSON)</button>
      </section>

      <section className="card p-6 border-[rgb(var(--accent))]" aria-label="Danger zone">
        <h2 className="font-display text-xl mb-2">Delete account</h2>
        <p className="muted text-sm mb-4">
          Permanently erases your account and every record in it — periods, journals, cravings, pairings, conversations.
          There is no undo and no grace period. Consider downloading your data first.
        </p>
        <div className="max-w-sm mb-4">
          <label className="label" htmlFor="s-del">Type your email to confirm</label>
          <input id="s-del" className="input" value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} placeholder={user.email} />
        </div>
        <button className="btn btn-primary" style={{ background: "#a13649" }} disabled={busy || confirmDelete !== user.email} onClick={deleteAccount}>
          Delete my account forever
        </button>
      </section>

      <p className="text-xs muted mt-6">Reminder preferences live in the Notification Center. {hasReminderPrefs ? "You've customized them before." : "You haven't changed them yet — defaults are gentle."}</p>
    </div>
  );
}
