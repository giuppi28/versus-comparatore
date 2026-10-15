# REVIEW — from the planner/reviewer session

Builder: fix open items before starting new tasks; mark `[x] fixed in <commit>`.

(no items yet)

## Review 2026-10-15 13:40 (reviewer)
Overall: very solid work. Schema, RLS, lead functions and storage policies reviewed line by line and applied to the real project; advisors show only the expected warnings. No secrets in git, no service-role usage, no "demo" or call wording in the UI before the thank-you page (the privacy page mentions being contacted — correct, GDPR requires it).

- [x] fixed in 2e9ee30 (SQL) + 3f92e05 (app) + 6394331/65f8c14/2bb7505 (Q8 consumers) — APPLY 20261015140000 pending — [high] Q6 — lead functions callable directly with the publishable key. Implement the hashed server secret described in QUESTIONS.md Q6 (together with Q7 and Q8 in one migration) → `APPLY`.
- [x] fixed in 2e9ee30 (TOTAL 7894, verify_comuni.mjs passed; DONE in QUESTIONS.md) — [high] Comuni not loaded yet in the real DB → run `node supabase/bootstrap/load_comuni.mjs` (see QUESTIONS.md, chunk 01 answer), then write `## DONE: comuni loaded` in QUESTIONS.md.
- [x] fixed in 31fb197 (npm run test:security: 74 passed, 1 skipped vs real project; SQL files: see QUESTIONS REQUEST) — [medium] T7.5 — after the comuni load, run `rls_test.sql` logic and the API-level security tests against the real project (switch NEXT_PUBLIC_DATA_SOURCE=supabase for that suite).
- [x] fixed in 2e9ee30 (seed) + 6394331 (mock) — [medium] Seed alignment: `seed.sql` + mock data must use the gas advantage "Prezzo **fisso** per tutta la durata del blocco" (Q4) — the real DB already does.
- [x] fixed in 4680481 + 72d00e9 — [low] `estimateGas` falls back to a national zone (E) when a comune has no zone; use the zone of the province capital instead (Q5) — 21 comuni affected.
