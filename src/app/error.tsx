"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="petal-bg min-h-dvh flex items-center justify-center px-4">
      <div className="card p-10 text-center max-w-md rise">
        <div className="text-5xl mb-4" aria-hidden>🌧️</div>
        <h1 className="font-display text-3xl">A cloud passed through</h1>
        <p className="muted text-sm mt-3">Something went wrong on our side. Your data is safe — try again in a moment.</p>
        {error.digest && <p className="text-[10px] muted mt-2">Reference: {error.digest}</p>}
        <div className="flex gap-2 justify-center mt-6">
          <button className="btn btn-primary" onClick={reset}>Try again</button>
          <a className="btn btn-secondary" href="/">Home</a>
        </div>
      </div>
    </main>
  );
}
