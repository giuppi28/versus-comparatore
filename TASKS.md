# TASKS — VERSUS

Status: `[ ]` todo · `[~]` in progress · `[x]` done · `BLOCKED: reason`
Each task names the subagent (`.claude/agents/`) that must do it. The orchestrator never writes feature code itself.
Goal: fully working service, proven by the complete test matrix (Phase 7).

## Phase 0 — Setup  → agent: `setup-builder`
- [x] T0.1 Scaffold Next.js (App Router, TS strict, Tailwind, ESLint) in `app/`. `git init` at folder root, `.gitignore` (node_modules, .next, .env*.local, .DS_Store), remote = https://github.com/giuppi28/versus-comparatore.git, first push.
- [x] T0.2 Vitest + Playwright (projects: desktop 1440, mobile 390). Scripts: `typecheck`, `lint`, `test`, `e2e`.
- [x] T0.3 Design tokens (VERSUS green palette, typography, spacing, radius) + UI kit: Button, Card, SelectCard (icon + checkbox/radio state), Input (hint/error), Select, Autocomplete, Stepper, Modal. Use the VERSUS logo from `/Users/pippo/Desktop/versus elementi/versus-logo-svg/` (copy into `app/public/brand/`).
- [x] T0.4 `app/.env.example` + `app/.env.local` from `SUPABASE.md`. `app/README.md` (how to run, scripts, structure).
- [x] T0.5 Data-access layer with two implementations (typed mock + Supabase), switchable by one flag.

## Phase 1 — Database  → agent: `db-builder`
- [x] T1.1 Migration: tables `suppliers`, `offers`, `comuni`, `leads`, `settings`, `admins` (PRD §12), constraints, `updated_at` triggers. → `APPLY` request.
- [x] T1.2 Migration: RLS + `SECURITY DEFINER` lead functions (`create_lead`, `update_lead`, `complete_lead`) per CLAUDE.md → `APPLY` request. Include SQL test script proving anon cannot read leads / inactive offers / other leads.
- [x] T1.3 Comuni dataset: all Italian municipalities (ISTAT code, name, province, region, CAPs) + official climate zone (DPR 412/93). Reliable public source, documented in PROGRESS.md. Load via migration/seed. Flag comuni without zone.
- [x] T1.4 Seed suppliers: full dropdown list of PRD §6 Block E (+ special options) and **these test offers** (all `customer_type = both`, fixed, monorario, `active = true`, `price_verified = false`, activation 0 €). Offer names are invented on purpose — do not use real commercial product names.

  **Luce** (other variable costs 0,0600 €/kWh for all)
  | Supplier | Name | €/kWh | Quota fissa €/mese | Bloccato | Featured | Promo |
  |---|---|---|---|---|---|---|
  | Edison Energia | Edison Luce Fissa 12 | 0,1290 | 9,00 | 12 mesi | **yes** | Fino a 60€ di sconto il primo anno |
  | Sorgenia | Sorgenia Luce Sicura 24 | 0,1350 | 8,00 | 24 mesi | no | — |
  | A2A Energia | A2A Luce Smart | 0,1250 | 12,00 | 12 mesi | no | — |
  | Iberdrola | Iberdrola Luce Stabile | 0,1390 | 7,50 | 12 mesi | no | — |

  **Gas** (other variable costs 0,2600 €/Smc for all)
  | Supplier | Name | €/Smc | Quota fissa €/mese | Bloccato | Featured | Promo |
  |---|---|---|---|---|---|---|
  | Eni Plenitude | Plenitude Gas Fisso 12 | 0,4900 | 9,00 | 12 mesi | **yes** | Fino a 50€ di sconto il primo anno |
  | Hera Comm | Hera Gas Sereno | 0,5100 | 8,00 | 24 mesi | no | — |
  | Engie | Engie Gas Facile | 0,4750 | 11,00 | 12 mesi | no | — |
  | Iren | Iren Gas Chiaro | 0,5200 | 7,00 | 12 mesi | no | — |

  Advantages for every offer: "Prezzo **bloccato** N mesi", "Tariffa **monoraria**", the promo (if any), "Attivala **online** con noi, **gratis** e in **1 minuto**", "Puoi **revocare** il contratto entro 14 giorni".

