/** Map infrastructure failures to safe, actionable form errors without logging PII. */
export function authError(error: unknown): { error: string } {
  let current = error;
  let code: string | undefined;
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth++) {
    if ("code" in current && typeof current.code === "string") code = current.code;
    current = "cause" in current ? current.cause : undefined;
  }
  if (code === "23505") {
    return { error: "An account with this email already exists. Try signing in." };
  }
  console.error("[auth] request failed; check database configuration and migrations", {
    code: code && /^[A-Z0-9_]{2,40}$/.test(code) ? code : "UNKNOWN",
  });
  return { error: "Sign-in services are temporarily unavailable. Please try again shortly. If this continues, contact support." };
}
