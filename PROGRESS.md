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

## 2026-10-15 17:10 — Phase 8 builder work complete; regression green
- Q8 consumers: 6394331 (is_placeholder + isRealSupplier, mock Q4 wording, docs), 65f8c14 (orbit excludes placeholders, no data barrel in client graph), 2bb7505 (offer form hides placeholders, server rejects them).
- Orchestrator regression on one clean server: typecheck ✓, lint ✓, vitest 757/757 ✓, standard e2e 185 passed / 1 skipped ✓, matrix 382/382 + 6/6 serial ✓.
- REVIEW.md items marked fixed; T7.5 remains BLOCKED until the reviewer applies 20261015140000 (the app now uses the new lead function signatures).

## 2026-10-15 17:10 — LOOP SUMMARY (stopping: no unblocked task left)
Blocked on reviewer/Giuseppe: APPLY 20261015140000 (then T7.5 + T7.7 final sign-off; also drop bootstrap_load_comuni); T5.1 logos (Q2 "ready"); Q3 Aldo's email; Q9 privacy text.

## 2026-10-15 17:45 — T7.5 + go-live/DB follow-ups
- T7.5 (qa-tester, 31fb197): `npm run test:security` — standalone Vitest suite against the REAL Supabase project with the publishable key: public read rules (comuni 7894, only active suppliers/offers), leads/settings/admins/app_secrets unreachable, admin writes rejected, private RPCs unreachable, 8 bad-secret variants × 3 functions → invalid_secret (secret checked first), old signatures 404, create_lead input rules, token isolation (13 forged tokens, completed-lead lock), storage writes rejected. Orchestrator run: 74 passed / 1 skipped (no bucket object yet). Creates exactly 2 TEST-SECURITY leads per run (cleanup SQL in QUESTIONS.md). Note: lead_not_found surfaces as HTTP 500 from PostgREST (P0002) — app maps by message; possible future errcode change.
- 14243a0 (admin-settings): bootstrap removal shown done; privacy placeholders as manual go-live item; DEPLOY.md notification-email note (Q3).
- 5a13cd1 (db-builder): idempotent doc migration 20261015150000 for the reviewer's disable-and-move of old functions; Q11 asks to confirm names. PGlite ✓.

## 2026-10-15 18:15 — T5.1 Logo pack
- logopack-builder (sonnet), 0786b9d + d1e4563 (db-builder seed): 11 real suppliers normalized (tight viewBox + 5% padding, height 48, prefixed ids, no metadata), color/black/white + preview; all 33 SVGs are fixed points of the app sanitizer; app/public/logos wired into mock + seed; migration 20261015160000 sets logo_path only where null (APPLY requested). Placeholders have no logo.

## 2026-10-15 18:20 — T7.7 FINAL REPORT (definition of done)
Orchestrator final regression on one clean server, mock data layer:
- typecheck ✓ · lint ✓ · Vitest 806/806 ✓
- Standard Playwright suites (page1, results, activation, thankyou, admin-auth/leads/suppliers/offers/settings, smoke): 185 passed, 1 skipped (keyboard-only case on mobile by design) ✓
- Phase 7 matrix (`npm run e2e:matrix`): 382/382 parallel + 6/6 serial = **388/388 (100%)** ✓ — T7.1 flow matrix 218 desktop + 42 mobile combinations; T7.2 validation 32+29; T7.3 copy; T7.4 admin; T7.6 screenshots + Lighthouse a11y ≥ 96 on every public page.
- T7.5 against the REAL Supabase project (`npm run test:security`): 74 passed, 1 skipped (no bucket-stored logo yet) ✓. SQL-level rls_test.sql / data_checks.sql on the real DB requested from the reviewer (QUESTIONS REQUEST); both pass locally on PGlite.
Known limitations / go-live items (see app/DEPLOY.md + /admin/impostazioni checklist):
- Full app flow has been e2e-tested on the mock layer; against the real DB it is covered at the API level (T7.5). A full browser run in supabase mode needs Aldo's admin user (go-live).
- Privacy notice placeholders (Q9, deferred); Aldo's admin account + his notification email (Q3); public sign-up off; Turnstile/Resend real keys; LEAD_API_SECRET as Cloudflare secret; WAF rate-limit rule (in-memory limiter is per isolate); Workers Free CPU limit to monitor (Q10).
- TEST-SECURITY leads (2 per security run) remain in the real DB until the admin deletes them (cleanup SQL in QUESTIONS.md).
- PostgREST surfaces lead_not_found as HTTP 500 (P0002); app maps it correctly — cosmetic for monitoring.
- Pending reviewer: APPLY 20261015160000 (logo paths), Q11 (disabled function names), REQUEST SQL tests.

