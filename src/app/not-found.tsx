import { Icon } from "@/components/icon";
import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="petal-bg min-h-dvh flex items-center justify-center px-4">
      <div className="card p-10 text-center max-w-md rise">
        <div className="mb-4 text-[rgb(var(--accent))]"><Icon name="compass" size={40} /></div>
        <h1 className="font-display text-3xl">This page wandered off</h1>
        <p className="muted text-sm mt-3">Like some days, it just didn't show up. Let's get you somewhere comfortable.</p>
        <div className="flex gap-2 justify-center mt-6">
          <Link className="btn btn-primary" href="/">Home</Link>
          <Link className="btn btn-secondary" href="/dashboard">Dashboard</Link>
        </div>
      </div>
    </main>
  );
}
