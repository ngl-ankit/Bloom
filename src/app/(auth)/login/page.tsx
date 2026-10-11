"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/actions/auth";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <main id="main" className="min-h-dvh petal-bg flex items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-8 rise">
        <h1 className="font-display text-3xl text-center">Welcome back</h1>
        <p className="muted text-sm text-center mt-2 mb-6">Your space is right where you left it.</p>
        <form action={action} className="text-left">
          <div className="mb-4">
            <label className="label" htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
          </div>
          <div className="mb-4">
            <label className="label" htmlFor="password">Password</label>
            <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          {state?.error && <p className="text-sm mb-4 px-3 py-2 rounded-xl border border-[rgb(var(--accent))] surface-2" role="alert">{state.error}</p>}
          <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
        </form>
        <div className="flex justify-between text-sm mt-5">
          <Link href="/forgot-password" className="underline muted">Forgot password?</Link>
          <Link href="/register" className="underline">Create account</Link>
        </div>
        <p className="text-xs muted text-center mt-6">Bloom offers wellness support, not medical advice.</p>
      </div>
    </main>
  );
}