## 2026-10-15 18:20 — LOOP SUMMARY (stopping: no unblocked task left)
All TASKS.md items are [x]. Remaining actions belong to the reviewer/Giuseppe (listed above).

## 2026-10-15 — Phase 9: Giuseppe's review round (Cloudflare removal + redesign)
Orchestrator: Claude Opus (session model). Decisions by Giuseppe: hosting Vercel (Hobby, custom domain), remove Cloudflare entirely, daily Vercel Cron keep-alive, preselect "Cambio fornitore"; design review with Playwright at 1440/390.
- T9.1 lead-api-builder (opus, security-critical), 8a1dc12: Turnstile/OpenNext/wrangler/cloudflare/ removed; client IP only from x-real-ip / first x-forwarded-for (cf-connecting-ip ignored, tested); `/api/cron/keepalive` + app/vercel.json (daily, CRON_SECRET bearer, 401 in prod without it); bundle guard moved to scripts/check-bundle-env.mjs scanning .next (postbuild). DEPLOY.md rewritten for Vercel. The agent declined to edit CLAUDE.md/PRD/agent files; the orchestrator applied them (Giuseppe asked for these edits directly): CLAUDE.md stack line, PRD v0.5.1 (§3, §4.5–4.6, §7 loading).
- T9.2 setup-builder (sonnet), 3a1f48e: reference aesthetic tokens (bg #EFF1F4, ink #0B0F1A, line #DCE0E7, radius 10/8), Archivo wide + Inter via next/font (self-hosted), inline SVG VersusLogo (official paths, background rect dropped, path-drift unit test), SiteHeader, hero "COMPARATORE / LUCE E GAS".
- T9.4 loading-builder (sonnet), 2747a0d: minimal loading (icon pulse, message fade, 4px bar, greyscale logo row highlighted one at a time; ~4 s; current supplier never shown).
- T9.5 design review → DESIGN_REVIEW.md (30 items). Fixes: setup-builder 6ec59f9 (UI kit: heading-section, FieldGroup hideLegend, lg uppercase buttons, control border 3.48:1, neutral disabled, SelectCard indicator spacing); results-builder 95dfba1; activation-form-builder 810527a (incl. thank-you supplier logo); admin-leads-builder 47a5013 (whole admin presentation layer, no logic); page1-builder 587e64a (T9.3: Cambio fornitore preselected after hydration, animated Block E reveal).
- T9.6 qa-tester: matrix thank-you assertion accepts logo img alt (flow.ts). Orchestrator re-verified typecheck ✓ lint ✓ vitest 815/815 ✓.
- Final results: Vitest 815/815; standard Playwright 191 passed / 1 skipped (desktop-only keyboard test); matrix 380/380 parallel + 6/6 serial = 386/386 (one validation case removed: "missing service" can no longer occur); security suite vs real Supabase 74 passed / 1 skipped; supabase-mode production build + check:bundle OK; Lighthouse a11y 100 on every public page/state (desktop + mobile); zero Turnstile/Cloudflare/OpenNext/wrangler references left in app/.
- Open for Giuseppe (QUESTIONS NOTE): CRON_SECRET on Vercel Production at go-live; delete stale Turnstile env vars on Vercel; Vercel Hobby is non-commercial (Pro may be needed).
- Deploy note: Vercel's Production Branch is `main` → the push of eae02f2 to main started a PRODUCTION build; cancelled by the orchestrator before it finished (dpl_8sc9ax81463jufcEriYHqLjPW5bv, CANCELED). Review preview created from branch `preview/phase9` instead (dpl_C4neA6VCNVfeBVFtct4FAWppgurs, target preview). BLOCKER for Giuseppe in QUESTIONS.md; later commits go to `preview/*` only until the Production Branch is changed.

## 2026-10-15 — T10.0 Phase 10 setup
- Agent: orchestrator (setup only, no feature code).
- Branch `preview/phase10` created from local main (ae409cc). `design-skills/*` copied into `.claude/skills/` (frontend-design, ui-ux-pro-max; search.py verified); both folders gitignored.
- New agent `.claude/agents/design-reviewer.md` (sonnet, writes only DESIGN_REVIEW.md). `thankyou-builder` → sonnet for this phase (per brief B6). `setup-builder` scope extended to `components/brand`, `(public)/layout.tsx`, `globals.css` (B1 needs them).
- Before-reference screenshots `app/e2e/before-after/` committed as the visual baseline.
- Note: this orchestrator session runs on the model selected for the session (Opus 5.5), not Sonnet as CLAUDE.md asks — Giuseppe launched it; builders keep their agent-file models.

## 2026-10-15 — T10.1 Brand lockup, header, footer, decor, ui/icons (B1)
- Agent: setup-builder (sonnet).
- Changed: `BrandLockup` (black VERSUS mark + typeset "VERSUS" / dominant "COMPARATORE" Archivo wide 800 + green "luce e gas"; sizes sm/md/lg; compact at 390px; role=img + aria-label; data-testid kept), `VersusMark` (icon only, no square), `VersusLogo` defaults to the lockup (full/icon variants kept). Header: light green tint (brand-50) + 4px green gradient strip (absolute, no height change) + trust line "Confronto gratuito · 100% online" from 640px. `SiteFooter` (lockup, Privacy link, © VERSUS year) in `(public)/layout.tsx`, hidden while the loading screen is mounted. `brand/decor/` (Bulb, Flame, BoltDrop, HouseOutline, Swoosh). `ui/icons/` (glyphs + Page 1 option icons moved, page1/icons.tsx re-exports; new activation icons).
- Decision (skills): tinted header over deep-green header — keeps the official black mark faithful (ui-ux-pro-max contrast 4.5:1; frontend-design restraint).
- Verified by orchestrator: typecheck ✓, lint ✓, vitest 867/867 ✓; agent: Playwright smoke/page1/thankyou/admin-auth 95 passed / 1 skipped, admin-leads+results 36 passed. Visual check of header 1440/390 + decor sheet.
- Process: a shared mock dev server on :3100 is started by the orchestrator so T10.2–T10.6 run in parallel without competing dev servers.

## 2026-10-15 — T10.2–T10.6 (parallel, disjoint folders)
- T10.2 page1-builder (sonnet), 74aab84: centered hero + form column (`max-w-2xl`), BulbIllustration background (brand-100, cropped, masked, never under the green line or form), added "Come funziona" (3 steps), "Confrontiamo le offerte di" (real suppliers, static greyscale row — skill: no carousel under reduced motion) and a 5-question FAQ (native details, PRD facts only). Skills: ui-ux-pro-max landing "trust-authority-conversion" + "pricing-focused-landing" FAQ; frontend-design restraint.
- T10.3 loading-builder (sonnet), 5133ce6 + e0e1375 (results wiring) + 7f8d9d2 (logopack test covers public/logos/black): black VersusMark inside a green SVG progress ring (stroke-dashoffset, same 4 s contract), big Archivo messages with brand-700 keywords (luce/gas/luce e gas), black logo marquee with mask fades (duplicates aria-hidden, current supplier + placeholders excluded), reduced motion → static row. "N fornitori" message dropped (PRD §7 to be updated in v0.5.2).
- T10.4 results-builder (sonnet), 58570ff: "per te" in brand-700 in every title; **decision (orchestrator):** dual titles changed from "Scegli l'offerta Luce/Gas" to "Le migliori offerte Luce/Gas per te" because brief B4 lists dual step 1/2 among the variants (step indicator still distinguishes steps); matrix flow.ts expectation updated accordingly. Centered title block, grid unchanged.
- T10.5 activation-form-builder (sonnet), d4c5b17: icons on every SelectCard (housing, resident Sì/No, 220/380 V, gas uses). Potenza stays a Select.
- T10.6 thankyou-builder (sonnet), 45ef61e: flames left / bulbs right in the margins (brand-200/300), cropped hints on mobile, card untouched, static.
- Verified by orchestrator: typecheck ✓, lint ✓, Vitest 882/882 ✓, standard Playwright 201 passed / 1 skipped ✓ (shared dev server; per-agent `--output` dirs avoid test-results collisions).
- Noted for design review: SiteHeader trust line clipped around 640–800px (reported by page1-builder); Page 1 logo strip can switch to /logos/black now.

## 2026-10-15 — T10.7 Design review (2 rounds, max reached)
- Agent: design-reviewer (sonnet). Round 1 (2748722): 6 findings — P10-1 high header trust line caused horizontal scroll 640–800px; P10-2 Page 1 header override misaligned; P10-3 colour logos with greyscale washed out; P10-4 bulb touching hero text; P10-5 reduced-motion logo row off-centre; P10-6 thank-you decor too busy / slivers on mobile.
- Fix round 1 (parallel, owners): setup-builder 2702d51 (trust line from lg, compact lockup <360px, no-overflow e2e 320–1440), page1-builder 42a9d11, loading-builder 209d4c0, thankyou-builder 728a719 (1 large flame/bulb per side, hidden below lg).
- Round 2 (db750c7): P10-1..6 verified; verdict READY; polish P10-7 (bulb too faint) + P10-8 (sliver below lg) + P10-9 (stale thank-you screenshots → T10.8).
- Fix round 2: page1-builder f388740 — brand-200, 30rem, fade ends at hero bottom. **Decision:** bulb shown from xl (1280px) instead of lg, because at 1024 half of it fell outside the viewport (cropped-fragment look); hidden on tablet/mobile because the headline spans the full width there (no clear spot). Logged for Giuseppe in QUESTIONS.md.
- Orchestrator checks after round 1: typecheck ✓, lint ✓, Vitest 882/882 ✓, Playwright 217 passed / 1 skipped ✓.

## 2026-10-15 — T10.8 Full regression (B8)
- Agent: qa-tester (sonnet), one clean mock server. typecheck ✓ · lint ✓ · Vitest 882/882 ✓ · standard Playwright 217 passed / 1 skipped (keyboard-only on mobile, by design) ✓ · matrix `npm run e2e:matrix` 380/380 parallel + 6/6 serial = **386/386** ✓ (flow matrix, validation, copy checks, admin, screenshots, Lighthouse) · copy checks clean on all new text (no call wording before /grazie, no "demo", no Facile.it elements, no invented numbers).
- Lighthouse accessibility: **100** on all 10 public page states, desktop + mobile. Non-scored `label-content-name-mismatch` on the header home link fixed by setup-builder (8f3d5a3: spaces between wordmark spans + link name "VERSUS comparatore luce e gas, torna alla home"); re-run of the Lighthouse spec by the orchestrator: 0 failing audits on every page.
- `npm run test:security` skipped on purpose: Phase 10 is visual only (no lead/API/DB change) and each run writes 2 TEST-SECURITY leads into the real DB. Last run (Phase 9): 74 passed / 1 skipped.
- All 155 screenshots regenerated (incl. stale thank-you ones, P10-9); orphan `admin-settings-disabled-mobile.png` removed. No test assertion weakened; test changes in Phase 10 were additions plus the dual-title expectation (results.spec, matrix flow.ts) and `.first()` on the logo (header + footer both carry it).

## 2026-10-15 — PHASE 10 FINAL SUMMARY (T10.9) — stopping: all Phase 10 tasks [x]
- Branch `preview/phase10` (pushed only there; main untouched, nothing merged, no production deploy). Commits: e4b6324 setup · b55ad9f brand · 74aab84/42a9d11/f388740 page1 · 5133ce6/209d4c0 loading · 58570ff/e0e1375 results · d4c5b17 activation · 45ef61e/728a719 thank-you · 2702d51/8f3d5a3 header fixes · 7f8d9d2 logopack test · 2748722/db750c7 design review · 7bb7c2c regression · e1538e7 PRD v0.5.2.
- Final numbers: Vitest 882/882 · Playwright 217 passed / 1 skipped · matrix 386/386 · Lighthouse a11y 100 everywhere, 0 failing audits.
- PRD updated to **v0.5.2** (visual notes only: lockup/header/footer, Page 1 centered + sections, loading screen, results title, activation icons, thank-you decor).
- Vercel Preview (target = preview, not production): latest at push time `https://versus-comparatore-cb3ua0hx6-giuseppes-projects-a9ce686f.vercel.app` (e1538e7, was BUILDING); previous READY `https://versus-comparatore-d13z9etvm-giuseppes-projects-a9ce686f.vercel.app`. The newest one is always under Vercel → Deployments → branch `preview/phase10` (the branch alias is normally `versus-comparatore-git-preview-phase10-giuseppes-projects-a9ce686f.vercel.app`). Previews may require Vercel login (deployment protection).
- Open items for Giuseppe (QUESTIONS.md "Phase 10 design leftovers"): bulb only ≥1280px, thank-you decor only ≥1024px, dual titles now "Le migliori offerte … per te", header trust line only ≥1024px. Go-live items unchanged (privacy data Q9, Aldo's prices/email/admin account, Resend domain, Vercel Production Branch still `main`).
- Process notes: this orchestrator session ran on Opus 5.5 (session model chosen at launch), not Sonnet as CLAUDE.md asks; all builders ran on their agent-file models (sonnet; no escalations). Parallel builders shared one orchestrator-started mock dev server (:3100) with per-agent Playwright `--output` dirs to avoid test-results collisions.

## 2026-10-15 — PHASE 11 (admin deletions) — spec `PHASE11_BRIEF.md`
- T11.0 orchestrator, fbccb05: branch `preview/phase11` from `preview/phase10`; brief + tasks committed. Shared mock dev server on :3100 started by the orchestrator (parallel agents use private Playwright `--output` dirs).
- Decision (orchestrator): file ownership for parallel work — db-builder owns `supabase/` + `src/lib/data/` (migration AND the repository delete API used by the UI builders, so the three admin UI tasks don't edit the shared data layer); a shared `ConfirmDialog` was added to the UI kit first by setup-builder so leads/offers/suppliers use one confirm modal.
- UI kit prep, setup-builder (sonnet), 56c282c: `ConfirmDialog` on top of `Modal` (focus on Annulla, Esc/X/overlay cancel, pending state blocks closing, error slot role=alert, no window.confirm) + `Button variant="danger"` (#b42318, 6.5:1). Verified: Vitest ui 103/103 ✓, eslint ✓.
- T11.6 qa-tester (sonnet), ed2fe9e: diagnosis = screenshot timing only (Reveal 220ms transition captured mid-fade); the current-supplier block renders title + select at 1440 and 390. Spec now waits for `document.getAnimations()` to settle; page1 screenshots regenerated. Verified: page1.spec 65 passed / 1 skipped ✓, start PNG checked visually. Note: `page1-mobile-*.png` full-page captures are 1024px wide (Pixel 7 isMobile + fullPage artefact, pre-existing); the 390 matrix shots are correct.
- T11.5 loading-builder (sonnet), 7c8053f: `/offerte` loads `listActiveSuppliers()`; new `buildLoadingSuppliers` (active, non-placeholder, with logo, minus current supplier(s), deduped) with fallback to offer suppliers if the call fails. Verified: Vitest results ✓, eslint ✓, results.spec 30/30 ✓, loading screenshot shows all logos.
- T11.1 db-builder (opus), 23903b6: migration `20261015170000_lead_snapshots_on_delete.sql` (additive; 4 nullable lead columns; BEFORE DELETE triggers on offers/suppliers in `private`, SECURITY DEFINER, `search_path=''`, EXECUTE revoked; placeholder supplier delete rejected) + repository `deleteLeads` / `deleteOffer` / `countOffersBySupplier` / `deleteSupplier` (offers first, Storage logo cleanup in the supplier's own folder only) with mock parity. Accepted deviations: triggers also null the FK themselves (fixes an FK re-check failure when one statement deletes a dual lead's luce+gas offers, reproduced in PGlite); a snapshot replaces a stale copy of a *different* offer; new Lead fields are snake_case like the rest of `Lead`. Verified by orchestrator: PGlite ALL DATA CHECKS / ALL RLS TESTS PASSED, typecheck ✓, lint ✓, Vitest 931/931 ✓. `## APPLY` added to QUESTIONS.md with a note: don't delete offers/suppliers on the preview (shared real DB) before it is applied.
- Process: the shared :3100 mock server cached the pre-T11.1 repository singleton (`globalThis.__versusRepo`), so delete methods were missing; the orchestrator restarted it. Two builders had briefly run Playwright on private app copies on other ports to get unblocked (copies deleted afterwards).
- T11.4 admin-suppliers-builder (sonnet), 5995521: `deleteSupplierAction` (requireAdmin first, id check, placeholder refused server-side before the repo, typed errors → Italian messages, logo-cleanup warning), Elimina on list rows + edit page (none for placeholders), modal "Questo fornitore ha N offerte: verranno eliminate anche le offerte." (singular handled), banner after redirect. Verified: Vitest 30/30 (fornitori), eslint ✓, e2e suppliers 16/16 ✓, modal screenshot checked at 390.
- T11.3 admin-offers-builder (sonnet), 8f21a38: `deleteOfferAction` + Elimina on list and edit page, modal explains leads keep a copy + "Disattiva invece" (existing flag action) for active offers; e2e proves the offer disappears from public `/offerte` results. Verified: Vitest 37/37, eslint ✓, e2e offers 30/30 ✓.
- T11.2 admin-leads-builder (sonnet), bcc6bd1: `deleteLeadsAction` (requireAdmin first, zod UUID[] 1–200, dedupe) + detail variant redirecting to the list; row checkboxes, "Seleziona tutti (pagina)", sticky "Elimina selezionati (N)", selection reset on filter/page change, live "N lead eliminati" notice; detail shows "Offerta eliminata: …" / "(fornitore eliminato)" from snapshots. **Security catch:** LeadList became a client component and would have serialized lead tokens into the page; it now gets a whitelisted row shape (`row-data.ts`) + e2e/Vitest guards. Verified: typecheck ✓, lint ✓, Vitest 972/972 ✓, e2e leads 20/20 ✓.
- Decision (orchestrator): offer/supplier delete actions accept UUIDs or slug-like ids (`[A-Za-z0-9_-]`, ≤100) because mock seed ids are slugs; real ids are uuid columns, so Postgres rejects anything else. Leads stay strict UUID.
- T11.7 qa-tester (sonnet), 5a7dc88: new `e2e/admin-deletions-cross.spec.ts` — (a) offer deleted after a real customer chose it → lead detail shows "Offerta eliminata: <fornitore> — <offerta>"; (b) supplier with logo + offer deleted → gone from public results, loading marquee and Page 1 dropdown, lead shows "(fornitore eliminato)"; (c) unauthenticated delete rejected end-to-end for leads/offers/suppliers (captured server-action POST replayed without cookies → nothing deleted; same replay with the admin session deletes = positive control). Matrix: lead bulk delete/cancel case (admin.spec) + offer and supplier-with-offers deletion with placeholder protection (admin-crud.spec). Hardened specs against concurrent admin fixtures (page1 logo strip + dropdown order, admin-offers Visibili/Tutte comparison, page1 lead PATCH count). Orchestrator found two of these by re-running on a reused server and sent them back.
- T11.2 follow-up admin-leads-builder (sonnet), 9893313: real UI bug found by the full run — a click before hydration toggled the server-rendered "Seleziona tutti" checkbox without React state (header checked, row unchecked, no bulk bar). Selection/delete controls are now disabled until hydrated, header state (incl. indeterminate) is derived from the rows, stale selected ids pruned on refresh; "1 selezionato" singular.
- Final regression (orchestrator, fresh mock server each time): typecheck ✓ · lint ✓ · Vitest **973/973** ✓ · standard Playwright **261 passed / 1 skipped** (keyboard-only on mobile, by design) ✓ · matrix `npm run e2e:matrix` **382/382 + 8/8 serial = 390/390** ✓ · screenshots regenerated (84c9485). PGlite DB tests ALL PASSED (T11.1).
- Known intermittent flake (pre-existing, not Phase 11): `e2e/matrix/validation.spec.ts:246` activation step A, mobile, under parallel load a cleared prefilled field (Cognome) is re-filled; 1 failure in ~10 runs reported by QA, green in the final run. Candidate for the activation-form owner later.

## 2026-10-15 — PHASE 11 FINAL SUMMARY (T11.7) — stopping: all Phase 11 tasks [x]
- Branch `preview/phase11` (from `preview/phase10`; pushed only there; main untouched, nothing merged, no production deploy, no env/secrets touched). Commits: fbccb05 brief · ed2fe9e page1 screenshot timing (T11.6) · 56c282c ConfirmDialog · 7c8053f loading marquee (T11.5) · 23903b6 migration + data layer (T11.1) · bcc6bd1 + 9893313 leads delete (T11.2) · 8f21a38 offers delete (T11.3) · 5995521 suppliers delete (T11.4) · 5a7dc88 cross-area + matrix tests · 84c9485 regression screenshots.
- Delivered: leads single + bulk delete (works with filters, max 200 per call), offers delete (with "Disattiva invece"), suppliers delete cascading their offers (placeholders protected in UI, server action and DB trigger; Storage logo cleanup), all confirmed via the in-page `ConfirmDialog` (no window.confirm), every delete action checks the admin session first and validates input; lead history kept via snapshots; loading marquee shows all real suppliers minus the current one; Page 1 "empty card" was screenshot timing only.
- Final numbers: Vitest 973/973 · Playwright 261 passed / 1 skipped · matrix 390/390 · PGlite DB tests passed.
- **Open items:**
  1. `## APPLY: 20261015170000_lead_snapshots_on_delete.sql` (QUESTIONS.md) — waiting for the reviewer. Until applied, don't delete offers/suppliers on the preview (shared real DB: snapshots would not be written). Lead deletion is safe now.
  2. `npm run test:security` (real DB) not run, by instruction, until the APPLY is answered. After it: run it, then delete the TEST-SECURITY leads from the admin (now possible).
  3. PRD §5 does not mention deletions yet (PRD is read-only for builders) — Giuseppe may add a v0.5.3 note: "Admin can delete leads (single/bulk), offers and suppliers (with their offers); leads keep a snapshot".
  4. Pre-existing flake `matrix/validation.spec.ts:246` (see above).
  5. Process: orchestrator ran on Opus 5.5 (session model), not Sonnet as CLAUDE.md asks; builders on their agent-file models, no escalations.
- Vercel Preview (target = preview, not production): `https://versus-comparatore-24w1pizv7-giuseppes-projects-a9ce686f.vercel.app` (6f64cbd, BUILDING at push time); previous READY `https://versus-comparatore-2ys09kvtf-giuseppes-projects-a9ce686f.vercel.app` (94b3758). Branch alias normally `versus-comparatore-git-preview-phase11-giuseppes-projects-a9ce686f.vercel.app`; may require Vercel login. Reminder: this preview uses the real DB → don't delete offers/suppliers there before the APPLY is answered.
