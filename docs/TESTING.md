# Testing

## Commands

```bash
npm run test              # unit tests (vitest) — pure logic, no DB required
npm run build             # production build
npm run test:integration  # integration suite (needs local Postgres + built app)
npm run audit             # runtime dependency audit
```

Integration tests boot the **production build** (`npm run start`) against the local database and speak real HTTP: two users are registered, periods logged, an invitation issued and accepted, permissions granted, the `/care` HTML is inspected for leaks, pairing is disconnected, and revocation is verified — plus cron/admin endpoints are checked for authentication enforcement and the data export is validated.

## What is covered

- **Cycle engine (unit):** month/year boundary arithmetic, implausible-gap filtering, period duration caps, prediction with confidence levels (none / two cycles / consistent history / erratic history), reminder-window logic, standard deviation.
- **Permission model (unit):** deny-by-default flags; revoked/disconnected pairings deny everything even with stale stored grants; active pairings pass only granted categories.
- **Insights (unit):** sample-size disclosure, recurring-symptom detection, non-diagnostic safety note always last.
- **Integration:** registration/login/duplicate/weak-password handling, unauthenticated access blocked (401), period overlap & future-date rejection, **cross-account isolation** (B sees zero of A's periods; B cannot delete A's record), pairing privacy before/after grant, single-use invitation tokens, disconnect revocation, journal validation bounds, craving validation, cron/admin auth enforcement, data export completeness.

## Running locally

```bash
# 1. Postgres
sudo service postgresql start
sudo -u postgres psql -c "CREATE USER bloom WITH PASSWORD 'bloom_local';" -c "CREATE DATABASE bloom OWNER bloom;"

# 2. Configure & migrate
export DATABASE_URL=postgres://bloom:bloom_local@localhost:5432/bloom
npm run db:migrate

# 3. Unit + build + integration
npm run test
npm run build
npm run test:integration
```

The integration suite prints one line per check and a final tally; it exits non-zero on any failure and shuts the server down afterwards.
