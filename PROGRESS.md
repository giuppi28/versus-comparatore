# PROGRESS — append-only log (builder)

Format: `## YYYY-MM-DD HH:MM — T<id> <title>` · what changed · how verified · commit.

## 2026-10-15 11:50 — T0.1–T0.5 Setup (scaffold, tooling, UI kit, data layer)
- Agent: setup-builder (sonnet).
- Changed: Next.js 16.4 app in `app/` (TS strict, Tailwind, ESLint), git init + origin; Vitest + Playwright (desktop 1440 / mobile 390); VERSUS green design tokens + UI kit (`src/components/ui`); `.env.example` (empty values), `.env.local` (gitignored), `app/README.md`; data-access layer `src/lib/data` with mock + Supabase repositories switched by `NEXT_PUBLIC_DATA_SOURCE`.
- Notes: removed generated `cacheComponents`/`partialPrefetching` from next.config (cookie/token routes, OpenNext); lead.commodity = luce|gas|dual; current_supplier_* stores suppliers.id; special dropdown options seeded as supplier rows without offers. RPC contract documented in `supabase-repository.ts`.
- Verified by orchestrator: typecheck ✓, lint ✓, vitest 76/76 ✓, e2e smoke 2/2 (desktop+mobile) ✓.
- Commit: 4431fb4

## 2026-10-15 12:00 — T2.1–T2.3 Core logic
- Agent: logic-builder (sonnet).
- Changed: `src/config/consumption.ts` (all PRD §6 coefficients), `src/lib/logic` (estimateLuce/estimateGas, monthlyCost, rankOffers, formatEuro/formatPrice, validators CF/P.IVA/POD/PDR/phone with Italian messages); coverage-v8 + 100% threshold on validators.
- Decisions: null climate zone → fallback zone E; riscaldamento requires sqm range in UI; people 5+ = 5; monthly prefill rounded to integer; formatters use NBSP before €; POD 15 chars → keep first 14; phone stored as national digits.
- Verified by orchestrator: typecheck ✓, lint ✓, vitest 145/145 ✓, coverage logic 100% stmts/branches/functions/lines ✓.
- Commit: d58f03e

## 2026-10-15 12:05 — T3.3 Loading screen
- Agent: loading-builder (sonnet).
- Changed: `src/components/loading` — LoadingScreen (orbiting supplier chips with text fallback, logoUrl-ready; PRD §7 messages; progressbar; reduced-motion path; excludeSupplierIds; onStart/onComplete).
- Notes: orbit capped at 10 suppliers, N = shown count; centre uses versus_icona.svg. Browser check at 390/1440 pending until a route mounts it (covered by flow e2e).
- Verified by orchestrator: vitest loading 12/12 ✓, eslint ✓, no tsc errors in folder ✓.
- Commit: 7a2f1f4

## 2026-10-15 12:10 — T3.5 Offer modal
- Agent: offer-modal-builder (sonnet).
- Changed: `src/components/offer-modal` — OfferModal on shared Modal/Button; advantages rendered only from offer data with safe **bold** parsing; Caratteristiche principali; promo; collapsible details; full-screen sheet on mobile with pinned CTA.
- Notes: gas shows "Tariffa a prezzo fisso" (monoraria applies to luce only) — see QUESTIONS Q4; caller must pass resolved logoUrl (text chip fallback). Mobile layout to be checked in flow e2e.
- Verified by orchestrator: vitest offer-modal 16/16 ✓, eslint ✓, no tsc errors in folder ✓.
- Commit: 677ee75

## 2026-10-15 12:15 — T4.1 Admin login + protection + MFA
- Agent: admin-auth-builder (opus).
- Changed: `src/proxy.ts` (Next 16 proxy: session refresh, redirect, fail-closed, no-store/noindex), `src/lib/auth` (getAuth/requireAdmin, supabase + mock providers, HMAC mock session refused in production, rate limit, Turnstile), `src/app/admin/login` (login, MFA verify, MFA enrol), `src/app/admin/(protected)/` layout + dashboard shell. Deps: @supabase/ssr (+ zod from T3.1).
- Convention: all admin pages go under `app/src/app/admin/(protected)/{leads,fornitori,offerte,impostazioni}`; every page AND server action calls requireAdmin(); admin data uses createSupabaseServerClient() (RLS as admin).
- Needs: public.is_admin() from db-builder; reviewer must create Aldo's user + admins row, disable sign-ups, enable TOTP + leaked-password protection; real Turnstile keys before go-live. In-memory rate limiter is per-isolate (deploy-prep decision).
- Verified by orchestrator: vitest auth 67/67 ✓, eslint ✓, tsc ✓, playwright admin-auth + smoke 14/14 (desktop+mobile) ✓.
- Commit: 01744cd

