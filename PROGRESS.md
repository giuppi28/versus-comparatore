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
