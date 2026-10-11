"use client";

import { Icon, type IconName } from "@/components/icon";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ui";

const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/calendar", label: "Calendar", icon: "calendar" },
  { href: "/journal", label: "Log day", icon: "journal" },
  { href: "/insights", label: "Insights", icon: "chart" },
  { href: "/companion", label: "Companion", icon: "heart" },
  { href: "/cravings", label: "Cravings", icon: "cookie" },
  { href: "/partner", label: "Trusted person", icon: "users" },
  { href: "/notifications", label: "Notifications", icon: "bell" },
  { href: "/learn", label: "Learn", icon: "book" },
  { href: "/checklist", label: "Checklist", icon: "checklist" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

const PRIMARY = new Set(["/dashboard", "/calendar", "/journal", "/companion"]);

export function AppShell({ name, unread, logout, children }: { name: string; unread: number; logout: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const bottom = LINKS.filter((l) => PRIMARY.has(l.href));

  return (
    <div className="min-h-dvh petal-bg">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col p-4 border-r border-[rgb(var(--line))] bg-[rgb(var(--surface))] z-40">
        <Link href="/dashboard" className="font-display text-2xl mb-6 px-2" style={{ color: "rgb(var(--accent))" }}>
          Bloom
        </Link>
        <nav aria-label="Main" className="flex-1 flex flex-col gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active(l.href) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                active(l.href)
                  ? "bg-[rgb(var(--surface-2))] font-semibold text-[rgb(var(--ink))]"
                  : "muted hover:bg-[rgb(var(--surface-2))]"
              }`}
            >
              <Icon name={l.icon} />
              {l.label}
              {l.href === "/notifications" && unread > 0 && (
                <span className="ml-auto badge-soft !text-[10px] !bg-[rgb(var(--accent))] !text-[rgb(var(--accent-ink))] !border-transparent">
                  {unread}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 px-2 pt-2 border-t border-[rgb(var(--line))]">
          <span className="text-sm muted truncate">Hi, {name}</span>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            {logout}
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 border-b border-[rgb(var(--line))] bg-[rgb(var(--surface))]">
        <Link href="/dashboard" className="font-display text-xl" style={{ color: "rgb(var(--accent))" }}>Bloom</Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {logout}
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Primary"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 flex justify-around items-center h-16 border-t border-[rgb(var(--line))] bg-[rgb(var(--surface))]"
      >
        {bottom.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active(l.href) ? "page" : undefined}
            className={`flex flex-col items-center text-[10px] gap-0.5 px-3 py-1 rounded-xl ${
              active(l.href) ? "font-semibold text-[rgb(var(--accent))]" : "muted"
            }`}
          >
            <Icon name={l.icon} size={22} />
            {l.label}
          </Link>
        ))}
      </nav>
      <main className="px-4 py-6 pb-24 md:pb-10 md:pl-[16.5rem] max-w-4xl mx-auto" id="main">{children}</main>
    </div>
  );
}