## 2026-10-15 12:25 — T3.1 Lead API + customer flow state
- Agent: lead-api-builder (opus).
- Changed: `/api/lead` (POST create / PATCH forward-only update / DELETE), `/api/lead/complete` (full PRD §10 server validation, notifyNewLead stub, cookies expired); `src/lib/lead` (zod strict schemas, Turnstile w/ offline test keys, in-memory rate limit, Origin check, client helpers, sessionStorage flow state + FlowProvider/useFlow); `(public)/layout.tsx` mounts provider; README section.
- Decisions: power "Altro" stored as null; estimated_*_year stores the annual figure actually used (manual flag separate); create requires only consent; CAP checked as 5 digits only.
- Follow-ups: db-builder SQL must also enforce forward-only step / no update after completed; deploy-prep: WAF rate-limit rule + Turnstile keys; admin-settings: Resend inside notify.ts from `data`; page1: move home into (public).
- Verified by orchestrator: vitest lead 114/114 ✓, eslint ✓, no tsc errors in its folders ✓ (agent also ran full e2e 14/14 + curl lifecycle).
- Commit: 2cba8c6

## 2026-10-15 12:45 — T1.1–T1.4 Database
- Agent: db-builder (opus).
- Changed: `app/supabase/migrations` (schema; RLS + is_admin + RESTRICTIVE MFA policies (aal2 when a verified factor exists) + create/update/complete_lead SECURITY DEFINER with whitelists, forward-only step, completed-lock; 9 comuni data files), `seed.sql` (14 suppliers, 8 offers per T1.4, settings), `tests/` (rls_test.sql ~45 assertions, data_checks.sql, PGlite runner), `scripts/build_comuni.py`, README with sources.
- Data: 7,894 comuni (ISTAT xlsx 21/02/2026 CC BY 4.0; CAPs Samurai016/Comuni-ITA MIT; zones DPR 412/93 Tab. A via Openpolis). Zones A2 B158 C981 D1566 E4159 F1007; 21 without zone (null).
- APPLY requests + Q5 (zone source licence) + Q6 (anon RPC Turnstile bypass) in QUESTIONS.md.
- Verified by orchestrator: PGlite run_local.mjs → ALL DATA CHECKS PASSED, ALL RLS TESTS PASSED.
- Commit: f9da2a4
- Also: 8645f3e fix(admin-auth) non-canonical signature rejection + stable tamper test.

## 2026-10-15 12:55 — T3.7 Thank-you page
- Agent: thankyou-builder (haiku).
- Changed: `(public)/grazie` — "Grazie, [Nome]!", exact callback sentence (only place), offer summary (+ total for dual), "Torna alla home"; snapshot copied then flow reset; renders only when flow `leadCompleted` is true (activation must set it after complete succeeds — relayed to activation-form-builder).
- Verified by orchestrator: vitest 6/6 ✓, eslint ✓, playwright thankyou 16/16 (desktop+mobile) ✓. Screenshots e2e/screenshots/thankyou-*.png.
- Commit: fd6444f

## 2026-10-15 13:00 — Support for T4.x: admin data access
- Agent: setup-builder (sonnet).
- Changed: `src/lib/data/admin.ts` getAdminRepository() (requireAdmin + session client under RLS; mock = shared singleton), admin CRUD methods in both repos, typed errors, resolveLogoUrl, resetMockRepository (non-prod mock only); mock comuni fixed (ISTAT codes, Aosta/Bolzano zone E, a null-zone comune added); server-only dep.
- Verified by orchestrator: tsc ✓, eslint ✓, vitest src/lib 315/315 ✓.
- Commit: 3bc7dc3

## 2026-10-15 13:10 — Storage bucket migration (T4.3 support)
- Agent: db-builder (opus).
- Changed: migration 20261015130000_storage_supplier_logos.sql (public bucket, SVG only, 200 KB, admin-only write + MFA restrictive policy); storage stub + RLS assertions; APPLY request.
- Verified by orchestrator: PGlite runner → ALL DATA CHECKS PASSED, ALL RLS TESTS PASSED.
- Commit: 4d3a8e9

