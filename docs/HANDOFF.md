# HANDOFF — VERSUS
Updated: 2026-10-24 · Phase: 13 — Test stability and data checks · Branch: dev · Last commit: see `git log -1`

Single handoff since the 2026-10-24 adoption into the build-orchestrator workflow. Older handoffs (root `HANDOFF_VERSUS_*.md`) are history.

## Next step
Start Phase 13, Block A: T13.1 (`docs/TASKS.md`). Then Block B (T13.6–T13.10: FAQ removal, 6 s loading screen, IBAN 15% line, privacy/cookie). T13.11 (POD codes) stays blocked until the codes are confirmed.

## Status
- Production (`main`, https://versus-comparatore.vercel.app) = Phases 1–12c + recipient hotfix (merge commit 0d6620c, PR #2). Offers are still placeholders (`price_verified = false`).
- All APPLY migrations up to `20261023110000_lead_document_removal.sql` are applied on the real DB.
- Last full check (Phase 12b/12c): typecheck ✓ · lint ✓ · Vitest 1147/1147 · e2e 287 passed / 1 skipped (flakes green on re-run) · matrix 381 + 8 passed · `test:security` 85 passed / 1 skipped.
- Previous phases: 0 setup · 1 DB · 2 logic · 3 customer screens · 4 admin · 5 logo pack · 6 deploy prep · 7 test matrix · 8–9 review rounds · 10 visual upgrade · 11 admin deletions · 12/12b/12c activation data, documents, callback number, Resend test.

## Open issues (to solve)
- Flaky e2e: `validation.spec.ts:246` (mobile), `admin-leads.spec.ts:213` (desktop), `acceptance-phase12` callback phone (mobile, parallel), `page1.spec.ts:108` (fixture interference) → T13.1–T13.4.
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
- Align server `MAX_LEAD_DOCUMENT_BYTES` (5 MiB) with the 4 MB client limit — `app/src` lead document route.
- Accepted residual exposure in the 1-minute document-removal window (QUESTIONS.md APPLY 20261023110000).

## Log (current phase)
- 2026-10-24 Adopted build-orchestrator workflow (docs/, kit agents, hooks, statusline, settings) — a4a2d58.
- 2026-10-24 Decisions: page1 flake added (T13.4); orchestrator = Opus 5.5; POD codes still unconfirmed.
- 2026-10-24 Scope change: Phase 13 Block B added (T13.6–T13.10), POD task renumbered T13.11 (Block C); SPEC decisions #10–#14 + PRD v0.6.2 notes; GOTCHAS cookie/IBAN entries. Planning only, nothing built.
