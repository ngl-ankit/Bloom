import { Suspense } from "react";
import { VerifyForm } from "./form";

export const dynamic = "force-dynamic";

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; new?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <VerifySection searchParams={searchParams} />
    </Suspense>
  );
}

async function VerifySection({ searchParams }: { searchParams: Promise<{ token?: string; new?: string }> }) {
  const sp = await searchParams;
  return <VerifyForm token={sp.token ?? ""} isNew={sp.new === "1"} />;
}
