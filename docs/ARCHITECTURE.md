# Architecture

## Stack

- **Next.js 15 (App Router) + TypeScript** — one deployable web service; React Server Components render private pages directly against the database; REST route handlers under `/api` serve the client components.
- **PostgreSQL + Drizzle ORM** — typed schema, SQL migrations in `drizzle/`, parameterized queries throughout (no string-built SQL).
- **Auth** — first-party sessions: scrypt password hashing with per-user salts, opaque session tokens stored as SHA-256 hashes, HTTP-only/SameSite=Lax/Secure cookies, 30-day expiry, rate-limited auth endpoints.
- **AI** — provider-abstracted OpenAI-compatible chat client (Grok/x.ai by default) configured entirely via environment variables; keys never reach the client; graceful offline fallback.
- **Notifications** — centralized service with database-backed dedupe keys (unique index) making scheduled sweeps idempotent; Render Cron Job calls a secured endpoint.

## Key decisions

1. **Deterministic cycle math, never LLM.** `src/lib/cycle.ts` is a pure, unit-tested engine: cycle lengths are derived from consecutive start dates, implausible gaps (<15/>60 days) are excluded, confidence reflects sample size and standard deviation. The AI only ever receives aggregate averages, clearly framed, and can output no dates.
2. **Deny-by-default pairing.** `pairings.permissions` is a JSONB flag set defaulting to all-false. Partner reads go through `buildPartnerView()`, which includes a category only when its flag is true on an **active** pairing; cravings are further filtered to rows the owner marked shareable. Disconnection sets status + clears permissions in one UPDATE.
3. **Ownership in the query.** Every mutation includes `userId` in the WHERE clause (`WHERE id = ? AND user_id = ?`), so IDOR-style cross-account access fails at the database layer, not just in application code.
4. **Idempotent jobs.** The reminder sweep derives notifications from stable dedupe keys (`period_upcoming:<date>:<userId>`); the unique index turns retries into no-ops, so cron retries and replays cannot double-notify. Quiet hours are evaluated per-user in their own timezone at sweep time.
5. **Graceful degradation.** Missing AI key → offline companion mode (static, honest answers). Missing email config → in-app notifications only, verification/reset links surfaced in-app. Missing cron secret → reminder endpoint returns 503 without crashing anything.
6. **Date-only health records.** All cycle dates are `date` columns handled as `YYYY-MM-DD` strings in UTC — no timezone drift for period records; user timezones are used only for notification scheduling.

## Data flow

```
Browser ──► Next.js RSC pages (read, session-checked)
        ──► /api route handlers ──► server actions (Zod-validated)
                                       │
                                       ▼
                               Drizzle ORM ──► PostgreSQL
                                       ▲
Render Cron ──► /api/cron/reminders ──┘ (bearer CRON_SECRET, idempotent sweep)
```

## Schema overview

`users` → `sessions`, `auth_tokens` (verify/reset), `periods`, `journal_entries`, `cravings`, `comfort_profile`, `checklist_items`, `pairings` (owner/partner + permissions JSONB), `invitations` (hashed single-use tokens), `conversations` → `messages`, `notifications` (dedupe key), `reminder_preferences`, `audit_events`. All child rows cascade on user delete; unique constraints guard periods (user+start), journal (user+day), session/token hashes, and notification dedupe keys.

## Scaling notes

The web service is stateless; scale horizontally behind Render's load balancer at will. The in-process rate limiter is per-instance — move to a shared store (e.g. Redis) if you run many instances. The cron job calls the web service over HTTP, so no second app deployment is needed.
