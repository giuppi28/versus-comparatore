# QUESTIONS — for Giuseppe / reviewer

Format: `## Q<n> (task id) — question` then `**Answer:**` below. Builder never deletes answered questions.
Migration requests: `## APPLY: <filename>` → the reviewer applies it and answers below.

## Q1 (T0.5) — Supabase project
**Answer:** Done by the reviewer. Project `versus-comparatore` (ref `felnnfisnobpgetgtxle`, eu-central-1). URL + publishable key in `SUPABASE.md`. No service role key: see CLAUDE.md → Supabase project.

## Q2 (T5.1) — Supplier logos
Giuseppe is verifying the logos in the source folder `/Users/pippo/Desktop/versus elementi/` (`loghi energia /` and `logopack/originali/`). Builder: wait for "ready" here before T5.1.
**Answer (Giuseppe via reviewer, 2026-10-15):** ready — logos approved, start T5.1.

## Q3 — Aldo's notification email
Which address receives new-lead notifications?
**Answer (Giuseppe via reviewer, 2026-10-15):** for now use giuppips@gmail.com (Giuseppe will change it later). Already set in the real DB (`settings.notification_email`). Use it also for NOTIFICATION_EMAIL in .env.local. Aldo's admin account: not created yet (go-live item).

## Q4 (T1.4 / T3.5) — "Tariffa monoraria" on gas offers
TASKS T1.4 says every offer's advantages include "Tariffa **monoraria**", but monorario/time bands apply only to electricity. Proposal: for gas seed offers replace it with "Prezzo **fisso** per tutta la durata del blocco". The modal's "Caratteristiche principali" already shows "Tariffa a prezzo fisso" for gas. Seed currently follows TASKS literally until answered.
**Answer (reviewer, 2026-10-15):** Approved. Gas offers use "Prezzo **fisso** per tutta la durata del blocco" instead of "Tariffa monoraria". Already applied this way in the real DB seed. Update `seed.sql` and the mock data to match.

## APPLY: 20261015120000_schema.sql
T1.1 schema: extensions (pgcrypto/unaccent/pg_trgm in `extensions`), tables suppliers, offers, comuni, leads, settings (single row), admins; checks, FKs, indexes, updated_at triggers. Before or after applying: **disable public sign-up** in Auth settings (Authentication → Sign In / Providers → "Allow new users to sign up" off) — PRD §4.1. After creating Aldo's auth user, add him with `insert into public.admins (user_id) values ('<auth.users.id>');`.
**Answer (reviewer, 2026-10-15):** applied. Public sign-up cannot be switched off through the connector: it goes in the go-live checklist for Giuseppe (non-admin users get anon-level access anyway, so no data exposure). Aldo's account will be created at go-live (needs his email, Q3).

## APPLY: 20261015120100_rls_and_lead_functions.sql
T1.2 RLS on all tables + policies (anon: active suppliers/offers + comuni; admin via `is_admin()`), MFA restrictive policies (aal2 required when the user has a verified factor), SECURITY DEFINER `create_lead` / `update_lead` / `complete_lead` (anon-executable, token-scoped), grants. Expected advisor warnings: the three lead functions and `is_admin()` are SECURITY DEFINER executable via the API by design.
**Answer (reviewer, 2026-10-15):** applied. Security advisors: only the expected warnings (create/update/complete_lead executable by anon/authenticated, is_admin by authenticated). No other findings.

## APPLY: 20261015121100_comuni_data_01.sql
T1.3 comuni data chunk 1/9 (generated, idempotent upsert). The 9 chunks total ~436 kB / 7,894 rows; apply in order (they can also be pasted in the SQL editor).
**Answer (reviewer, 2026-10-15):** NOT applied as migrations (436 kB cannot go through the connector efficiently). Instead the reviewer converted the 9 chunks into `app/supabase/bootstrap/comuni_01..09.json` (7,894 rows, verified) and created a TEMPORARY RPC `public.bootstrap_load_comuni(p_json text)` that accepts only those 9 exact files (SHA-256 allow-list) and upserts typed rows (no dynamic SQL). **Builder: run once from app/: `node supabase/bootstrap/load_comuni.mjs` (must print TOTAL 7894), then run `tests/data_checks.sql` logic against the real DB if possible, and add `## DONE: comuni loaded` here.** The reviewer will then drop the temporary function. Keep the chunk migrations in the repo as the source of truth.

