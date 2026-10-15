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
**Answer:**

## APPLY: 20261015120000_schema.sql
T1.1 schema: extensions (pgcrypto/unaccent/pg_trgm in `extensions`), tables suppliers, offers, comuni, leads, settings (single row), admins; checks, FKs, indexes, updated_at triggers. Before or after applying: **disable public sign-up** in Auth settings (Authentication → Sign In / Providers → "Allow new users to sign up" off) — PRD §4.1. After creating Aldo's auth user, add him with `insert into public.admins (user_id) values ('<auth.users.id>');`.
**Answer:**

## APPLY: 20261015120100_rls_and_lead_functions.sql
T1.2 RLS on all tables + policies (anon: active suppliers/offers + comuni; admin via `is_admin()`), MFA restrictive policies (aal2 required when the user has a verified factor), SECURITY DEFINER `create_lead` / `update_lead` / `complete_lead` (anon-executable, token-scoped), grants. Expected advisor warnings: the three lead functions and `is_admin()` are SECURITY DEFINER executable via the API by design.
**Answer:**

## APPLY: 20261015121100_comuni_data_01.sql
T1.3 comuni data chunk 1/9 (generated, idempotent upsert). The 9 chunks total ~436 kB / 7,894 rows; apply in order (they can also be pasted in the SQL editor).
**Answer:**

## APPLY: 20261015121200_comuni_data_02.sql
T1.3 comuni data chunk 2/9.
**Answer:**

## APPLY: 20261015121300_comuni_data_03.sql
T1.3 comuni data chunk 3/9.
**Answer:**

## APPLY: 20261015121400_comuni_data_04.sql
T1.3 comuni data chunk 4/9.
**Answer:**

## APPLY: 20261015121500_comuni_data_05.sql
T1.3 comuni data chunk 5/9.
**Answer:**

## APPLY: 20261015121600_comuni_data_06.sql
T1.3 comuni data chunk 6/9.
**Answer:**

## APPLY: 20261015121700_comuni_data_07.sql
T1.3 comuni data chunk 7/9.
**Answer:**

## APPLY: 20261015121800_comuni_data_08.sql
T1.3 comuni data chunk 8/9.
**Answer:**

## APPLY: 20261015121900_comuni_data_09.sql
T1.3 comuni data chunk 9/9. Then run `app/supabase/tests/data_checks.sql` (must end with `ALL DATA CHECKS PASSED` once seed.sql is applied too).
**Answer:**

## APPLY: seed.sql (app/supabase/seed.sql — not a migration)
T1.4 seed: 14 suppliers (PRD §6 Block E + 3 special options), the 8 test offers of TASKS T1.4 (price_verified = false), settings row. Idempotent. Afterwards run `app/supabase/tests/rls_test.sql` (rolled back, leaves no data; must end with `ALL RLS TESTS PASSED`).
**Answer:**

## Q5 (T1.3) — Climate-zone source license
Climate zones come from DPR 412/93 Tabella A (official act, not copyrightable) but the machine-readable copy used is Openpolis' table, whose site is CC BY-NC 4.0; VERSUS is commercial. Is this acceptable (facts from a public act), or should we source an official Ministry file? Also: 21 comuni have no zone (mixed-zone mergers + Mola di Bari, Padru) and 104 merged comuni got a zone derived from predecessors that all share the same zone — OK? See app/supabase/README.md.
**Answer:**

## Q6 (T1.2) — create_lead callable directly with the publishable key (Turnstile bypass)
Without a service role key, `create_lead`/`update_lead`/`complete_lead` are executable by `anon`, so anyone with the public key can create leads bypassing Turnstile and the app's rate limit (DB mitigations: 20 kB payload cap + column checks). Options: (a) accept for v1; (b) reviewer provisions a server-only shared secret (e.g. stored in Supabase Vault) that the functions check, passed only from the Next.js server routes — requires a signature change we'd then implement. Recommendation: (b) before go-live.
**Answer:**

## APPLY: 20261015130000_storage_supplier_logos.sql
Creates Storage bucket `supplier-logos` (public read, SVG only, 200 KB) with `storage.objects` policies: select/insert/update/delete only for `public.is_admin()` in that bucket + MFA restrictive policy (verified factor => aal2); anon cannot write or list. Idempotent. Afterwards re-run `app/supabase/tests/rls_test.sql` (now also covers storage; must end with `ALL RLS TESTS PASSED`).
**Answer:**