## Phase 2 — Core logic  → agent: `logic-builder`
- [x] T2.1 `config/consumption.ts` (all PRD §6 coefficients), `estimateLuce()`, `estimateGas()`.
- [x] T2.2 `monthlyCost()` (PRD §8), ranking (featured first, then cost asc), current-supplier exclusion.
- [x] T2.3 Validators: codice fiscale (format, check char, consistency with name/surname), P.IVA checksum, POD, PDR, Italian mobile. 100% branch coverage on this module.

## Phase 3 — Customer screens (one agent per screen)
- [x] T3.1 Lead API (server routes → lead functions, httpOnly token cookie, Turnstile, rate limit) → `lead-api-builder`
- [x] T3.2 Page 1 (PRD §6) → `page1-builder`
- [x] T3.3 Loading screen (PRD §7) → `loading-builder`
- [x] T3.4 Page 2 results incl. Luce+Gas two-step (PRD §8) → `results-builder`
- [x] T3.5 Offer modal (PRD §9) → `offer-modal-builder`
- [x] T3.6 Activation form step A + B + sticky summary (PRD §10) → `activation-form-builder`
- [x] T3.7 Thank-you page (PRD §11) → `thankyou-builder`

## Phase 4 — Admin screens (one agent per screen)
- [x] T4.1 Login + server-side protection + optional TOTP MFA → `admin-auth-builder`
- [x] T4.2 Leads list/detail/status/notes → `admin-leads-builder`
- [x] T4.3 Suppliers CRUD + sanitized SVG upload → `admin-suppliers-builder`
- [x] T4.4 Offers CRUD (all PRD §5.3 fields, month/year toggle) → `admin-offers-builder`
- [x] T4.5 Settings (notification email) + go-live checklist (unverified offers) + Resend notification (log-only when no key) → `admin-settings-builder`

## Phase 5 — Logo pack  → agent: `logopack-builder`
- [x] T5.1 Normalize SVGs from `/Users/pippo/Desktop/versus elementi/loghi energia /` (folder name ends with a space) and `/Users/pippo/Desktop/versus elementi/logopack/originali/` (see its MANIFEST.md) (clean, tight viewBox, consistent height/padding), produce `logopack/color/`, `logopack/black/`, `logopack/white/`, `logopack/preview.html`. Never alter logo shapes. Wire into the app.

## Phase 6 — Deploy preparation (NO deploy)  → agent: `deploy-prep-builder`
- [x] T6.1 OpenNext Cloudflare config, build passing. Supabase keep-alive job design. `DEPLOY.md` with exact steps.

## Phase 7 — Full test matrix (definition of done)  → agent: `qa-tester` (+ fixes via the owning builder)
- [x] T7.1 Playwright parametrized suite over **every combination**: commodity {luce, gas, dual} × customer {casa, partita IVA} × service {cambio fornitore, subentro, voltura, primo allaccio} × gas {già presente sì/no} × gas uses {each, all, with riscaldamento in zones A/C/E/F} × consumption {estimated, manual}. Each run goes from Page 1 to thank-you page and asserts: lead saved at consent, correct estimate, current supplier's offers excluded (test with Edison luce / Eni Plenitude gas), featured first + cost ordering, correct monthly cost, summary correctness, lead completed with all fields.
- [x] T7.2 Validation paths: every required field empty, invalid CF, CF not matching name, invalid P.IVA/POD/PDR/phone, back buttons keep data, refresh mid-flow.
- [x] T7.3 Copy checks: no call/callback wording before thank-you page; no "demo"; no Facile.it elements.
- [x] T7.4 Admin e2e: login/logout, unauthenticated access blocked, leads list/detail/status, supplier CRUD + malicious SVG rejected/sanitized, offer CRUD incl. deactivate → disappears from results, featured → appears first.
- [x] T7.5 (API-level suite 74/74 green vs real project, 31fb197; SQL-level rls_test/data_checks requested from reviewer) Security: anon cannot read leads or inactive offers via the Supabase API directly; token cannot update another lead.
- [x] T7.6 Mobile (390px) and desktop (1440px) screenshots of every screen in `app/e2e/screenshots/`; Lighthouse ≥ 90 accessibility on public pages.
- [x] T7.7 Final report in PROGRESS.md: matrix size, pass rate (must be 100%), known limitations.

