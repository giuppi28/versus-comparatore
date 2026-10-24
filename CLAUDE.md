# VERSUS — Comparatore luce e gas — Instructions for Claude Code

Owner: Giuseppe Pappalardo (SiteXP). Client: Aldo (energy broker).

## GOAL (definition of done)
Deliver a **fully working service**: every screen of the PRD implemented, connected to Supabase, and **proven by automated tests covering every possible combination of choices** (Luce / Gas / Luce+Gas × Casa / Partita IVA × Cambio fornitore / Subentro / Voltura / Primo allaccio × gas yes/no × every gas use incl. riscaldamento × manual consumption, plus every validation error path and the full admin area). Nothing is "done" until its tests pass. The project is finished only when the full test matrix (TASKS.md → Phase 7) is green on desktop and mobile.

## Roles
- **Main session = ORCHESTRATOR.** It reads everything, plans, delegates, verifies, commits. It **does not write feature code itself**: every piece of work is done by a **separate subagent** (definitions in `.claude/agents/`), one per screen/area, so no context ever gets too long and quality stays high. (Claude Code subagents cannot spawn other subagents, so the orchestrator is the main session and it is the only one that spawns agents.)
- **Subagents = BUILDERS / TESTERS.** Each receives one task, reads `CLAUDE.md` + the relevant PRD sections, does the work, runs the checks, and returns a short report (what changed, files, test results, open problems).
- **Reviewer** = a separate Claude session in the Claude app (project "Versus-Comparatore"). It applies DB migrations, runs Supabase security advisors, and reviews the work. It communicates only through the coordination files.

## Design skills
For any visual/UI work, agents must read `.claude/skills/frontend-design/SKILL.md` and `.claude/skills/ui-ux-pro-max/SKILL.md` and query ui-ux-pro-max with `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain>` (see PHASE10_BRIEF.md).

## Model policy (cost control — mandatory)
- **Orchestrator (main session): Claude Sonnet.** It plans and verifies; it does not need Opus.
- Each subagent has its model set in `.claude/agents/<name>.md`. Defaults:
  - **opus** only for security-critical work: `db-builder`, `lead-api-builder`, `admin-auth-builder`;
  - **haiku** for trivial screens: `thankyou-builder`;
  - **sonnet** for everything else (all other screens, logic, admin CRUD, logo pack, deploy prep, QA).
- Escalation: if a sonnet/haiku agent fails the same task twice, the orchestrator may re-run it once with the next model up (haiku → sonnet → opus) and must log the escalation in PROGRESS.md. Never use opus "just in case".
- Keep briefs short and focused; give agents only the PRD sections they need.

## Mandatory reading (orchestrator, at the start of EVERY loop iteration)
1. `CLAUDE.md` (this file)
2. `PRD_VERSUS_v0.6.md` — the full spec, source of truth. Never contradict it.
3. `TASKS.md`, `REVIEW.md`, `QUESTIONS.md`, `PROGRESS.md` (last entries), `SUPABASE.md`, `app/README.md` (once it exists)
Subagents read `CLAUDE.md` and the PRD sections relevant to their task.

## Coordination files
| File | Who writes | Purpose |
|---|---|---|
| `TASKS.md` | orchestrator (+ reviewer) | backlog: `[ ]` todo, `[~]` in progress, `[x]` done, `BLOCKED: reason` |
| `PROGRESS.md` | orchestrator | append-only log per completed task: date, task id, agent used, what changed, how verified, commit hash |
| `QUESTIONS.md` | orchestrator asks, reviewer/Giuseppe answer | blockers, `APPLY: <migration>` requests |
| `REVIEW.md` | reviewer | findings; fix them first, mark `[x] fixed in <commit>` |

## Loop protocol (orchestrator, each iteration)
1. Mandatory reading (above).
2. Open `REVIEW.md` items → delegate fixes to the right agent first.
3. Check `QUESTIONS.md` answers → unblock tasks.
4. Pick the next unblocked task(s). Spawn the matching subagent with a precise brief (task id, PRD sections, acceptance criteria, files it owns). Parallel agents only when they own **disjoint folders**; never two agents on the same files.
5. When the agent returns: verify yourself (`npm run typecheck && npm run lint && npm run test`, and the e2e specs of that area). If anything fails, send it back to an agent with the failure output.
6. Commit (`feat|fix|test|chore(scope): message`) and push **only to the current `preview/*` branch** (`git push origin <preview-branch>`). Mark task `[x]`, append to `PROGRESS.md`.
7. Blocked by something only Giuseppe/the reviewer can do → `BLOCKED: <reason>` + entry in `QUESTIONS.md`, move on.
8. When no unblocked task remains → summary at the end of `PROGRESS.md`, stop the loop.

## Hard rules (never break)
- **`main` is the Vercel production branch: never push to `main`, never merge into `main`.** Work on a `preview/*` branch (pushes there create Vercel Preview deployments, which is fine). Giuseppe merges to `main` himself after reviewing the preview.
- **Never deploy, publish, or go live.** Never buy anything, never create paid resources.
- **Never commit secrets.** `app/.env.local` is gitignored. Provide `app/.env.example` with empty values.
- **Never delete** files outside `app/`.
- **Source folder (READ-ONLY):** `/Users/pippo/Desktop/versus elementi/` contains only reference material (brand logo, supplier logos, PDFs). Read/copy files from it, **never write, move or delete anything there**. Ignore its `_archivio/` (obsolete old demo — never use it as guidance).
- Do not modify `PRD_VERSUS_v0.6.md`. Propose changes in `QUESTIONS.md`.
- Work only inside this project folder (`/Users/pippo/Desktop/versus-comparatore/`). The only other folder you may read is the source folder above.
- No "demo" wording anywhere in the UI. Placeholder offers look real but have `price_verified = false`.
- **No mention of phone calls / call center / callback in the UI before the thank-you page.**
- Do not copy Facile.it branding/elements (Club/points, "Tariffa esclusiva", "Annuncio pubblicitario", orange, "Parla con un esperto"). Layout inspiration only.
- Offer advantages shown in the UI come only from offer data in the DB.

