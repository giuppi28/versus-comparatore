# TASKS — VERSUS (remaining work)

Single task list since the 2026-10-24 adoption. History of Phases 0–12c: root `TASKS.md` + `PROGRESS.md`.
Status: `[ ]` todo · `[~]` in progress · `[x]` done · `BLOCKED: reason`.
Review levels: 0 = builder typecheck + lint · 1 = block end: verifier + reviewer on the block diff · 2 = `critical`: critical-reviewer too.
All commands run from `app/`. Tests write to the shared (production) Supabase project: read `docs/GOTCHAS.md` → "Shared database" first.

## Phase 13 — Test stability and data checks

### Block A — flaky e2e tests
Goal: each spec passes 5 consecutive runs in the full parallel suite. Diagnose before fixing: decide whether the cause is the test (fixture, shared global state, timing) or the app (a real race). Fix the test if the test is wrong; fix the app only for a real race, and say so in the report.

- [ ] T13.1 Flake `e2e/matrix/validation.spec.ts:246` (mobile, activation step A, parallel load: a cleared prefilled field such as Cognome gets re-filled). Agent: `frontend-builder` (may consult `.claude/agents/activation-form-builder.md`). Read: that spec, `e2e/matrix/fixtures.ts`, the step A component and `src/lib/lead/flow-state.ts` / `flow-context.tsx`. Files: the spec and, only if it is an app race, the step A component / flow-state (≤ 4 files). Acceptance: root cause stated in 1–2 lines; `npx playwright test e2e/matrix/validation.spec.ts --project=mobile --repeat-each=5` green; typecheck + lint green. Size S–M. review: 0
- [ ] T13.2 Flake `e2e/admin-leads.spec.ts:213` (desktop). Agent: `frontend-builder`. Read: that spec and the fixtures it uses. Files: the spec (+ its fixture helper if needed). Acceptance: root cause stated; `--project=desktop --repeat-each=5` green; no assertion on rows the test did not create. Size S. review: 0
- [ ] T13.3 Flake `e2e/acceptance-phase12.spec.ts` "resend.dev banner, test email result, callback number save + reject" (mobile, parallel). Likely cause: the callback number is one global `settings` row shared by the desktop and mobile projects running in parallel. Agent: `frontend-builder`. Files: the spec (+ playwright serial/describe config for it). Acceptance: root cause stated; the test restores the original callback number in `finally`; full `npx playwright test e2e/acceptance-phase12.spec.ts --repeat-each=5` (both projects) green. Size S. review: 0
- [ ] T13.4 Flake `e2e/page1.spec.ts:108` (desktop + mobile, parallel: a concurrent admin-suppliers test leaves a logo supplier not named E2E/QA, which disturbs the page1 fixture). Agent: `frontend-builder`. Read: that spec, `e2e/admin-suppliers.spec.ts` (+ `admin-suppliers-delete.spec.ts`) and their fixtures. Files: those specs / fixture helpers only. Acceptance: root cause stated; every supplier created by tests uses the E2E/QA naming and is removed in `finally`; page1 does not assert on suppliers it did not create; `npx playwright test e2e/page1.spec.ts e2e/admin-suppliers.spec.ts --repeat-each=5` green. Size S. review: 0
- [ ] T13.5 Block A check. Agent: `verifier`. Run `npm run typecheck && npm run lint && npm run test`, then `npm run e2e` 3 times and `npm run e2e:matrix` once. Report raw pass/fail counts per run and any failing spec:line. Then `reviewer` on the block diff. review: 1

### Block B — POD distributor codes
- [ ] T13.6 BLOCKED: waiting for confirmation of the POD prefixes IT002 areti, IT011 inrete, IT012 unareti, IT020 ireti (only IT001 e-distribuzione is certain; QUESTIONS.md "Q (T12.2)"). Once Giuseppe/Aldo confirms or corrects them: agent `backend-builder` updates `app/src/config/distributors.ts` and its Vitest tests, removing any code that is not confirmed. Acceptance: table matches the confirmed list; Vitest green; the comune warning still triggers only for mapped cases. Size S. review: 0