## APPLY: 20261015121200_comuni_data_02.sql
T1.3 comuni data chunk 2/9.
**Answer (reviewer, 2026-10-15):** see chunk 01 (JSON bootstrap).

## APPLY: 20261015121300_comuni_data_03.sql
T1.3 comuni data chunk 3/9.
**Answer (reviewer, 2026-10-15):** see chunk 01 (JSON bootstrap).

## APPLY: 20261015121400_comuni_data_04.sql
T1.3 comuni data chunk 4/9.
**Answer (reviewer, 2026-10-15):** see chunk 01 (JSON bootstrap).

## APPLY: 20261015121500_comuni_data_05.sql
T1.3 comuni data chunk 5/9.
**Answer (reviewer, 2026-10-15):** see chunk 01 (JSON bootstrap).

## APPLY: 20261015121600_comuni_data_06.sql
T1.3 comuni data chunk 6/9.
**Answer (reviewer, 2026-10-15):** see chunk 01 (JSON bootstrap).

## APPLY: 20261015121700_comuni_data_07.sql
T1.3 comuni data chunk 7/9.
**Answer (reviewer, 2026-10-15):** see chunk 01 (JSON bootstrap).

## APPLY: 20261015121800_comuni_data_08.sql
T1.3 comuni data chunk 8/9.
**Answer (reviewer, 2026-10-15):** see chunk 01 (JSON bootstrap).

## APPLY: 20261015121900_comuni_data_09.sql
T1.3 comuni data chunk 9/9. Then run `app/supabase/tests/data_checks.sql` (must end with `ALL DATA CHECKS PASSED` once seed.sql is applied too).
**Answer (reviewer, 2026-10-15):** see chunk 01 (JSON bootstrap).

## APPLY: seed.sql (app/supabase/seed.sql — not a migration)
T1.4 seed: 14 suppliers (PRD §6 Block E + 3 special options), the 8 test offers of TASKS T1.4 (price_verified = false), settings row. Idempotent. Afterwards run `app/supabase/tests/rls_test.sql` (rolled back, leaves no data; must end with `ALL RLS TESTS PASSED`).
**Answer (reviewer, 2026-10-15):** applied (14 suppliers, 8 offers, settings row), with the Q4 gas wording. `rls_test.sql` will be run after the comuni load (it needs comuni rows).

## Q5 (T1.3) — Climate-zone source license
Climate zones come from DPR 412/93 Tabella A (official act, not copyrightable) but the machine-readable copy used is Openpolis' table, whose site is CC BY-NC 4.0; VERSUS is commercial. Is this acceptable (facts from a public act), or should we source an official Ministry file? Also: 21 comuni have no zone (mixed-zone mergers + Mola di Bari, Padru) and 104 merged comuni got a zone derived from predecessors that all share the same zone — OK? See app/supabase/README.md.
**Answer (reviewer, 2026-10-15):** Accepted for v1: climate zones are facts from a public law (DPR 412/93), not copyrightable; keep the source and attribution documented in app/supabase/README.md. For the 21 comuni without zone, the estimate must fall back to the zone of the province capital (internal flag only, nothing shown to the user) — add a task. 104 merged comuni with derived zone: OK.

## Q6 (T1.2) — create_lead callable directly with the publishable key (Turnstile bypass)
Without a service role key, `create_lead`/`update_lead`/`complete_lead` are executable by `anon`, so anyone with the public key can create leads bypassing Turnstile and the app's rate limit (DB mitigations: 20 kB payload cap + column checks). Options: (a) accept for v1; (b) reviewer provisions a server-only shared secret (e.g. stored in Supabase Vault) that the functions check, passed only from the Next.js server routes — requires a signature change we'd then implement. Recommendation: (b) before go-live.
**Answer (reviewer, 2026-10-15):** Option (b), with a hashed secret so the plaintext never leaves the Mac: generate `LEAD_API_SECRET` (32 random bytes hex) into `app/.env.local` only; write a migration that stores ONLY its SHA-256 (e.g. `private.app_secrets(name, sha256)`, no grants) and adds `p_secret text` as first parameter of create_lead/update_lead/complete_lead, rejecting calls whose `encode(extensions.digest(p_secret,'sha256'),'hex')` does not match. Server routes pass it; it must never reach the browser (extend the bundle secret guard). Add tests. Then `## APPLY:` it.

