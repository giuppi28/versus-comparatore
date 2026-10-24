# HANDOFF — VERSUS
Updated: 2026-10-24 · Phase: 13 — Test stability and data checks · Branch: dev · Last commit: see `git log -1`

Single handoff since the 2026-10-24 adoption into the build-orchestrator workflow. Older handoffs (root `HANDOFF_VERSUS_*.md`) are history.

## Next step
Phase 13 Block A closed. Next: Block B, T13.9 (`docs/TASKS.md`). Then Block B (T13.6–T13.10: FAQ removal, 6 s loading screen, IBAN 15% line, privacy/cookie). T13.11 (POD codes) stays blocked until the codes are confirmed.

## Status
- Production (`main`, https://versus-comparatore.vercel.app) = Phases 1–12c + recipient hotfix (merge commit 0d6620c, PR #2). Offers are still placeholders (`price_verified = false`).
- All APPLY migrations up to `20261023110000_lead_document_removal.sql` are applied on the real DB.
- Last full check (Phase 12b/12c): typecheck ✓ · lint ✓ · Vitest 1147/1147 · e2e 287 passed / 1 skipped (flakes green on re-run) · matrix 381 + 8 passed · `test:security` 85 passed / 1 skipped.
- Previous phases: 0 setup · 1 DB · 2 logic · 3 customer screens · 4 admin · 5 logo pack · 6 deploy prep · 7 test matrix · 8–9 review rounds · 10 visual upgrade · 11 admin deletions · 12/12b/12c activation data, documents, callback number, Resend test.

## Open issues (to solve)
- POD codes IT002/IT011/IT012/IT020 unconfirmed → T13.11 (blocked).

## Waiting on Giuseppe (manual / go-live, not code tasks)
- Resend: verify the sending domain and set `RESEND_FROM` (with `onboarding@resend.dev` Resend delivers only to the account owner). Then test "Invia email di prova" on production.
- Aldo's privacy data for the `/privacy` placeholders: controller, address, P.IVA, privacy email, retention for IBAN and ID documents ([DA COMPLETARE]).
- Real offer prices from Aldo (`price_verified = true`); the admin go-live checklist stays "Non pronto" until then.
- Real callback number (Admin → Impostazioni; default `+39 095 0000000`).
- Custom domain on Vercel.
- Vercel Pro decision (Hobby is non-commercial use; see `app/DEPLOY.md` D1).
- MFA (TOTP) for the admin accounts.
- GitHub repo visibility (currently private) — decide and keep private unless there is a reason.
- Cleanup SQL for security-test leads: `delete from public.leads where first_name like 'TEST-SECURITY%';` (check `storage.objects` for leftover files first).
- Check HEIC upload on iPhone Safari (not testable in Chromium).

## Later (low-priority)
- `admin-leads.spec.ts:137` can still time out at 12 workers (2/114); admin edit forms have no `data-hydrated` marker.
- `e2e/admin-settings.spec.ts:80` also writes the global callback phone (mock settings row): may race `acceptance-phase12` — watch in T13.5.
- `acceptance-phase12` settings test is desktop-only: callback-number form + thank-you `tel:` link no longer checked at 390 px (add a read-only 390 px check if needed).
- `finally` cleanup in `acceptance-phase12.spec.ts` / `admin-suppliers.spec.ts` can throw and mask the original assertion error — wrap cleanup steps in `.catch`.
- Align server `MAX_LEAD_DOCUMENT_BYTES` (5 MiB) with the 4 MB client limit — `app/src` lead document route.
- Accepted residual exposure in the 1-minute document-removal window (QUESTIONS.md APPLY 20261023110000).

## Log (current phase)
- 2026-10-24 Adopted build-orchestrator workflow (docs/, kit agents, hooks, statusline, settings) — a4a2d58.
- 2026-10-24 Decisions: page1 flake added (T13.4); orchestrator = Opus 5.5; POD codes still unconfirmed.
- 2026-10-24 Scope change: Phase 13 Block B added (T13.6–T13.10), POD task renumbered T13.11 (Block C); SPEC decisions #10–#14 + PRD v0.6.2 notes; GOTCHAS cookie/IBAN entries. Planning only, nothing built.
- 2026-10-24 T13.1 done: validation.spec step A flake = test race with focusFirstInvalid rAF; spec waits for focus + asserts cleared value (140/140 mobile ×5) — dc48c8d.
- 2026-10-24 T13.2 done: admin-leads flake = dev-server compile latency under parallel load (mock data, no shared rows); test.slow() + 20 s expects; ×5 30/30, ×20@8 workers 120/120, @12 workers 2/114 fail (line 137, beyond acceptance) — 1c89098.
- 2026-10-24 T13.3 done: callback phone flake = single process-wide mock settings row shared by desktop+mobile; test now desktop-only, test.slow(), phone restored in finally (85 passed / 5 skipped ×5) — 8407817.
- 2026-10-24 T13.4 done: page1 flake = admin-suppliers created non-E2E logo suppliers in the shared mock repo; renamed E2E…, removed in finally (355 passed / 5 skipped ×5) — 6529d53.
- 2026-10-24 T13.5 Block A check: Vitest 1152/1152, e2e 306 passed ×3 (0 flaky), matrix 390; review: 0 high, 2 medium (page1 already filters E2E/QA — no change; admin-leads save expects back to default timeout — 698b552), 3 low → Later.
- 2026-10-24 T13.6 done: FAQ "compaiono nei risultati" removed (4 FAQ left), page1 e2e 65 passed / 1 skipped — 6f61c59.
- 2026-10-24 T13.7 done: loading 6 s (5×0.7 s + 2.5 s "offerta più bassa"), Vitest 1153, loading e2e green both projects — 62f728d.
- 2026-10-24 T13.8 done: bold "Sconto del 15% se paghi con IBAN" under the IBAN field (not in aria-describedby), activation e2e 34 passed — 2113887. Visual check at 1440/390 left to Giuseppe.
