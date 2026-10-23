# VERSUS — Handoff status (2026-10-23)

## What it is
VERSUS — "comparatore luce e gas": Italian electricity & gas comparison website for Aldo (energy broker). Owner: Giuseppe Pappalardo (SiteXP). Customers (private and Partita IVA) compare offers (luce / gas / luce+gas), get a monthly estimate, fill an activation form; Aldo's call center calls them back. Aldo manages offers and leads in an admin area.

## Status
- `main` (Vercel production branch, https://versus-comparatore.vercel.app) is at d56489d and untouched by Phase 12. Offers are still realistic PLACEHOLDERS (price_verified = false) until Aldo provides real prices.
- Phase 12 is complete on branch `preview/phase12`. **Not merged; `main` untouched.** Preview URL (Vercel branch alias, build state not verifiable from this session — Vercel API 403, no gh CLI): https://versus-comparatore-git-preview-phase12-giuseppes-projects-a9ce686f.vercel.app
- Phase 12 needs the APPLY below before the preview can store its new data on the real database.

## Where things are
- Project folder: /Users/pippo/Desktop/versus-comparatore/ — Next.js app in app/. Coordination files at root: CLAUDE.md (rules, model policy), PRD_VERSUS_v0.6.md (renamed from v0.5 in Phase 12), TASKS.md, PROGRESS.md, QUESTIONS.md, REVIEW.md, DESIGN_REVIEW.md, PHASE12_BRIEF.md, app/DEPLOY.md, app/README.md. Subagents in .claude/agents/.
- Read-only source material: /Users/pippo/Desktop/versus elementi/.
- GitHub: giuppi28/versus-comparatore (private). `main` = production branch.
- Supabase: project "versus-comparatore", ref felnnfisnobpgetgtxle, eu-central-1, org "sitexp" (free plan).
- Vercel: project versus-comparatore, team giuseppes-projects-a9ce686f, Hobby plan, region fra1.

## What Phase 12 delivered
Brief: `PHASE12_BRIEF.md`. Commits: 4d9526e DB · 669d4c3 logic · 60ab068, f563e89 admin settings · 1be18ef lead API · dd2e9a8, e83ffd6 admin lead detail · 08167e7 thank-you · 519c1f0 activation step B · fb4efc8 regression + design review · ef9370b, 8821acc design-pass fixes · this docs commit.
- **Resend test email** (Impostazioni): "Invia email di prova" sends to the saved notification email and shows Resend's response verbatim; banner when the sender is `@resend.dev`; rate limited (1 / 30 s, 10 / h per admin).
- **Callback number** (Impostazioni): "Numero da cui chiamiamo", default `+39 095 0000000`, shown on the thank-you page ("Riceverai a breve una chiamata dal numero … da un nostro consulente per confermare l'attivazione.").
- **IBAN** (step B, optional): format + mod-97; optional "L'intestatario del conto è diverso dal titolare" with holder name, surname and codice fiscale.
- **Identity document** (step B, optional): type, number, expiry (not past), issuing authority (all-or-nothing) and/or upload of JPG/PDF (magic-byte check, max 2 files, **max 4 MB**), stored in the private bucket `lead-documents` through a server route bound to the lead token.
- **POD/PDR**: normalized input; PDR typed in the POD field (and vice versa) gets a specific message; distributor recognized from the code; non-blocking warning when the POD distributor clearly does not serve the comune (Roma/areti, Milano/unareti).
- **Admin lead detail**: "Pagamento" and "Documento" sections, short-lived signed URLs (300 s) for preview/download, distributor line for luce and gas; deleting a lead deletes its files.
- **/privacy**: placeholder sentence on IBAN and ID documents.
- Tests (T12.8): typecheck ✓, lint ✓, Vitest 1116/1116 ✓, Playwright 279 passed / 1 skipped / 1 flaky (`admin-leads.spec.ts:213` desktop, green on re-run), matrix 381 + 8 passed with 1 known flake (`validation.spec.ts:246` mobile, green on re-run).

## APPLY (reviewer)
- `app/supabase/migrations/20261023100000_activation_documents_callback.sql` — see QUESTIONS.md "APPLY". Additive and idempotent. After applying: run `data_checks.sql` and `rls_test.sql`, then `npm run test:security`.
- Until applied, the preview (same real DB) cannot store the new fields or documents (the RPCs reject unknown fields) and shows the default callback number. Mock mode works fully.

## Before merging `preview/phase12` to `main`
- Design-pass fixes are committed on the branch (ef9370b activation, 8821acc admin leads), after fb4efc8. Their app code and e2e screenshots were not re-run by the docs task: run the regression once more before merging.
- Still uncommitted at hand-off, not Phase 12 app code: `DESIGN_REVIEW.md` and `.claude/scheduled_tasks.lock`. Review or discard them before merging.
- The APPLY above is a prerequisite: the lead RPC changes must reach production together with the app code.

## Open items
1. APPLY `20261023100000_activation_documents_callback.sql` (reviewer).
2. Upload limit 4 MB vs requested 5 MB (QUESTIONS.md, T12.7). Keeping 5 MB needs a direct-to-Storage signed upload (design change).
3. The customer cannot remove an uploaded file (2-file cap; out of scope for the design pass).
4. Distributor codes to confirm (QUESTIONS.md, T12.2): POD IT001/IT002/IT011/IT012/IT020; PDR table empty.
5. Privacy line "essere ricontattato" is pre-existing legal text (QUESTIONS.md, T12.8). Giuseppe to confirm it is acceptable under the copy rule.
6. CLAUDE.md and `.claude/agents/*.md` still reference `PRD_VERSUS_v0.5.md`. Giuseppe or the reviewer to update; no file was changed for this in Phase 12.
7. App SQL security suite (`e2e/security/supabase-security.vitest.ts`) has no Phase 12 tests yet.
8. Flakes: `admin-leads.spec.ts:213` (desktop) and `validation.spec.ts:246` (mobile), both green on re-run.
9. Privacy go-live data (controller, address, P.IVA, privacy email, retention) — still open from 2026-10-15.

## How to test on the preview
- **Admin → Impostazioni**: "Invia email di prova" (shows the Resend response; the `@resend.dev` banner appears while the sender is `onboarding@resend.dev`; a second send within 30 s is rate limited). Change "Numero da cui chiamiamo" (6–20 characters, digits, spaces, `+`).
- **Customer flow, step B** (Page 1 → results → offer → step A → step B): try an IBAN (valid and invalid, with spaces, lower case); tick "L'intestatario del conto è diverso dal titolare"; add document data (expiry in the past is refused) and/or upload a JPG/PDF (over 4 MB refused, other types refused, max 2 files); type a PDR in the POD field (and a POD in the PDR field); use a Roma POD with a non-Roma comune to see the warning.
- **Thank-you page**: the callback number from Impostazioni appears in the text.
- **Admin lead detail**: Pagamento and Documento sections; preview/download of uploaded files; the distributor line for luce and gas; delete the lead and check its files are gone.
- Note: until the APPLY, the new fields and uploads are not stored on the real DB; use mock mode for a full run.

## Working preferences (Giuseppe)
- Talk to him in Italian; anything given to Claude Code (prompts, docs) in English; always state model + effort for prompts to paste elsewhere.
- Wants autonomy; mixed models to control cost (Sonnet default, Opus only for security-critical work).
- Destructive SQL through the Supabase connector requires an interactive confirmation that often cannot be given: prefer non-destructive alternatives or ask Giuseppe to do it from the dashboard/admin.