## Language
Code, comments, commits, docs, coordination files: **English**. All customer-facing and admin UI copy: **Italian**.

## Tech stack (decided — do not change)
- Next.js (App Router, TypeScript strict) + Tailwind CSS, in `app/`.
- Supabase: Postgres + Auth (email/password, single admin) + Storage (logos). Migrations in `app/supabase/migrations/`, seed in `app/supabase/seed.sql`.
- RLS on every table exactly as PRD §4.
- Hosting target: **Vercel** (Hobby plan, custom domain; Pro may be needed later for commercial use). Cloudflare is not used. No Turnstile/captcha (anti-spam added later only if spam appears); server-side per-IP rate limiting (client IP from Vercel's `x-real-ip` / first `x-forwarded-for`) and the hashed server-only `LEAD_API_SECRET` are kept. Supabase keep-alive via a daily Vercel Cron Job (`app/vercel.json`). Resend for the new-lead email to Aldo.
- Tests: Vitest (logic, validators) + Playwright (flows, desktop 1440px + mobile 390px).

## Supabase project (already created by the reviewer)
- Ref `felnnfisnobpgetgtxle`, eu-central-1. URL + publishable key in `SUPABASE.md` → copy into `app/.env.local`.
- **No service role key exists for you.** Design:
  - public data (active suppliers/offers, comuni) → publishable key under RLS;
  - leads → `SECURITY DEFINER` functions callable by `anon` (`create_lead`, `update_lead(token, …)`, `complete_lead(token, …)`) that validate input and touch only the row matching the secret token; no direct `anon` grants on `leads`;
  - admin → Supabase Auth session + RLS restricted to admins (`admins` table or `app_metadata.role = 'admin'`).
- **You cannot apply migrations.** Write timestamped SQL files in `app/supabase/migrations/`, then add `## APPLY: <filename>` to `QUESTIONS.md`. The reviewer applies them and answers. Until then, work against the mock data layer.

## GitHub
- Repo already exists: **https://github.com/giuppi28/versus-comparatore** (private). `git init` at the project root (if not done), `git remote add origin https://github.com/giuppi28/versus-comparatore.git`, push `main`. Push after every completed task. If push fails for credentials, mark BLOCKED and explain in `QUESTIONS.md` (keep committing locally).

## Design
- VERSUS — "comparatore luce e gas". Logo files in `/Users/pippo/Desktop/versus elementi/versus-logo-svg/` (copy what you need into `app/public/brand/`). Black & white logo, **green palette**, clean and modern, rounded cards, icon-based selection blocks, generous whitespace.
- Supplier logos: originals in `/Users/pippo/Desktop/versus elementi/loghi energia /` (folder name ends with a space) and `/Users/pippo/Desktop/versus elementi/logopack/originali/` (see its MANIFEST.md) (from Giuseppe); processed pack goes in this project's `logopack/`. Until ready, use a neutral text-based logo fallback.
- Mobile-first: the entire flow must work perfectly at 390px.

## Build-orchestrator workflow (adopted 2026-10-24)
Phases 1–12c are live. From Phase 13 the project follows the build-orchestrator skill. Where this section and the older rules above differ, this section wins.
- **Branches:** work branch `dev` (Vercel builds it as a preview). `main` = production, merged only by Giuseppe. This replaces the `preview/*` branches.
- **Single sources:** remaining work → `docs/TASKS.md`; current state → `docs/HANDOFF.md`; traps → `docs/GOTCHAS.md` (read the "VERSUS" section before every task); features → `docs/FEATURES.md`; spec index + decision log → `docs/SPEC.md`. Root `TASKS.md`, `PROGRESS.md`, `HANDOFF_VERSUS_*.md` are history. `QUESTIONS.md` stays the channel for `APPLY:` requests and questions to the reviewer.
- **Agents:** kit agents `architect`, `backend-builder`, `frontend-builder`, `verifier`, `reviewer`, `critical-reviewer`, `scribe` sit next to the existing screen agents. The kit agent `reviewer` (code review inside this repo) is not the claude.ai "Reviewer" session described in Roles.
- **Commits:** `T<phase>.<n>: <summary>` per task. Agents never push (the `bash-guard` hook blocks it); Giuseppe pushes `dev` after his check.
- **Skill conventions that do NOT apply here** (decision log in `docs/SPEC.md`):
  - the app lives in `app/`, not at repo root — run every npm/npx command from `app/`;
  - one shared Supabase project (`felnnfisnobpgetgtxle`) for preview and production — no dev database;
  - no Supabase secret/service-role key; leads only via secret-gated `SECURITY DEFINER` functions;
  - migrations are never applied by Claude Code (file + `## APPLY:` in `QUESTIONS.md`; the reviewer applies it after Giuseppe's OK); types are updated by hand, not regenerated;
  - prices are decimals (`numeric`), not integer cents; Supabase Auth only (no Clerk);
  - the spec lives in `PRD_VERSUS_v0.6.md` + `app/README.md` + `app/DEPLOY.md`, not in `docs/PRD.md` / `docs/DESIGN.md` (design: PRD §1 + `PHASE10_BRIEF.md`).
