import { Icon } from "@/components/icon";
import { isAiConfigured } from "@/lib/env";
import { requireUser } from "@/lib/session";
import { CompanionClient } from "./client";

export const dynamic = "force-dynamic";

export default async function CompanionPage() {
  const user = await requireUser();
  const aiReady = isAiConfigured();
  return (
    <div className="rise">
      <h1 className="font-display text-3xl">Wellness companion</h1>
      <p className="muted text-sm mt-1 mb-4">
        A soft place to talk things through — not a doctor, never a diagnosis.
      </p>
      {!aiReady && (
        <p className="text-sm surface-2 rounded-2xl border border-[rgb(var(--line))] px-4 py-3 mb-6">
          <Icon name="sprout" size={18} className="mr-1" /> The companion is in <strong>offline mode</strong> right now (no AI provider configured on this deployment).
          It can still offer a few gentle, general suggestions — and every other Bloom feature works fully.
        </p>
      )}
      <CompanionClient aiReady={aiReady} userName={user.displayName} />
    </div>
  );
}
