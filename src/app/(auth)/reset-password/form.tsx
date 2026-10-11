"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/actions/auth";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, null);
  return (
    <main id="main" className="min-h-dvh petal-bg flex items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-8 rise">
        <h1 className="font-display text-2xl text-center">Choose a new password</h1>
        <p className="muted text-sm text-center mt-2 mb-6">Make it long and memorable — 10+ characters.</p>
        <form action={action}>
          <input type="hidden" name="token" value={token} />
          <div className="mb-4">
            <label className="label" htmlFor="password">New password</label>
            <input className="input" id="password" name="password" type="password" required minLength={10} autoComplete="new-password" />
          </div>
          {state?.error && <p className="text-sm mb-4 px-3 py-2 rounded-xl border border-[rgb(var(--accent))] surface-2" role="alert">{state.error}</p>}
          <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Saving…" : "Set new password"}</button>
        </form>
      </div>
    </main>
  );
}
