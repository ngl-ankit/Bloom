<div align="center">

# Bloom 🌸

**A private, supportive menstrual wellness companion — cycle tracking, symptom insights, cravings care, an empathetic AI, and optional trusted-person support.**

Next.js 15 · TypeScript · PostgreSQL (Drizzle) · Render-ready

</div>

---

Bloom is a complete, production-oriented web application: real authentication, a deterministic cycle-tracking engine, a symptom journal with honest data-derived insights, a Grok-compatible AI companion (with a graceful offline mode), a permission-controlled partner/trusted-person system, durable notification automation, data export/deletion, and one-command Render Blueprint deployment.

**Bloom offers general wellness information, never medical advice, diagnosis, or prescriptions. Predictions are estimates and clearly labeled as such.**

---

## ✨ Features

| Area | What works |
|---|---|
| **Auth** | Email/password registration & login, email verification, password reset, HTTP-only session cookies, scrypt+salt hashing, rate limiting, logout |
| **Cycle tracking** | Period start/end logging, flow intensity, notes, edit/delete, overlap & future-date guards, deterministic predictions with honest low/medium/high confidence |
| **Journal** | Daily symptoms, pain 0–10, mood, energy, flow, comfort actions & whether they helped, notes — one editable snapshot per day |
| **Insights** | Charts + transparent observations computed only from stored data, with sample sizes and a permanent non-diagnostic safety note |
| **AI companion** | Provider-abstracted (any OpenAI-compatible API, e.g. Grok/x.ai), server-side keys only, conversation history with deletion, per-hour usage limits, graceful offline fallback; core features never depend on it |
| **Cravings & comfort** | Log cravings (private or shareable), full care profile: snacks, drinks, comfort foods, surprises, activities, dislikes, dietary restrictions, allergies, preferred support |
| **Trusted person** | Single-use expiring invitations, explicit consent, granular per-category permissions (period estimates / shareable cravings / symptom summaries / care preferences), deny-by-default, instant revocation, dedicated partner care dashboard |
| **Notifications** | In-app notification center, optional Resend-compatible email, idempotent period-reminder sweep (dedupe keys), quiet hours in each user's timezone, per-user preferences |
| **Checklists** | Period-prep readiness with progress, emergency-kit list, fully editable |
| **Account** | Full JSON data export, one-step hard delete with cascade, password change |
| **Security** | Strict CSP + security headers, server-side authorization everywhere, ownership in SQL WHERE clauses, Zod validation on all inputs, no health data in URLs/logs |
| **A11y & UX** | WCAG-minded: keyboard navigable, visible focus, aria labels/roles, reduced-motion support, mobile-first premium design in blush/rose/lavender/sage with light & dark themes |

## 🚀 Quick start (local)

```bash
git clone <your-fork-url> bloom && cd bloom
npm install

cp .env.example .env           # set DATABASE_URL at minimum
# Example local Postgres:
#   createuser bloom && createdb bloom -O bloom
#   DATABASE_URL=postgres://bloom:bloom_local@localhost:5432/bloom

npm run db:migrate             # apply migrations
npm run seed                   # optional demo account (see below)
npm run dev                    # http://localhost:3000
```

**Demo account** (only created by the explicit seed command):
`demo@bloom.app` / `BloomDemo2026` — comes with three historical cycles and journal entries.

## ✅ Testing

```bash
npm run test              # unit tests: cycle math, permission model, insights
npm run build             # production build (Next.js)
npm run test:integration  # boots the built app against Postgres; auth, isolation,
                          # pairing privacy, revocation, cron/admin security, export
npm run audit             # dependency audit of runtime deps
```

Integration tests exercise **cross-account privacy**: partner B must see nothing before permissions are granted, only granted categories afterward, and nothing after disconnection.

## 📦 Deploying to Render

This repo ships a validated [`render.yaml`](render.yaml) Blueprint:

