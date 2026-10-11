# API reference

All endpoints are same-origin, cookie-authenticated (HTTP-only `bloom_session`), and return JSON. Errors: `{ "error": "message" }` with appropriate status codes (401 unauthenticated, 400 validation, 404 not-found/foreign, 409 conflict, 429 rate-limited). Health data never appears in URLs.

## Auth
| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/register` | `{email, password, displayName, timezone}` → 201, sets session |
| POST | `/api/auth/login` | `{email, password}` → 200, sets session |
| POST | `/api/auth/logout` | Clears session server-side + cookie |
| GET | `/api/auth/me` | Current user or `{authenticated:false}` |

## Tracking
| Method | Path | Notes |
|---|---|---|
| GET | `/api/periods` | Own periods, newest first |
| POST | `/api/periods` | `{startDate, endDate?, flow?, notes?}`; rejects future dates, overlaps → 400/409 |
| PUT | `/api/periods/:id` | Edit own record (ownership in WHERE) |
| DELETE | `/api/periods/:id` | Delete own record |
| GET | `/api/journal` | Own journal entries (90 days) |
| POST | `/api/journal` | Upsert by `(user, recordedOn)`; pain/energy 0–10 enforced |

## Care
| Method | Path | Notes |
|---|---|---|
| GET/POST | `/api/cravings` | List / add own cravings (`shareWithPartner` gates partner visibility) |
| DELETE | `/api/cravings/:id` | Remove own craving |
| GET/POST | `/api/comfort-profile` | Care profile upsert (snacks, drinks, comforts, allergies, …) |
| POST | `/api/checklist` · PUT/DELETE `/api/checklist/:id` | Checklist items |

## Profile & preferences
| Method | Path | Notes |
|---|---|---|
| POST | `/api/profile` | displayName, timezone, theme, cycle averages, remindersEnabled |
| POST | `/api/reminder-preferences` | days-before, supplies/checklist/email toggles, quiet hours |

## Companion
| Method | Path | Notes |
|---|---|---|
| GET | `/api/companion/conversations` | Own conversations |
| GET | `/api/companion/conversations/:id/messages` | Own messages |
| DELETE | `/api/companion/conversations/:id` | Hard-delete conversation |
| POST | `/api/companion/messages` | `{conversationId?, message}` → reply; 20 msgs/hour; offline fallback when no AI key |

## Pairing
| Method | Path | Notes |
|---|---|---|
| POST | `/api/invitations` | `{email, message?}` → single-use token (link), 7-day expiry, 5/hour |
| DELETE | `/api/invitations/:id` | Revoke pending invitation |
| POST | `/api/pairing/accept` | `{token}` → creates PENDING pairing (shares nothing) |
| PUT | `/api/pairing/:id/permissions` | Owner grants categories (deny-by-default) |
| POST | `/api/pairing/disconnect` | Either side; revokes everything immediately |

## Account & ops
| Method | Path | Notes |
|---|---|---|
| GET | `/api/data-export` | Full JSON download of the requester's data |
| DELETE | `/api/account` | Hard delete + sign-out |
| POST | `/api/account/password` | Change password (verifies current) |
| POST | `/api/notifications/read` | Mark all read |
| GET | `/api/healthz` | Liveness + DB connectivity (public) |
| GET | `/api/cron/reminders` | Bearer `CRON_SECRET`; idempotent reminder sweep |
| GET | `/api/admin/diagnostics` | Bearer `ADMIN_TOKEN`; no user data returned |
