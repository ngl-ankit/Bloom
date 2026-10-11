"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, useToast } from "@/components/ui";

export function AcceptForm({ token }: { token: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn btn-primary mt-6 w-full"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await api("/api/pairing/accept", { method: "POST", body: JSON.stringify({ token }) });
          toast("Pairing created They can now choose what to share.");
          router.push("/care");
        } catch (e) {
          toast(e instanceof Error ? e.message : "Couldn't accept", "err");
          setBusy(false);
        }
      }}
    >
      {busy ? "Connecting…" : "Accept invitation"}
    </button>
  );
}
