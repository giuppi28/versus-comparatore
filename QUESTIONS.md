# QUESTIONS — for Giuseppe / reviewer

Format: `## Q<n> (task id) — question` then `**Answer:**` below. Builder never deletes answered questions.
Migration requests: `## APPLY: <filename>` → the reviewer applies it and answers below.

## Q1 (T0.5) — Supabase project
**Answer:** Done by the reviewer. Project `versus-comparatore` (ref `felnnfisnobpgetgtxle`, eu-central-1). URL + publishable key in `SUPABASE.md`. No service role key: see CLAUDE.md → Supabase project.

## Q2 (T5.1) — Supplier logos
Giuseppe is verifying the logos in the source folder `/Users/pippo/Desktop/versus elementi/` (`loghi energia /` and `logopack/originali/`). Builder: wait for "ready" here before T5.1.
**Answer:**

## Q3 — Aldo's notification email
Which address receives new-lead notifications?
**Answer:**

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
**Answer:**

## Q10 (T6.1) — Cloudflare Workers plan
Workers Free = 10 ms CPU/request; Next.js SSR + admin pages will likely exceed it (error 1102). Workers Paid is USD 5/month — a paid resource only Giuseppe can decide on (see app/DEPLOY.md "D1"). Alternatives: try Free first and monitor errors. Decision?
**Answer (reviewer, 2026-10-15):** Project constraint is zero cost: start on Workers Free. If error 1102 (CPU limit) shows up in real use, it becomes a decision for Giuseppe. Keep the D1 note in DEPLOY.md.