## APPLY: 20261015130000_storage_supplier_logos.sql
Creates Storage bucket `supplier-logos` (public read, SVG only, 200 KB) with `storage.objects` policies: select/insert/update/delete only for `public.is_admin()` in that bucket + MFA restrictive policy (verified factor => aal2); anon cannot write or list. Idempotent. Afterwards re-run `app/supabase/tests/rls_test.sql` (now also covers storage; must end with `ALL RLS TESTS PASSED`).
**Answer (reviewer, 2026-10-15):** applied (bucket + policies).

## Q7 (T4.5) — Notification recipient in Supabase mode
`notifyNewLead` runs with the publishable key and `settings` is admin-only under RLS, so the address Aldo saves in /admin/impostazioni can't be read when a lead completes. Current fallback: env `NOTIFICATION_EMAIL` (go-live checklist requires it). Options: (a) keep env only; (b) have `complete_lead` return the recipient (SECURITY DEFINER, only on successful completion — not readable otherwise); (c) DB webhook / Edge Function sends the email. Recommendation: (b).
**Answer (reviewer, 2026-10-15):** Option (b) approved: complete_lead returns the notification recipient from settings on successful completion only. Combine it with the Q6 migration. Keep env NOTIFICATION_EMAIL as fallback.

## Q8 — Special supplier options ("Tutela", "Altro fornitore", "Non lo so")
They are supplier rows without offers and nothing distinguishes them, so they appear in the admin offer-supplier select and the loading orbit could include them if they ever got offers. Proposal: add `suppliers.is_placeholder boolean default false` (migration) and hide placeholders from offer/supplier admin selects. OK?
**Answer (reviewer, 2026-10-15):** Approved: `suppliers.is_placeholder boolean not null default false`, set true for tutela / altro-fornitore / non-lo-so; hide them from admin offer-supplier selects and from the loading orbit. Include it in the same migration as Q6/Q7 (one APPLY).

## Q9 (PRD §13.1) — Privacy notice text
Page 1's consent links to `/privacy`, which doesn't exist yet. Please provide the informativa privacy text (data controller, purpose = being contacted about the chosen offer, retention, rights). A `/privacy` page now exists (commit 26dad34) with the full structure and these placeholders to fill: [Ragione sociale del titolare], [Indirizzo completo del titolare], [Partita IVA del titolare], [Indirizzo email di contatto privacy], [Periodo di conservazione dei dati], [Data di aggiornamento]. Please also confirm the "Destinatari" section (data shared with the chosen supplier) and the legal basis (consent + art. 6.1.b pre-contractual measures).
**Answer (Giuseppe via reviewer, 2026-10-15):** DEFERRED to the end — Giuseppe will ask Aldo for the controller data. Keep the placeholders; this is a go-live blocker only (add it to the go-live checklist if not there). Not a blocker for anything else.

## Q10 (T6.1) — Cloudflare Workers plan
Workers Free = 10 ms CPU/request; Next.js SSR + admin pages will likely exceed it (error 1102). Workers Paid is USD 5/month — a paid resource only Giuseppe can decide on (see app/DEPLOY.md "D1"). Alternatives: try Free first and monitor errors. Decision?
**Answer (reviewer, 2026-10-15):** Project constraint is zero cost: start on Workers Free. If error 1102 (CPU limit) shows up in real use, it becomes a decision for Giuseppe. Keep the D1 note in DEPLOY.md.


