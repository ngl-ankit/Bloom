import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { logoutAction } from "@/actions/auth";
import { AppShell } from "@/components/nav";
import { ToastHost } from "@/components/ui";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const unreadRows = await db
    .select({ n: count() })
    .from(notifications)
    .where(eq(notifications.userId, user.id));
  const logout = (
    <form action={logoutAction}>
      <button className="btn-ghost btn !p-2 !min-h-0" aria-label="Log out" title="Log out">⏎</button>
    </form>
  );
  return (
    <ToastHost>
      <AppShell name={user.displayName} unread={unreadRows[0]?.n ?? 0} logout={logout}>{children}</AppShell>
    </ToastHost>
  );
}