## 2026-10-15 13:15 — T3.4 Results page
- Agent: results-builder (sonnet).
- Changed: `(public)/offerte` + `src/components/results` — loading screen integration (onStart PATCH step results; `?fast=1` / NEXT_PUBLIC_LOADING_MS override; not replayed for same inputs via `versus.results.loaded.v1`), editable monthly consumption recalculating instantly, offer cards (featured band, promo, stima tooltip IVA esclusa, inline "Vedi dettagli"), current-supplier exclusion per commodity (only for cambio fornitore/voltura), OfferModal → chosenOffers + PATCH, Luce+Gas two-step with back.
- Note: dual luce choice PATCHes chosen_offer_luce without step change; offer_chosen set after gas choice.
- Verified by orchestrator: vitest 19/19 ✓, eslint ✓, tsc ✓, playwright results 22/22 (desktop+mobile) ✓. Infra note: parallel Playwright runs collide on app/test-results → use `--output` per run.
- Commit: 2ae0417

## 2026-10-15 13:20 — T3.6 Activation form
- Agent: activation-form-builder (sonnet).
- Changed: `(public)/attivazione` + `src/components/activation` — Step A (CF with check char + name consistency, P.IVA for business, housing title), Step B (comune/CAP, address, residente, Luce POD/potenza/tensione, Gas PDR/usi; supplier hidden for subentro/primo allaccio; POD/PDR optional for primo allaccio), sticky summary (dual total), Turnstile, server 422 field mapping, 429/5xx/expired session messages; sets leadCompleted before /grazie; step persisted in `versus.activation.step.v1`.
- Verified by orchestrator: vitest 25/25 ✓, eslint ✓, playwright activation 32/32 (desktop+mobile) ✓.
- Infra: Next 16 refuses a second `next dev` in the same folder → parallel e2e runs must reuse the running server's PORT and use a private `--output`.
- Commit: a328514

## 2026-10-15 13:35 — T4.3 / T4.4 / T4.5 Admin suppliers, offers, settings (unit-verified; e2e pending consolidated run)
- Agents: admin-suppliers-builder, admin-offers-builder, admin-settings-builder (sonnet).
- T4.3 (c28cb6e): /admin/fornitori CRUD; `src/lib/svg/sanitize.ts` allowlist sanitizer on @xmldom/xmldom (Workers-safe; rejects XXE/entities, strips scripts/handlers/external refs/foreignObject/filters; real logos preserved).
- T4.5 (c28cb6e): /admin/impostazioni notification email + go-live checklist; Resend via fetch, log-only without key/from/recipient; recipient = settings (mock) or NOTIFICATION_EMAIL env (supabase, RLS limitation — see Q7). New env keys RESEND_FROM, NOTIFICATION_EMAIL, NEXT_PUBLIC_SITE_URL.
- T4.4 (2da5c9b): /admin/offerte list ("Visibili ai clienti"), create/edit with every PRD §5.3 field, month/year toggle (÷12), advantages editor with bold preview, live cost preview, toggles.
- Verified by orchestrator: vitest svg+fornitori 153/153, notify+lead+impostazioni 141/141, offerte 20/20 ✓; eslint ✓. E2E reported green by agents (suppliers 6/6, settings 6/6, offers 14/14) but my own re-run was disrupted by concurrent dev servers → tasks stay [~] until the consolidated e2e run.
- Found gap: results page loads offers client-side → admin changes invisible in mock mode; sent back to results-builder.

## 2026-10-15 13:45 — T3.2 Page 1 (unit-verified; e2e pending consolidated run)
- Agent: page1-builder (sonnet).
- Changed: `(public)/page.tsx` (server, suppliers for dropdowns), `src/components/page1` (blocks A–F, visibility rules, live estimates, manual consumption, inline validation + focus first error), `/api/comuni` (search, rate limited), lead created on consent + Turnstile, PATCH + navigate /offerte on submit; old placeholder `src/app/page.tsx` removed.
- Decisions: edits to result-affecting inputs reset chosen offers; privacy link → /privacy (page not yet built, PRD §13.1 open); Partita IVA not asked "Hai già il gas".
- Verified by orchestrator: vitest 29/29 ✓, eslint ✓. Agent ran e2e 61 passed / 1 skipped in a scratch copy (dev-server lock).
- Commit: b3b7fc0

