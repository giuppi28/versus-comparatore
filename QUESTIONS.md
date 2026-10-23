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

## NOTE (orchestrator, 2026-10-15) — Phase 10 design leftovers for Giuseppe (non-blocking)
Two design-review rounds done (max per brief). Open choices to confirm on the preview:
1. Page 1 background bulb is shown only from 1280px wide (at 1024 it was half off-screen; on tablet/mobile the headline spans the full width, so the bulb is hidden there rather than shown as a cropped sliver). Say if you want a small bulb on mobile anyway (e.g. above the headline).
2. Thank-you decoration is hidden below 1024px for the same reason (cropped slivers looked like artefacts).
3. Dual results titles changed from "Scegli l'offerta Luce/Gas" to "Le migliori offerte Luce/Gas per te" so that "PER TE" is green in every variant as B4 asks.
4. Header trust line "Confronto gratuito · 100% online" is shown only from 1024px (it caused horizontal scroll on tablets).

## APPLY: 20261015170000_lead_snapshots_on_delete.sql
T11.1 (db-builder, 2026-10-15, Phase 11 D1). **Additive and backward compatible** with the app in production (same Supabase project): no DROP statement, no change to RLS, grants, FKs or the lead functions; idempotent (`add column if not exists`, `create or replace function`, `create or replace trigger`).
- `public.leads`: 4 new nullable columns without default (instant, no rewrite): `chosen_offer_luce_snapshot jsonb`, `chosen_offer_gas_snapshot jsonb` (check: JSON object), `current_supplier_luce_name text`, `current_supplier_gas_name text` (check: 1–120 chars). Not in `private.lead_writable_fields()` → the lead RPCs can never write them (`invalid_field`). The production app's `select *` just gets 4 extra keys.
- `BEFORE DELETE` row trigger `offers_snapshot_before_delete` → `private.offers_snapshot_before_delete()`: for each lead with `chosen_offer_luce/gas = old.id`, writes `{offer_id, supplier_name, offer_name, commodity, energy_price, other_variable_costs, fixed_fee_monthly, other_fixed_costs_monthly, locked_months, deleted_at}` into the matching `*_snapshot` when it is null or holds a copy of a *different* offer (an existing copy of the same offer is kept), and sets `chosen_offer_*` to NULL itself (same end state as the existing ON DELETE SET NULL; required so a single statement deleting a supplier's luce **and** gas offer chosen by the same lead does not fail the FK re-check — reproduced in PGlite).
- `BEFORE DELETE` row trigger `suppliers_guard_before_delete` → `private.suppliers_guard_before_delete()`: `is_placeholder = true` → `raise 'placeholder_supplier: "<name>" is a placeholder supplier and cannot be deleted'` (SQLSTATE P0001, PostgREST 400); otherwise stores the name in `current_supplier_*_name` of referencing leads and sets `current_supplier_*` to NULL (same reason). `offers.supplier_id` stays ON DELETE RESTRICT (the app deletes the supplier's offers first; a supplier delete with remaining offers fails with 23001).
- Both functions: schema `private` (not exposed), SECURITY DEFINER, `set search_path = ''`, owner postgres, EXECUTE revoked from public/anon/authenticated (Postgres does not check EXECUTE when firing triggers).
- **Expected advisor impact: none new.** Security: functions are not in an exposed schema, search_path fixed, not executable by API roles. Performance: the trigger lookups use the existing indexes `leads_chosen_offer_{luce,gas}_idx` / `leads_current_supplier_{luce,gas}_idx`; no new FK.
- **Verify:** re-run `app/supabase/tests/data_checks.sql` (new structural checks: 4 columns, 2 BEFORE DELETE row triggers, SECURITY DEFINER + `search_path=""` + owner postgres + no EXECUTE for anon/authenticated/PUBLIC, offers FK RESTRICT, 4 lead FKs SET NULL) → `ALL DATA CHECKS PASSED`; and `app/supabase/tests/rls_test.sql` (rolled back; new DELETIONS section: anon cannot delete leads/offers/suppliers, non-admin and admin-on-aal1 delete 0 rows, admin aal2: placeholder delete rejected, supplier-with-offers RESTRICT leaves no trace, snapshot values/keys, keep-same/replace-stale rule, one-statement delete of a supplier's luce+gas offers, supplier names, bulk lead delete) → `ALL RLS TESTS PASSED`. Quick manual check: `select tgname from pg_trigger where tgname like '%before_delete';` → 2 rows. Validated locally with PGlite (all migrations + seed ×2 + both test files passed; migration applied twice = idempotent).
- After it is applied, the TEST-SECURITY leads can be deleted from the admin leads list (Phase 11 D2).
- **Note (orchestrator):** the Phase 11 preview (`preview/phase11`) talks to the same real DB. Until this migration is applied, deleting an *offer or supplier* from the preview admin would work (RLS allows it) but **without** the snapshot triggers, so leads would lose which offer/supplier they referenced. Lead deletion is unaffected. Giuseppe: please don't delete offers/suppliers on the preview before the reviewer answers this APPLY.
**Answer (reviewer, 2026-10-16 10:42):** applied to the real DB (`felnnfisnobpgetgtxle`) with Giuseppe's explicit OK, migration name `lead_snapshots_on_delete`, file content verbatim (header comment shortened). Verified: 4 new lead columns present; triggers `offers_snapshot_before_delete` + `suppliers_guard_before_delete` present; both functions in `private`, SECURITY DEFINER, `search_path=""`, owner postgres, no EXECUTE for anon/authenticated; offer columns referenced by the trigger all exist. Security advisors: **no new findings** (only the known ones: 3 lead functions + is_admin SECURITY DEFINER by design, `private.app_secrets` RLS-no-policy INFO, leaked-password protection off). DB state: 16 leads (12 TEST-SECURITY), 8 offers, 14 suppliers. Deleting offers/suppliers on the preview is now safe. The security suite (`npm run test:security`) can be run against the real DB.

## Q (T12.2) — Distributor codes to confirm
Phase 12 E5 (logic-builder, `app/src/config/distributors.ts`). No official ARERA list found; please confirm or correct:
- POD prefixes: `IT001` e-distribuzione (certain); `IT002` areti, `IT011` inrete, `IT012` unareti, `IT020` ireti — consistent across several secondary sources (Switcho, Segugio, Selectra), not officially verified.
- PDR first-4-digit table is EMPTY. Italgas `0088` appears in a single source only, so it is NOT included.
- Comune warning assumptions: Roma (ISTAT 058091) served exclusively by areti; Milano (015146) exclusively by unareti; areti PODs are expected only in Roma and Formello (058038). Any other comune with an areti POD triggers the (non-blocking) warning.

## APPLY: 20261023100000_activation_documents_callback.sql
T12.1 (db-builder, 2026-10-23, Phase 12 E2–E4). **Additive and backward compatible** with the app in production (same Supabase project): no DROP of any object (policies are created only when missing, via `pg_policies` checks), no data change, existing RPC signatures unchanged; idempotent (applied twice in PGlite).
- `public.leads`: 9 new nullable columns, no default (instant): `iban` (`^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$`), `iban_holder_different` bool, `iban_holder_first_name` / `iban_holder_last_name` (1–100), `iban_holder_tax_code` (personal CF pattern), `document_type` (`carta_identita|patente|passaporto`), `document_number` (`^[A-Z0-9/-]{4,30}$`), `document_expiry` date (2000–2100), `document_issuer` (2–120). Added to `private.lead_writable_fields()`; `private.apply_lead_patch` recreated (same body + the new columns; IBAN / document number: spaces stripped + upper case; holder CF upper case; `document_expiry: ""` = null). The production app never sends these keys → unchanged behaviour.
- `public.settings.callback_phone text not null default '+39 095 0000000'` (check: 6–20 chars, digits/spaces, optional leading `+`). `settings` stays admin-only. New `public.get_callback_phone() -> text` (SECURITY DEFINER, `search_path=''`, executable by anon/authenticated, returns only that column — the number is shown to every customer on the thank-you page). `complete_lead` recreated with the same signature; its result gains `callback_phone` (ignored by the production app).
- Identity documents: bucket `lead-documents` (**public = false**, 5 MiB, `image/jpeg` + `application/pdf`); table `public.lead_documents` (id, lead_id FK ON DELETE CASCADE, unique `object_path` `<lead_id>/<32 hex>.(jpg|pdf)`, mime, size, status pending/uploaded, expires_at, uploaded_at; RLS on; admin SELECT only + MFA restrictive; anon no privilege). RPCs (SECURITY DEFINER, `LEAD_API_SECRET` + lead token, in-progress lead only): `register_lead_document(p_secret, p_token, p_mime_type, p_size_bytes)` → one-time 5-minute slot (max 2 documents and 20 slots per lead; `invalid_document` / `document_limit_reached`), `confirm_lead_document(p_secret, p_token, p_document_id)` → closes it (`document_not_found`). `storage.objects` policies: `lead_documents_anon_insert` (anon INSERT only when `private.lead_document_upload_allowed(name)`: pending, unexpired slot of an in-progress lead; names unique → single use), `lead_documents_admin_select`, `lead_documents_admin_delete` (is_admin), `lead_documents_require_mfa` (restrictive, bucket-scoped). anon has no SELECT/UPDATE/DELETE on the bucket. **anon gets USAGE on schema `private`** + EXECUTE on that single helper (the policy runs as anon); every other private function/table stays revoked (asserted by `data_checks.sql`).
- **Expected advisor impact:** security — 3 more WARN `anon/authenticated_security_definer_function_executable` (`get_callback_phone`, `register_lead_document`, `confirm_lead_document`), same category and rationale as the existing lead functions (secret-gated, except the callback getter which exposes only a public number). No RLS-disabled / no-policy finding (`lead_documents` has RLS + policies). Performance — possibly `multiple_permissive_policies` on `storage.objects` for authenticated SELECT/DELETE (supplier-logos + lead-documents admin policies), harmless. FK `lead_documents.lead_id` is covered by `lead_documents_lead_idx`.
- **Verify:** `data_checks.sql` (new: 9 nullable columns + writable, callback default, `lead_documents` RLS + privileges, 5 functions SECURITY DEFINER/`search_path`/no PUBLIC, no other `private` function or table usable by anon, bucket config, 4 storage policies, anon INSERT-only) → `ALL DATA CHECKS PASSED`; `rls_test.sql` (rolled back; new PHASE 12 section: normalization + format checks, `get_callback_phone` the only readable setting, secret/token/type/size errors, arbitrary/other-bucket/expired/completed-lead/confirmed paths refused, issued path accepted once, anon cannot list/update/delete objects, max 2, non-admin and admin-aal1 see nothing, admin aal2 reads/deletes objects and edits `callback_phone`, lead delete cascades) → `ALL RLS TESTS PASSED`. Note: on the real DB the SQL `delete from storage.objects` assertions (already present for supplier logos) may be blocked by Supabase's storage delete protection — run that part through the Storage API or skip it. Quick manual checks: `select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'lead-documents';` → `false, 5242880, {image/jpeg,application/pdf}`; `select policyname, roles, cmd from pg_policies where policyname like 'lead_documents_%';` → 6 rows (2 table, 4 storage); with the publishable key `rpc/get_callback_phone` → `"+39 095 0000000"`, `rest/v1/lead_documents` → 401/permission denied, `storage/v1/object/list/lead-documents` → empty. End-to-end (after `/api/lead/document` exists on the preview): upload a JPEG + PDF in step B, preview/download from the admin lead detail, delete the lead → files gone from the bucket. Validated locally with PGlite (all migrations, additive ones ×2, seed ×2, both test files passed).
- Supabase Storage docs: a plain upload (`upsert: false`) needs only INSERT on `storage.objects`; the end-to-end check above confirms it on the real project.

## Q (T12.7) — Document upload limit 4 MB instead of 5 MB
Spec (PHASE12_BRIEF E4) asks for a maximum of 5 MB per file. Implemented: **4 MiB** (`DOCUMENT_MAX_BYTES`, orchestrator decision). Reason: a Vercel Function request body is limited to about 4.5 MB, so a 5 MB upload through `POST /api/lead/document` would be rejected before reaching our code. The private bucket itself accepts 5 MiB.
Options:
- (a) keep 4 MB (current; no infrastructure change);
- (b) direct-to-Storage upload: the server issues a signed upload URL bound to the lead token, and the browser uploads straight to Storage (allows 5 MB; design change: new client upload path, same token binding and one-time slot).
Recommendation: (a) for now; choose (b) only if Aldo needs 5 MB. Please confirm.

## Q (T12.8) — Privacy text "essere ricontattato"
`/privacy` (pre-existing legal text, not written in Phase 12) says the customer will be "ricontattato" (called back). Is this acceptable under the copy rule (no call/callback wording before the thank-you page)? Options: keep it as legal wording, or change it to a neutral "contattato" wording. Giuseppe to confirm. Not a blocker for the preview.
