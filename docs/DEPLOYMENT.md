# Deployment (Render Blueprint)

The repository contains a Blueprint-validated `render.yaml` (checked against the current Render Blueprint spec: `databases`, `type: cron`, `preDeployCommand`, `healthCheckPath`, `sync:false` secrets, plan values).

## Services provisioned

1. **`bloom-web`** — Node web service (`starter` plan by default; switch to `free` for a sleeping free instance).
   - build: `npm ci && npm run build`
   - pre-deploy: `npm run db:migrate` (runs after build, before start — the Render-recommended migration point)
   - start: `npm run start`
   - health check: `/api/healthz`
   - graceful shutdown: Next.js receives SIGTERM from Render and drains; the pg pool has idle timeouts and no keep-alive sockets block exit.
2. **`bloom-reminders`** — Cron job (14:00 UTC daily) calling `/api/cron/reminders` with the bearer `CRON_SECRET`. The sweep is idempotent (dedupe keys), so retries never double-notify.
3. **`bloom-db`** — PostgreSQL 16, `basic-256mb` (smallest persistent plan; free-tier Postgres expires). Connection string is injected into the web service as `DATABASE_URL` automatically.

## First deploy, step by step

1. Push this repo to GitHub.
2. Render → **New → Blueprint** → pick the repo. Render parses `render.yaml`.
3. Fill prompted secrets (`sync:false`): `AI_PROVIDER_BASE_URL`, `AI_PROVIDER_API_KEY`, `EMAIL_API_KEY`, `EMAIL_FROM`, `ADMIN_TOKEN` — any of these may be left blank; the app degrades gracefully.
   `SESSION_SECRET` and `CRON_SECRET` are auto-generated (`generateValue: true`).
4. Create the Blueprint. First deploy runs migrations automatically.
5. After the first deploy, update both `APP_URL` values (web + cron services) to the real `https://<service>.onrender.com` URL and redeploy once so cron hits the right host.
6. Verify: open the site, register, check `/api/healthz` returns `{"status":"ok","database":"connected"}`.

## Optional integrations

- **AI (Grok-compatible):** set `AI_PROVIDER_BASE_URL=https://api.x.ai/v1`, `AI_PROVIDER_API_KEY=<key>`, `AI_PROVIDER_MODEL=grok-3-mini`. Any OpenAI-chat-compatible provider works. Without a key the companion runs in offline mode and everything else works.
- **Email:** any Resend-compatible account. Set `EMAIL_API_KEY` and `EMAIL_FROM`. Without them, notifications remain in-app and verification/reset flows surface links in-app.

## Cost honesty

Render Cron Jobs and persistent databases are paid features; this Blueprint uses `starter` + `basic-256mb` accordingly. Nothing in this repo promises free hosting or zero-cost operation. On a free workspace: delete the cron service and ping `/api/cron/reminders` from any external scheduler, and accept that free Postgres instances expire.

## Migrations & backups

- Migrations: plain SQL in `drizzle/`, applied by `preDeployCommand` via `drizzle-kit migrate` — safe, ordered, reviewable.
- Backups: configure Render's automated backups on the database plan you choose; document your restore drill. Bloom stores no data outside Postgres.
