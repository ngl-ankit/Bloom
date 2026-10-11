"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction } from "@/actions/auth";

export default function RegisterPage() {
  const [state, action, pending] = useActionState(registerAction, null);
  return (
    <main id="main" className="min-h-dvh petal-bg flex items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-8 rise">
        <h1 className="font-display text-3xl text-center">Create your space</h1>
        <p className="muted text-sm text-center mt-2 mb-6">
          Just an email and password to start — cycle details are always optional and private.
        </p>
        <form action={action} className="text-left">
          <div className="mb-4">
            <label className="label" htmlFor="displayName">What should we call you?</label>
            <input className="input" id="displayName" name="displayName" required maxLength={80} placeholder="A name you love" autoComplete="nickname" />
          </div>
          <div className="mb-4">
            <label className="label" htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
          </div>
          <div className="mb-4">
            <label className="label" htmlFor="password">Password</label>
            <input className="input" id="password" name="password" type="password" autoComplete="new-password" required minLength={10} aria-describedby="pw-hint" />
            <p id="pw-hint" className="muted text-xs mt-1">At least 10 characters, with a letter and a number.</p>
          </div>
          <input type="hidden" name="timezone" value={typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC"} />
          {state?.error && <p className="text-sm mb-4 px-3 py-2 rounded-xl border border-[rgb(var(--accent))] surface-2" role="alert">{state.error}</p>}
          <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Planting your space…" : "Create account"}</button>
        </form>
        <p className="text-sm text-center mt-5">
          Already have an account? <Link href="/login" className="underline">Sign in</Link>
        </p>
        <p className="text-xs muted text-center mt-4">
          By continuing you agree to our <Link href="/privacy" className="underline">privacy notice</Link>. You can export or delete your data at any time.
        </p>
      </div>
    </main>
  );
}
