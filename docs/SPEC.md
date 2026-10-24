# SPEC — VERSUS (index)

This project was adopted into the build-orchestrator workflow on 2026-10-24, after Phases 1–12 were
live. The technical spec is spread across existing files; they stay the source of truth. This file
is an index plus the decision log.

## Where things are specified
- `PRD_VERSUS_v0.6.md` (root) — product spec, screens, data model (§12), RLS (§4), lead flow (§5, §10). Never edit it; propose changes in `QUESTIONS.md`.
- `SUPABASE.md` (root) — project ref and public values.
- `app/README.md` — scripts, structure, lead API, flow state, admin data access, Phase 12 documents.
- `app/DEPLOY.md` — Vercel setup, env vars, cron, go-live checklist, decisions D1–D4.
- `CLAUDE.md` (root) — hard rules, roles, model policy.
- PRD v0.6.2 notes — section below (deltas after v0.6.1).
- History: root `TASKS.md` (Phases 0–12c), `PROGRESS.md`, `QUESTIONS.md`, `REVIEW.md`, `DESIGN_REVIEW.md`, `PHASE10/11/12_BRIEF.md`.

## Actual stack
- Next.js 16.4 (App Router, TS strict, `src/proxy.ts`), React 19.3, Tailwind 4, zod 4 — in `app/`.
- Supabase (ref `felnnfisnobpgetgtxle`, eu-central-1, free plan): Postgres + RLS, Auth (email/password, admins only, optional TOTP), Storage (supplier logos; private bucket `lead-documents`).
- Resend for the new-lead and test emails. Vercel Hobby, region fra1, daily Vercel Cron keep-alive.
- Tests: Vitest (unit, `test:security` against the real DB), Playwright (desktop 1440 + mobile 390, `fullyParallel`), e2e matrix (`npm run e2e:matrix`).

## PRD v0.6.2 notes (deltas to `PRD_VERSUS_v0.6.md` v0.6.1, 2026-10-24)
The PRD file is not edited; these notes override it where they differ.
- §Page 1 FAQ: the question "Le offerte del mio fornitore attuale compaiono nei risultati?" is removed (decision #10).
- §Loading screen: total ~6 s; new second-to-last message "Stiamo ricercando per te l'offerta più bassa", ~2.5 s on screen (decision #11).
- §Activation step B (IBAN): bold line "Sconto del 15% se paghi con IBAN" under the optional-IBAN hint (decision #12).
- §13.1 Privacy: "Cookie" section (technical cookies only, no banner), full list of collected data, footer link "Privacy e cookie" (decision #13).

## Decision log
| # | Date | Decision | Why |
|---|---|---|---|
| 1 | 2026-10-24 | The app lives in `app/`, not at repo root. All `npm`/`npx` commands run from `app/`. | Existing layout since Phase 0. |
| 2 | 2026-10-24 | ONE Supabase project shared by preview and production. No separate dev database. | Free plan, existing setup. Tests that write data must create and clean their own rows (prefix `TEST-`/`E2E`). |
| 3 | 2026-10-24 | Claude Code never applies migrations. It writes `app/supabase/migrations/<timestamp>_<name>.sql` + `## APPLY: <file>` in `QUESTIONS.md`; the reviewer (claude.ai) applies it after Giuseppe's explicit OK. Overrides the skill's "regenerate types after each migration" step: types are updated by hand in the same task. | No service role / DB access for Claude Code; shared DB = production. |
| 4 | 2026-10-24 | No Supabase secret/service-role key in the app. Public data via publishable key + RLS; leads only through secret-gated `SECURITY DEFINER` functions (`create_lead`, `update_lead`, `complete_lead`, document functions) with the server-only hashed `LEAD_API_SECRET`; admin via Supabase Auth session + RLS. | PRD §4; the skill's `SUPABASE_SECRET_KEY` convention does not apply. |
| 5 | 2026-10-24 | Auth = Supabase Auth (single admin role). No Clerk. | Already built (Phase 4). |
| 6 | 2026-10-24 | Mutations: Next.js route handlers (`/api/lead/*`) and admin server actions, validated with zod. Prices are stored as decimal €/kWh, €/Smc, €/month (PRD §12), not integer cents. | Existing schema; the skill's "money in integer cents" does not apply. |
| 7 | 2026-10-24 | Kit agents (`architect`, `backend-builder`, `frontend-builder`, `verifier`, `reviewer`, `critical-reviewer`, `scribe`) added next to the 19 existing screen agents. Existing agents remain valid for their area. | Adoption, no rewrite. |
| 8 | 2026-10-15 | Hosting Vercel Hobby, no Cloudflare, no captcha (see `app/DEPLOY.md` D1–D4). | Earlier decisions, recorded here for completeness. |
| 9 | 2026-10-23 | Document upload limit 4 MB client-side (server 5 MiB). | Vercel request body limit ≈4.5 MB (QUESTIONS.md T12.7). |
| 10 | 2026-10-24 | Page 1 FAQ: the question "Le offerte del mio fornitore attuale compaiono nei risultati?" is removed (question and answer). | Giuseppe, scope change (T13.6). |
| 11 | 2026-10-24 | Loading screen lasts ~6 s (was 4 s). New second-to-last message "Stiamo ricercando per te l'offerta più bassa" ("offerta più bassa" in VERSUS green), the longest (~2.5 s); the other messages share the rest. Reduced motion: no motion, message still shown. | Giuseppe, scope change (T13.7). |
| 12 | 2026-10-24 | Activation step B shows the fixed bold line "Sconto del 15% se paghi con IBAN" under the IBAN hint. Front-end text, not a setting. Giuseppe confirms the 15% IBAN discount is a real condition for all offers, so it satisfies the truthful-copy rule ("advantages only from DB" applies to per-offer advantages, not to this general condition). If the condition ever changes, the line must change or go. | Giuseppe, scope change (T13.8). |
| 13 | 2026-10-24 | Cookies: the site uses only technical cookies (`versus_lead`, `versus_lead_step`: httpOnly, 24 h; admin login session cookies) plus sessionStorage for form progress. No analytics, profiling or advertising cookies, so no consent banner. `/privacy` gets a "Cookie" section and covers every data item collected; footer link becomes "Privacy e cookie". | Italian Garante cookie guidelines: technical cookies need no consent (T13.9). |
| 14 | 2026-10-24 | `PRD_VERSUS_v0.6.md` is not edited (CLAUDE.md hard rule). Changes after v0.6.1 are recorded as "PRD v0.6.2 notes" in this file. | Single source stays the PRD; deltas are traceable here. |
