"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordResetAction } from "@/actions/auth";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, null);
  return (
    <main id="main" className="min-h-dvh petal-bg flex items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-8 rise">
        <h1 className="font-display text-2xl text-center">Reset your password</h1>
        <p className="muted text-sm text-center mt-2 mb-6">We'll send a link to reset it. The link works for one hour.</p>
        <form action={action}>
          <div className="mb-4">
            <label className="label" htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" required autoComplete="email" />
          </div>
          {state?.error && <p className="text-sm mb-4 px-3 py-2 rounded-xl border border-[rgb(var(--accent))] surface-2" role="alert">{state.error}</p>}
          {state?.ok && (
            <div className="text-sm mb-4 px-3 py-2 rounded-xl surface-2" role="status">
              {state.ok}
              {state.devToken && (
                <>
                  {" "}Email delivery isn't configured, so continue here:{" "}
                  <Link href={state.devToken} className="underline font-semibold">open reset link</Link>
                </>
              )}
            </div>
          )}
          <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Sending…" : "Send reset link"}</button>
        </form>
        <p className="text-sm text-center mt-5"><Link href="/login" className="underline muted">Back to sign in</Link></p>
      </div>
    </main>
  );
}
