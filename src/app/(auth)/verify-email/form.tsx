"use client";

import { Icon } from "@/components/icon";
import Link from "next/link";
import { startTransition, useEffect, useRef } from "react";
import { useActionState } from "react";
import { verifyEmailAction } from "@/actions/auth";

export function VerifyForm({ token, isNew }: { token: string; isNew: boolean }) {
  const [state, action, pending] = useActionState(verifyEmailAction, null);
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;
    const fd = new FormData();
    fd.set("token", token);
    startTransition(() => action(fd));
  }, [token, action]);

  return (
    <main id="main" className="min-h-dvh petal-bg flex items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-8 text-center rise">
        <div className="mb-3 text-[rgb(var(--accent))]"><Icon name={state?.ok ? "check" : state?.error ? "alert" : "mail"} size={36} /></div>
        <h1 className="font-display text-2xl">
          {state?.ok ? "Email verified" : state?.error ? "Verification unavailable" : pending ? "Verifying your email…" : "Email verification"}
        </h1>
        {isNew && !state?.ok && !state?.error && (
          <p className="muted text-sm mt-3">
            We issued a verification link for your new account. When email delivery is configured it arrives by message;
            here it is applied directly so nothing blocks you.
          </p>
        )}
        {state?.error && <p className="muted text-sm mt-3" role="alert">{state.error}</p>}
        <Link className="btn btn-primary mt-6" href="/dashboard">Go to your dashboard</Link>
      </div>
    </main>
  );
}