## 2026-10-15 13:55 — T4.2 Admin leads (unit-verified; e2e pending consolidated run)
- Agent: admin-leads-builder (sonnet).
- Changed: /admin/leads (Completati/Parziali/Tutti tabs, URL-driven filters + search + pagination), /admin/leads/[id] (grouped fields, offer names resolved, no token rendered), status + notes server action (requireAdmin, zod).
- Verified by orchestrator: vitest 12/12 ✓, eslint ✓. Agent ran e2e 12/12 in a scratch copy.
- Commit: cbff07b

## 2026-10-15 14:10 — Consolidated verification + T3.4 server offers + /privacy
- T3.4 follow-up (e5b2ae7, results-builder): /offerte loads offers server-side (force-dynamic) → admin changes reach customers; new e2e proves it.
- /privacy (26dad34, page1-builder): GDPR structure with placeholders (Q9).
- Orchestrator consolidated run on a single clean dev server: typecheck ✓, lint ✓ (0 errors), vitest 681/681 ✓, Playwright full suite 182 passed / 1 skipped / 1 failed (admin-settings exact offer count, test-isolation issue with parallel specs → sent back to admin-settings-builder).
- T3.2, T4.2, T4.3, T4.4 marked done (their e2e green in the consolidated run).

## 2026-10-15 14:20 — T4.5 done
- admin-settings-builder: go-live e2e asserts seed unverified offers by id (robust to parallel specs). Full suite rerun: all admin-settings green; only failure = activation 'back buttons keep the data' (cold-start flaky, 1/3 runs) → sent to activation-form-builder.

## 2026-10-15 14:30 — Activation flake fixed; Phase 7 started
- c05bfdc test(activation): /offerte RSC fetch now stubbed (root cause: glob missed ?_rsc request → real page redirect on cold compile). Orchestrator verified 32/32 on fresh server.
- qa-tester started on T7.1–T7.4, T7.6. T7.5 BLOCKED until migrations are applied on Supabase.

## 2026-10-15 14:45 — T6.1 Deploy preparation (no deploy)
- Agent: deploy-prep-builder (sonnet).
- Changed: open-next.config.ts (static-assets cache, no paid resources), wrangler.jsonc (nodejs_compat; cron + vars commented), cloudflare/worker.ts + keepalive.ts (daily Supabase ping, disabled), cloudflare/check-bundle-env.mjs (build:cf fails if non-public env embedded — OpenNext embeds .env* into the bundle), DEPLOY.md; scripts build:cf / preview:cf only (no deploy script).
- Results: next build ✓ (supabase mode), opennextjs-cloudflare build ✓ (~2.1 MB gzip), local wrangler dev smoke ✓ (proxy redirect, lead API errors, comuni, cron ping vs stub).
- Risk: Workers Free 10 ms CPU likely insufficient for SSR → Q10.
- Verified by orchestrator: vitest cloudflare 13/13 ✓, eslint ✓, tsc 0 errors ✓; no deploy script present.
- Commit: 3f9d086

## 2026-10-15 15:30 — Phase 7 test matrix (T7.1–T7.4, T7.6) — commit 6db8d34
- Agent: qa-tester (sonnet); config/README follow-up by setup-builder.
- Run: `PORT=<port> npm run e2e:matrix` (app/playwright.matrix.config.ts; parallel phase + @serial admin CRUD phase).
- Matrix: T7.1 flow cases 218 desktop + 42 mobile (luce 28, gas 74, dual 116; every commodity × customer × service on both viewports; gas uses incl. riscaldamento zones A–F + null-zone fallback; estimated + manual consumption; Edison/Eni Plenitude exclusion). Pruning rules in e2e/matrix/cases.ts, checked by cases.spec.ts. Each case: Page 1 → consent (POST 201) → results (exact rankOffers order, exclusion, cents cost) → modal → activation A+B → thank-you; lead read back via admin at page1 / offer_chosen / completed.
- T7.2 validation 32 desktop / 29 mobile; T7.3 copy (MutationObserver over full flows, no call/demo/Facile.it terms, no orange, callback only on thank-you); T7.4 admin (13 routes blocked anon, CRUD, malicious SVG, deactivate/feature reflected publicly); T7.6 screenshots of every screen at 390/1440 + Lighthouse a11y ≥ 96 everywhere (100 on /, /offerte, /privacy).
- Orchestrator verification: typecheck ✓, lint ✓, vitest 694/694 ✓, matrix 382/382 parallel + 6/6 serial = 388/388 (100%) ✓. Agent: 2 consecutive green runs, no flaky tests.

