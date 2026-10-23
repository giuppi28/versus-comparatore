# VERSUS — Handoff status (2026-10-23)

## What it is
VERSUS — "comparatore luce e gas": Italian electricity & gas comparison website for Aldo (energy broker). Owner: Giuseppe Pappalardo (SiteXP). Customers (private and Partita IVA) compare offers (luce / gas / luce+gas), get a monthly estimate, fill an activation form; Aldo's call center calls them back. Aldo manages offers and leads in an admin area.

## Status
- `main` (Vercel production branch, https://versus-comparatore.vercel.app) is at d56489d and untouched by Phase 12 and 12b. Offers are still realistic PLACEHOLDERS (price_verified = false) until Aldo provides real prices.
- Phase 12, Phase 12b and Phase 12c are complete on branch `preview/phase12`. **Not merged; `main` untouched.** Preview URL (Vercel branch alias): https://versus-comparatore-git-preview-phase12-giuseppes-projects-a9ce686f.vercel.app
- Both APPLY migrations are applied on the real database and verified by the reviewer. The preview can store the new data.
- Phase 12c is done. `preview/phase12` is ready for Giuseppe to review and merge.

## Where things are
- Project folder: /Users/pippo/Desktop/versus-comparatore/ — Next.js app in app/. Coordination files at root: CLAUDE.md (rules, model policy), PRD_VERSUS_v0.6.md (v0.6.1 from Phase 12b; renamed from v0.5 in Phase 12), TASKS.md, PROGRESS.md, QUESTIONS.md, REVIEW.md, DESIGN_REVIEW.md, PHASE12_BRIEF.md, app/DEPLOY.md, app/README.md. Subagents in .claude/agents/.
- Read-only source material: /Users/pippo/Desktop/versus elementi/.
- GitHub: giuppi28/versus-comparatore (private). `main` = production branch.
- Supabase: project "versus-comparatore", ref felnnfisnobpgetgtxle, eu-central-1, org "sitexp" (free plan).
- Vercel: project versus-comparatore, team giuseppes-projects-a9ce686f, Hobby plan, region fra1.

## What Phase 12 delivered
Brief: `PHASE12_BRIEF.md`. Commits: 4d9526e DB · 669d4c3 logic · 60ab068, f563e89 admin settings · 1be18ef lead API · dd2e9a8, e83ffd6 admin lead detail · 08167e7 thank-you · 519c1f0 activation step B · fb4efc8 regression + design review · ef9370b, 8821acc design-pass fixes · 01e1df6 DESIGN_REVIEW.md · 567aaa5 and later: see Phase 12b.
- **Resend test email** (Impostazioni): "Invia email di prova" sends to the saved notification email and shows Resend's response verbatim; banner when the sender is `@resend.dev`; rate limited (1 / 30 s, 10 / h per admin).
- **Callback number** (Impostazioni): "Numero da cui chiamiamo", default `+39 095 0000000`, shown on the thank-you page ("Riceverai a breve una chiamata dal numero … da un nostro consulente per confermare l'attivazione.").
- **IBAN** (step B, optional): format + mod-97; optional "L'intestatario del conto è diverso dal titolare" with holder name, surname and codice fiscale.
- **Identity document** (step B, optional): type, number, expiry (not past), issuing authority (all-or-nothing) and/or upload of JPG/PDF (magic-byte check, max 2 files, max 4 MB), stored in the private bucket `lead-documents` through a server route bound to the lead token.
- **POD/PDR**: normalized input; PDR typed in the POD field (and vice versa) gets a specific message; distributor recognized from the POD code; non-blocking warning when the POD distributor clearly does not serve the comune (Roma/areti, Milano/unareti).
- **Admin lead detail**: "Pagamento" and "Documento" sections, short-lived signed URLs (300 s) for preview/download, distributor line (luce; the gas line was removed in 12b); deleting a lead deletes its files.
- **/privacy**: placeholder sentence on IBAN and ID documents (full section added in 12b).
- Tests (T12.8): typecheck ✓, lint ✓, Vitest 1116/1116 ✓, Playwright 279 passed / 1 skipped / 1 flaky, matrix 381 + 8 passed with 1 known flake (green on re-run).

## What Phase 12b delivered
Brief and decisions: PROGRESS.md "PHASE 12b". Commits: 6ee93e3 removal · d152922 gas PDR · e652f8d privacy · 567aaa5 PRD references · 3ec2eaf compression and removal UI · this docs commit.
- **Customer removes an uploaded identity document** in step B: "Rimuovi" per file (44px, confirmation by name). Removed documents free their slot (max 2 at a time); removals count toward the 20-upload abuse cap per lead.
- **Client-side photo compression**: a phone photo is resized to max 2000 px and saved as JPEG (`<name>.jpg`) before upload; PDFs are unchanged. PNG, WebP and HEIC/HEIF are accepted. Hint: "Foto (JPG, PNG, HEIC) o PDF, fino a 2 file. Le foto vengono ridotte in automatico; max 4 MB." HEIC decodes only in browsers that support it (Safari).
- **Gas PDR not analyzed for the distributor**: only the 14-digit format and POD/PDR swap detection remain. PDR distributor table and admin gas distributor line removed. Luce POD distributor and comune warning unchanged.
- **/privacy**: section "IBAN e documento d'identità (facoltativi)" (purposes, optional, authorized staff only, transfer to the chosen supplier, deletion with the request). Retention is a placeholder: [DA COMPLETARE].
- **PRD v0.6.1** (§4, §5.1, §10, §12); CLAUDE.md and `.claude/agents/*.md` and PHASE10_BRIEF.md point to `PRD_VERSUS_v0.6.md`.
- Final check: typecheck ✓, lint ✓, Vitest 1147/1147 ✓, e2e 287 passed / 1 skipped / 2 fixture flakes (green on re-run), matrix 381 + 8 passed with 1 flake (green on re-run).

## APPLY (reviewer) — applied
1. `app/supabase/migrations/20261023100000_activation_documents_callback.sql` — applied and verified (QUESTIONS.md "APPLY: 20261023100000"). Additive and idempotent.
2. `app/supabase/migrations/20261023110000_lead_document_removal.sql` — applied and verified (QUESTIONS.md "APPLY: 20261023110000"). Requires 1.
- Phase 12c security suite on the real DB: `npm run test:security` 85 passed / 1 skipped, no security finding.

## Before merging `preview/phase12` to `main`
- The Phase 12b final check (PROGRESS.md) ran typecheck, lint, Vitest, the e2e suite and the matrix on this branch, with screenshots regenerated. The two fixture flakes were green on re-run. Re-run once more if the branch changes.
- `DESIGN_REVIEW.md` is committed (01e1df6). The `.claude/scheduled_tasks.lock` change was discarded.
- The two APPLY migrations are already on the real database. They must be on production before or with the app code that uses them.

## Open items
1. Giuseppe: run the TEST-SECURITY cleanup SQL: `delete from public.leads where first_name like 'TEST-SECURITY%';`. Each `npm run test:security` run creates 2 such leads. Check `storage.objects` for leftover files under the lead-id folders first, and delete them from Dashboard > Storage if any (PROGRESS.md "Phase 12c").
2. Giuseppe: test the Resend email on production after merge ("Invia email di prova" in Impostazioni).
3. Accepted residual exposure from the removal path: while a 1-minute removal window is open, anon could see or delete that single object (unguessable name; only the server opens a window). Documented in QUESTIONS.md APPLY 20261023110000.
4. Flakes, all green on re-run: `page1.spec.ts:108` (desktop + mobile, a concurrent admin-suppliers test left a logo supplier that disturbed the page1 fixture), `validation.spec.ts:246` (desktop in the 12b run, mobile in earlier runs), `admin-leads.spec.ts:213` (desktop, Phase 12).
5. POD distributor codes IT002 areti, IT011 inrete, IT012 unareti, IT020 ireti still to confirm (QUESTIONS.md, T12.2). IT001 e-distribuzione is certain.
6. HEIC works only in browsers that decode it (Safari). Check on iPhone Safari; not testable in Chromium.
7. Upload size: the server limit `MAX_LEAD_DOCUMENT_BYTES` is 5 MiB, the client limit 4 MB. The Vercel body limit (~4.5 MB) applies first. Harmless; can be aligned later.
8. Privacy go-live data still open (controller, address, P.IVA, privacy email, retention for IBAN and ID documents = [DA COMPLETARE]); open since 2026-10-15.

## How to test on the preview
- **Admin → Impostazioni**: "Invia email di prova" (shows the Resend response; the `@resend.dev` banner appears while the sender is `onboarding@resend.dev`; a second send within 30 s is rate limited). Change "Numero da cui chiamiamo" (6–20 characters, digits, spaces, `+`).
- **Customer flow, step B** (Page 1 → results → offer → step A → step B):
  - try an IBAN (valid and invalid, with spaces, lower case); tick "L'intestatario del conto è diverso dal titolare";
  - add document data (expiry in the past is refused) and/or upload a JPG/PDF (other types refused, max 2 files);
  - **upload a large phone photo (several MB)**: it is accepted and shown as a `.jpg` after compression; a PDF stays a PDF;
  - **remove an uploaded file with "Rimuovi", then upload another**: the freed slot works, and the list shows only the remaining files;
  - type a PDR in the POD field (and a POD in the PDR field); use a Roma POD with a non-Roma comune to see the warning.
- **Thank-you page**: the callback number from Impostazioni appears in the text.
- **Privacy page** (/privacy): section "IBAN e documento d'identità (facoltativi)"; retention shows the [DA COMPLETARE] placeholder.
- **Admin lead detail**: Pagamento and Documento sections; preview/download of uploaded files; the distributor line for luce only (**a gas lead shows no gas distributor line**); delete the lead and check its files are gone.
- Note: both APPLY migrations are on the real DB, so the new fields, uploads and removals are stored there.

## Working preferences (Giuseppe)
- Talk to him in Italian; anything given to Claude Code (prompts, docs) in English; always state model + effort for prompts to paste elsewhere.
- Wants autonomy; mixed models to control cost (Sonnet default, Opus only for security-critical work).
- Destructive SQL through the Supabase connector requires an interactive confirmation that often cannot be given: prefer non-destructive alternatives or ask Giuseppe to do it from the dashboard/admin.
