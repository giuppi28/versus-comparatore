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