1. Push this repo to GitHub.
2. Render Dashboard → **New → Blueprint** → select the repo.
3. Fill the `sync:false` prompts (`AI_PROVIDER_API_KEY`, `EMAIL_API_KEY`, `EMAIL_FROM`, `ADMIN_TOKEN`) or leave blank — the app runs fully without optional integrations.
4. Render provisions `bloom-db` (Postgres 16, `basic-256mb`) and injects `DATABASE_URL` automatically.
5. `preDeployCommand` runs migrations on every deploy (`npm run db:migrate`).
6. Set the two `APP_URL` occurrences to your real Render URL after the first deploy.
7. Health check: `/api/healthz`. Reminder sweep: nightly Render Cron Job calling `/api/cron/reminders` with `CRON_SECRET` (auto-generated).

> **Plan notes:** the cron service and the `basic-256mb` database require a paid workspace; on free plans, replace the cron service with any external scheduler hitting `/api/cron/reminders` with the bearer secret, and expect free Postgres instances to expire. Nothing here assumes zero-cost hosting.

## 🔐 Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (auto-injected by Render Blueprint) |
| `SESSION_SECRET` | prod | Reserved for token context; generate `openssl rand -base64 32` (auto-generated on Render) |
| `APP_URL` | prod | Public URL, used for cron calls & links |
| `AI_PROVIDER_BASE_URL` | – | e.g. `https://api.x.ai/v1` (omit for offline companion mode) |
| `AI_PROVIDER_API_KEY` | – | Server-side only, never exposed to the client |
| `AI_PROVIDER_MODEL` | – | e.g. `grok-3-mini` |
| `EMAIL_API_KEY` / `EMAIL_FROM` | – | Resend-compatible email; omit to disable email |
| `CRON_SECRET` | prod | Bearer secret for `/api/cron/reminders` (auto-generated on Render) |
| `ADMIN_TOKEN` | – | Bearer secret for `/api/admin/diagnostics` |

`.env.example` contains placeholders only. Real secrets live in the Render dashboard.

## 🗂️ Project structure

```
src/
  app/
    (auth)/            login · register · verify-email · forgot/reset password
    (app)/             dashboard · calendar · journal · insights · companion ·
                       cravings · partner · care · notifications · learn ·
                       checklist · onboarding · settings
    api/               REST endpoints (auth, periods, journal, cravings,
                       comfort-profile, profile, reminder-preferences,
                       companion, invitations, pairing, checklist,
                       notifications, data-export, healthz, cron, admin)
    invite/[token]/    invitation acceptance
    privacy/           privacy & consent notice
  actions/             server actions: auth, tracking, care, pairing, profile, companion, account
  components/          ui kit + app shell
  db/                  Drizzle schema & pooled client
  lib/                 cycle engine · permissions · insights · notify · ai · env · validate · session · password
tests/                 unit tests (vitest)
scripts/               integration test suite, seed
drizzle/               SQL migrations
docs/                  ARCHITECTURE · API · DEPLOYMENT · PRIVACY · TESTING
```

## 📚 Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system design and key decisions
- [docs/API.md](docs/API.md) — endpoint reference
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Render Blueprint walkthrough
- [docs/PRIVACY.md](docs/PRIVACY.md) — data handling, obligations, limitations
- [docs/TESTING.md](docs/TESTING.md) — how to run and interpret tests

## ⚠️ Limitations & honest notes

- Predictions are statistical estimates from your own history — never guarantees; confidence is always displayed.
- The AI companion is not a medical professional; it never diagnoses or prescribes and points to clinicians for red-flag symptoms.
- No regulatory compliance (GDPR/HIPAA/…) is claimed; self-hosters should obtain their own legal review. See [docs/PRIVACY.md](docs/PRIVACY.md).
- Email and AI integrations are optional; without them Bloom remains fully functional (verification/reset links and the companion degrade gracefully in-app).
- The in-process rate limiter is per-instance; a shared store is advisable at multi-instance scale.

## License

MIT
