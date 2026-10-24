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
- History: root `TASKS.md` (Phases 0–12c), `PROGRESS.md`, `QUESTIONS.md`, `REVIEW.md`, `DESIGN_REVIEW.md`, `PHASE10/11/12_BRIEF.md`.

## Actual stack
- Next.js 16.4 (App Router, TS strict, `src/proxy.ts`), React 19.3, Tailwind 4, zod 4 — in `app/`.
- Supabase (ref `felnnfisnobpgetgtxle`, eu-central-1, free plan): Postgres + RLS, Auth (email/password, admins only, optional TOTP), Storage (supplier logos; private bucket `lead-documents`).
- Resend for the new-lead and test emails. Vercel Hobby, region fra1, daily Vercel Cron keep-alive.
- Tests: Vitest (unit, `test:security` against the real DB), Playwright (desktop 1440 + mobile 390, `fullyParallel`), e2e matrix (`npm run e2e:matrix`).

## Decision log
| Date | Decision | Why |
|---|---|---|
| 2026-10-24 | The app lives in `app/`, not at repo root. All `npm`/`npx` commands run from `app/`. | Existing layout since Phase 0. |
| 2026-10-24 | ONE Supabase project shared by preview and production. No separate dev database. | Free plan, existing setup. Tests that write data must create and clean their own rows (prefix `TEST-`/`E2E`). |
| 2026-10-24 | Claude Code never applies migrations. It writes `app/supabase/migrations/<timestamp>_<name>.sql` + `## APPLY: <file>` in `QUESTIONS.md`; the reviewer (claude.ai) applies it after Giuseppe's explicit OK. Overrides the skill's "regenerate types after each migration" step: types are updated by hand in the same task. | No service role / DB access for Claude Code; shared DB = production. |
| 2026-10-24 | No Supabase secret/service-role key in the app. Public data via publishable key + RLS; leads only through secret-gated `SECURITY DEFINER` functions (`create_lead`, `update_lead`, `complete_lead`, document functions) with the server-only hashed `LEAD_API_SECRET`; admin via Supabase Auth session + RLS. | PRD §4; the skill's `SUPABASE_SECRET_KEY` convention does not apply. |
| 2026-10-24 | Auth = Supabase Auth (single admin role). No Clerk. | Already built (Phase 4). |
| 2026-10-24 | Mutations: Next.js route handlers (`/api/lead/*`) and admin server actions, validated with zod. Prices are stored as decimal €/kWh, €/Smc, €/month (PRD §12), not integer cents. | Existing schema; the skill's "money in integer cents" does not apply. |
| 2026-10-24 | Kit agents (`architect`, `backend-builder`, `frontend-builder`, `verifier`, `reviewer`, `critical-reviewer`, `scribe`) added next to the 19 existing screen agents. Existing agents remain valid for their area. | Adoption, no rewrite. |
| 2026-10-15 | Hosting Vercel Hobby, no Cloudflare, no captcha (see `app/DEPLOY.md` D1–D4). | Earlier decisions, recorded here for completeness. |
| 2026-10-23 | Document upload limit 4 MB client-side (server 5 MiB). | Vercel request body limit ≈4.5 MB (QUESTIONS.md T12.7). |