## Phase 8 — Reviewer follow-ups (2026-10-15)
- [x] T8.1 Load comuni into the real DB with `app/supabase/bootstrap/load_comuni.mjs` (expects TOTAL 7894), verify with data checks, write `## DONE: comuni loaded` in QUESTIONS.md → `db-builder`
- [x] T8.2 (builder side done; awaiting APPLY 20261015140000) One migration for Q6 (hashed LEAD_API_SECRET on the three lead functions) + Q7 (complete_lead returns the notification recipient) + Q8 (`suppliers.is_placeholder`); update server routes, bundle secret guard, mock layer and tests → `db-builder` (SQL) then `lead-api-builder` (routes) → `APPLY`
- [x] T8.3 Seed + mock alignment for the gas advantage wording (Q4) → `db-builder`
- [x] T8.4 Null climate zone → fallback to the province capital's zone (Q5) + tests → `logic-builder`
- [x] T8.5 Go-live checklist additions (admin widget + DEPLOY.md): disable public sign-up in Supabase Auth; create Aldo's admin user and insert into public.admins; reviewer drops `public.bootstrap_load_comuni` → `admin-settings-builder`

## Phase 9 — Giuseppe's review round (2026-10-15)
Decisions: hosting = Vercel (Hobby, custom domain); Cloudflare removed entirely (no Turnstile; keep rate limiting + hashed LEAD_API_SECRET); keep-alive = daily Vercel Cron; "Cambio fornitore" preselected on Page 1. Design reference: `versus elementi/_archivio/comparatore-demo-reference.html` (visual style only) with the VERSUS green palette.
- [x] T9.1 (8a1dc12) Remove Cloudflare (Turnstile, OpenNext, wrangler, cloudflare/, build:cf) + Vercel deploy docs + Vercel Cron keep-alive + Vercel-only client IP → `lead-api-builder` (opus, security-critical)
- [x] T9.2 (3a1f48e) Design system refresh: tokens (grey bg, white cards, thin borders, 10px radius, Archivo wide + Inter), header with inline SVG VERSUS logo, hero "Comparatore luce e gas" → `setup-builder`
- [x] T9.3 (587e64a) Page 1: "Cambio fornitore" preselected, animated reveal of the current-supplier block, restyle to the new system → `page1-builder`
- [x] T9.4 (2747a0d) Minimal loading screen (replaces orbit), ~4 s, never the current supplier → `loading-builder`
- [x] T9.5 (6ec59f9, 95dfba1, 810527a, 47a5013) Full aesthetic review of every screen (1440 + 390) → `DESIGN_REVIEW.md`, fixes by the owning builders, re-check → orchestrator + builders
- [x] T9.6 (see PROGRESS) Full regression (unit, e2e, matrix, security) + screenshots → `qa-tester`

## Phase 10 — Visual upgrade (Giuseppe, 2026-10-15) — spec: `PHASE10_BRIEF.md` (read it fully)
- [x] T10.0 Setup: branch `preview/phase10` from local main; copy `design-skills/*` into `.claude/skills/` and add `design-skills/` + `.claude/skills/` to `.gitignore`; create `.claude/agents/design-reviewer.md` (sonnet); set `thankyou-builder` to sonnet for this phase → orchestrator
- [x] T10.1 (b55ad9f) Brand lockup (icon + typeset wordmark, no black rectangle, COMPARATORE dominant), coloured header, footer, `decor/` illustration set, shared `ui/icons` set (B1) → `setup-builder`
- [~] T10.2 Page 1: centered layout, big green bulb background, optional skill-backed sections (B2) → `page1-builder` (after T10.1)
- [~] T10.3 Loading screen redesign: black icon + progress ring, big text with green keywords, supplier logo marquee (B3) → `loading-builder` (after T10.1)
- [~] T10.4 Results: "PER TE" in green, consistent layout (B4) → `results-builder` (after T10.1)
- [~] T10.5 Activation: icons on every option card (B5) → `activation-form-builder` (after T10.1)
- [~] T10.6 Thank-you: bulbs right, gas flames left background decoration (B6) → `thankyou-builder` (after T10.1)
- [ ] T10.7 Design review round 1 → `DESIGN_REVIEW.md` Phase 10, fixes by owners, round 2 (B7) → `design-reviewer`
- [ ] T10.8 Full regression + screenshots + Lighthouse (B8) → `qa-tester`
- [ ] T10.9 PRD v0.5.2 visual notes, PROGRESS summary, push `preview/phase10`, write the preview URL (from `gh`/Vercel if available, otherwise say "see Vercel") in PROGRESS.md → orchestrator
