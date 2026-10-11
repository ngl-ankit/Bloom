import { Suspense } from "react";
import { ResetForm } from "./form";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  return (
    <Suspense fallback={null}>
      <ResetForm token={sp.token ?? ""} />
    </Suspense>
  );
}