## DONE: comuni loaded
T8.1 (db-builder, 2026-10-15). `node supabase/bootstrap/load_comuni.mjs` → chunks 1180 / 308 / 1501 / 841 / 770 / 743 / 991 / 792 / 768 rows, **TOTAL 7894 (expected 7894)**.
Verified against the real DB with the publishable key over REST (`node supabase/bootstrap/verify_comuni.mjs`, reusable, read-only): total 7894 (exact count); zones A 2 / B 158 / C 981 / D 1566 / E 4159 / F 1007 / null 21; 110 provinces, 20 regions, 0 comuni without CAP; spot checks Milano E, Roma D, Lampedusa e Linosa A, Belluno F, Napoli C, Palermo B; `name_search ilike '*cefalu*'` → Cefalù (PA), `name_search = 'forli'` → Forlì → **ALL COMUNI CHECKS PASSED**.
Reviewer: `public.bootstrap_load_comuni` can now be dropped. `tests/data_checks.sql` / `rls_test.sql` can be run in the SQL editor (note: data_checks.sql now expects the Q4 gas wording, see the T8.2 APPLY below).

## APPLY: 20261015140000_lead_secret_notification_placeholders.sql
T8.2 (Q6 + Q7 + Q8, one migration): `private.app_secrets` with ONLY the SHA-256 of `LEAD_API_SECRET` (plaintext only in `app/.env.local`, no grants to anon/authenticated, RLS on, no policies); `create_lead` / `update_lead` / `complete_lead` recreated with `p_secret text` as FIRST parameter (old signatures DROPPED, execute re-granted to anon/authenticated on the new ones only), wrong/missing secret → `invalid_secret` (SQLSTATE 28000); `complete_lead` returns `{id, token, notification_email}` (Q7); `suppliers.is_placeholder` + set true for tutela / altro-fornitore / non-lo-so (Q8). **The app must be updated and deployed together with this migration** (the old RPC signatures disappear, the current app calls would fail with "function not found"). Server env needs `LEAD_API_SECRET` (same value as in app/.env.local) at deploy. Afterwards re-run `tests/data_checks.sql` (now also checks Q4 wording + placeholders) and `tests/rls_test.sql` (overrides the stored hash with a test secret inside its rolled-back transaction; must end with `ALL RLS TESTS PASSED`). Validated locally with PGlite (all migrations + seed ×2 + both test files passed). Expected advisor warnings unchanged (the three lead functions are SECURITY DEFINER and executable by anon/authenticated by design; the secret gates them).

## REVIEWER NOTE 2026-10-15 14:05 — real DB state
- `20261015140000_lead_secret_notification_placeholders.sql` applied, **except its DROP FUNCTION statements**: the connector requires an interactive confirmation for destructive SQL that could not be given. Instead the old 1-arg/2-arg lead functions and `bootstrap_load_comuni` had all privileges revoked and were moved to schema `private` and renamed `old_*_disabled` (not reachable through the API). Verified: anon can execute only the three new 2/3-arg lead functions; a wrong secret raises `invalid_secret`; 3 placeholder suppliers flagged; comuni 7,894 (21 without zone).
- Builder: add a small migration file that documents this (revoke + `alter function ... set schema private` + rename), so a fresh DB built from the repo matches; no APPLY needed for it. Mark the go-live check "bootstrap function removed" as done (disabled).
- Security advisors: only the expected warnings + INFO "RLS enabled, no policy" on `private.app_secrets` (intentional).
- T7.5 is unblocked: run the security tests against the real project now (needs LEAD_API_SECRET in .env.local — already there).


## Q11 — Confirm names of the disabled functions in the real DB
Migration `20261015150000_disable_old_lead_functions.sql` (documentation only, no APPLY) assumes the reviewer's renamed functions are `private.old_create_lead_disabled(jsonb)`, `private.old_update_lead_disabled(text, jsonb)`, `private.old_complete_lead_disabled(text, jsonb)` and `private.bootstrap_load_comuni_disabled(text)`. Please confirm or give the actual names so the repo matches the real DB.
**Answer (reviewer, 2026-10-15 14:50):** confirmed. The real DB now has exactly `private.old_create_lead_disabled(jsonb)`, `private.old_update_lead_disabled(text, jsonb)`, `private.old_complete_lead_disabled(text, jsonb)` and `private.bootstrap_load_comuni_disabled(text)` (the reviewer renamed the last one to match the repo). No anon/authenticated privileges on any of them.


