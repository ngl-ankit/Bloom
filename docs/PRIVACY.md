# Privacy & security notes

## Data handling

- **Collected:** email, display name, timezone, theme; user-authored records: period dates/flow/notes, journal entries, cravings, care profile, checklist items, AI conversations, notification history.
- **Never collected:** analytics on health fields, third-party trackers, health data in URLs, query strings, or application logs (`handleError` logs only error messages; no bodies).
- **Isolation:** every table is user-scoped with cascading foreign keys; partner reads are additionally filtered per-category and (for cravings) per-row share flags.
- **Transport & storage:** HTTPS in production (Render terminates TLS), HTTP-only SameSite=Lax Secure cookies, scrypt password hashes with per-user salts, session/invitation/reset tokens stored only as SHA-256 hashes.
- **AI sharing:** with a configured provider, only conversation text + two aggregate numbers (average cycle/period length) are sent, explicitly framed as user-shared context. Raw symptom logs are never transmitted unless the user writes them into a message.
- **User rights:** full JSON export (`/api/data-export`) and irreversible hard delete (`/api/account`) with database-level cascade; single-use expiring tokens for verification/reset/invitations.

## Consent model

Pairing is optional and mutual: invitation (single-use, 7-day expiry, revocable) → acceptance → **pending pairing sharing nothing** → owner grants categories explicitly → instant disconnect by either side. Cravings are shared only when individually marked shareable. The system cannot be used for covert monitoring: there is no read path that bypasses the permission flags, and revocation is immediate.

## Known obligations & limitations (no compliance claims)

- No GDPR/CCPA/HIPAA compliance is claimed or implied. Depending on your deployment and audience you may be a data controller with obligations (lawful basis, DSAR timelines, DPA with the AI/email processors, retention policy, EU data-transfer assessments). Obtain qualified legal review before operating on real users at scale.
- Menstrual data is sensitive everywhere and regulated in some jurisdictions (e.g., state privacy laws covering reproductive health data in the US). Self-hosters should review their exposure.
- Backups/restore depend on your database plan; test recovery, not just backups.
- The in-process rate limiter is per-instance; at multi-instance scale use a shared store. No WAF/DDoS layer is included — Render's platform protections apply.
- This document is engineering guidance, not legal advice.