## 2026-10-15 15:35 — LOOP SUMMARY (orchestrator stopping: no unblocked task left)
Done: Phase 0–4, T6.1, T7.1–T7.4, T7.6. All checks green (typecheck, lint, 694 unit tests, 388 e2e matrix tests + area specs).
Blocked (needs Giuseppe / reviewer):
- APPLY: 11 migrations + seed.sql + storage migration (QUESTIONS.md) → then T7.5 (security tests against real Supabase) and T7.7 final sign-off.
- T5.1 logo pack → Q2 "ready".
- Decisions: Q3 notification email, Q4 gas "monoraria", Q5 climate-zone source licence, Q6 anon RPC Turnstile bypass, Q7 notification recipient in Supabase mode, Q8 placeholder suppliers flag, Q9 privacy text, Q10 Workers plan.
Known limitations: real Supabase flow (auth/MFA, RLS, storage) untested until migrations applied; in-memory rate limits per isolate (WAF rule in DEPLOY.md); minor Lighthouse color-contrast on small text (scores 96–97); privacy page has placeholders.

## 2026-10-15 16:00 — T8.5 Go-live checklist additions
- Agent: admin-settings-builder (sonnet).
- Changed: 'Verifiche manuali' block (sign-up disabled, Aldo admin row, bootstrap function dropped) — informational, not part of the automatic Pronto status; DEPLOY.md: Q10 decision (Workers Free, monitor 1102), LEAD_API_SECRET as Cloudflare secret, manual items with SQL.
- Verified by orchestrator: vitest 14/14 ✓, eslint ✓ (agent: e2e admin-settings 6/6).
- Commit: 825fda9

## 2026-10-15 16:20 — T8.1, T8.3, T8.4, T8.2 (SQL half)
- T8.1 (db-builder, opus): comuni loaded via reviewer bootstrap RPC → TOTAL 7894; new `supabase/bootstrap/verify_comuni.mjs` (REST, publishable key) → zones A2 B158 C981 D1566 E4159 F1007 null21, 110 provinces, accent-insensitive search OK. `## DONE: comuni loaded` in QUESTIONS.md (reviewer can drop bootstrap_load_comuni). Orchestrator re-ran verify_comuni: ALL COMUNI CHECKS PASSED.
- T8.3 (db-builder): seed.sql gas advantage "Prezzo **fisso** per tutta la durata del blocco" (+ data checks). Mock data change pending (setup-builder).
- T8.4 (logic-builder 4680481 + page1-builder/qa-tester 72d00e9): null zone → province capital zone (110-province generated map); page1 passes province code; matrix null-zone cases 15/15 ✓.
- T8.2 SQL (db-builder, 2e9ee30): migration 20261015140000 — private.app_secrets (sha256 only, no grants), p_secret first param on the 3 lead functions (invalid_secret / 28000), complete_lead returns notification_email, suppliers.is_placeholder. LEAD_API_SECRET in app/.env.local only (verified gitignored, not in git). PGlite: ALL DATA CHECKS PASSED, ALL RLS TESTS PASSED. APPLY requested — must ship together with the app route changes (next: lead-api-builder).

## 2026-10-15 16:45 — T8.2 app half
- Agent: lead-api-builder (opus).
- Changed: src/lib/lead/secret.ts (server-only, sole reader of LEAD_API_SECRET) registers provider with supabase repo; all 3 RPCs pass p_secret; missing/invalid secret → 500 server_error, no leak; completeLead returns notification_email; recipient order completion → env → settings; bundle guard rejects secret-looking NEXT_PUBLIC names and scans .open-next for secret values; secret-exposure test walks client import graph.
- Verified by orchestrator: typecheck ✓, lint ✓, vitest 745/745 ✓ (agent: lead e2e 107 passed).
- Ship note: migration 20261015140000 and this commit must go live together; hosting LEAD_API_SECRET must match the hash in the migration.
- Commit: 3f92e05