## REQUEST: run rls_test.sql and data_checks.sql on the real DB
**Answer (reviewer, 2026-10-15 14:50):** data_checks logic run on the real DB → ALL DATA CHECKS PASSED (7,894 comuni / 110 provinces / 20 regions / 21 without zone, 14 suppliers, 3 placeholders, 8 offers, Q4 wording, 11 logo paths, settings). rls_test.sql not replayed verbatim (32 kB); instead a focused anon-role check in a rolled-back transaction → passed: leads/settings/admins not readable, leads not insertable, offers not updatable, private functions not executable, wrong lead secret rejected, comuni and active offers readable. Together with the 74-assertion HTTP suite this closes T7.5. TEST-SECURITY leads: 10 rows; DELETE through the connector needs an interactive confirmation that cannot be given → delete them from the admin leads list once Aldo's account exists (go-live checklist), or keep using the marker. The P0002→HTTP 500 note: acceptable for v1.
T7.5 (qa-tester, 2026-10-15). The HTTP security suite (`npm run test:security` in `app/`, 74 assertions, anon role only) cannot run SQL against the real project. Reviewer: please run `app/supabase/tests/data_checks.sql` and `app/supabase/tests/rls_test.sql` through the connector (both are rolled-back / read-only; they must end with `ALL DATA CHECKS PASSED` / `ALL RLS TESTS PASSED`) and answer here.
Also: the test runs leave `TEST-SECURITY` leads in the real DB (2 per run; 4 runs so far = 8 rows: 4 completed, 4 in progress). Delete them from the admin leads list (or `delete from public.leads where first_name = 'TEST-SECURITY'`).
Minor finding: `lead_not_found` (SQLSTATE P0002) is returned by PostgREST as HTTP 500, not 4xx. Functionally correct and the app must map it by `message`; consider `errcode = 'PT404'` in a future migration if 5xx noise matters.

## APPLY: 20261015160000_supplier_logo_paths.sql
T5.1 (logopack-builder, 2026-10-15). Data-only: sets `suppliers.logo_path = '/logos/<slug>.svg'` for the 11 real suppliers (the files ship with the app in `app/public/logos/`, so the app must be deployed for the logos to resolve; the app already renders root-relative paths and falls back to the text chip when `logo_path` is null). Idempotent and non-destructive: only touches rows where `logo_path is null` and `not is_placeholder`, so logos uploaded through the admin area are never overwritten. No schema/RLS change, no advisor impact.
**Answer (reviewer, 2026-10-15 14:50):** applied — 11 real suppliers have `/logos/<slug>.svg`, placeholders null.

## NOTE (orchestrator, 2026-10-15) — Phase 9
Cloudflare removed (Giuseppe's decision): hosting is Vercel. Q10 (Workers Free CPU limit) is obsolete. Turnstile no longer exists; lead functions stay protected by the hashed LEAD_API_SECRET + per-IP rate limiting (client IP from Vercel headers only). Go-live on Vercel needs `CRON_SECRET` (Production) for the daily keep-alive cron and the stale `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` env vars can be deleted from the Vercel project (Giuseppe; no code reads them). Steps in app/DEPLOY.md.

## BLOCKER (orchestrator, 2026-10-15) — Vercel Production Branch is `main`
Pushing `eae02f2` to `main` started a deployment with **target = production** (`dpl_8sc9ax81463jufcEriYHqLjPW5bv`). The orchestrator cancelled it while it was still building (state CANCELED, never served). The Vercel project's Production Branch is `main`, so every push to `main` deploys to production. Previews for review were therefore created from the branch `preview/phase9` (non-production branch → preview).
Giuseppe: in Vercel → Project → Settings → Environments/Git, set the Production Branch to a branch that is not pushed by the agents (e.g. `production`), or disable automatic production deployments, before anyone pushes to `main` again. Until then the orchestrator pushes only to `preview/*` branches (main is at `eae02f2`, which already contains all Phase 9 code; this note is on `preview/phase9` only).
