# HANDOFF — VERSUS
Updated: 2026-10-28 · Phase: 14b — small fixes (privacy IBAN text, tie rule, IBAN notice) · Branch: dev · Last commit: see `git log -1`

Single handoff since the 2026-10-24 adoption into the build-orchestrator workflow. Older handoffs (root `HANDOFF_VERSUS_*.md`) are history.

## Next step
Phase 14b in progress (T14b.1–T14b.3, decisions #25–#27). See the Log below.

## Status
- Production (`main`, https://versus-comparatore.vercel.app) = Phases 1–14 (PR #4, merge ae6e137). All Phase 14 migrations applied and verified on the real DB (20261027100000, 20261027110000 via connector; 20261027120000 by Giuseppe in the SQL editor before the merge). No pending APPLY.
- Real DB = Aldo's 42 offers (luce casa 13 / luce business 9 / gas casa 11 / gas business 9; 40 fixed, 2 variable; 4 IBAN-required; 4 business-featured), 18 suppliers.
- `dev` = `main` + Phase 14b. Phase 14 check (2026-10-27): typecheck ✓ · lint ✓ · Vitest 1280/1280 · build ✓ · e2e 324 passed / 2 skipped ×2 · matrix 423 + 8.
- Previous phases: 0 setup · 1 DB · 2 logic · 3 customer screens · 4 admin · 5 logo pack · 6 deploy prep · 7 test matrix · 8–9 review rounds · 10 visual upgrade · 11 admin deletions · 12/12b/12c activation data, documents, callback number, Resend test · 13 test stability, copy, privacy cookies · 14 Aldo's offers, variable prices, IBAN rules, bill upload, vCard.

## Open issues (to solve)
- POD codes IT002/IT011/IT012/IT020 unconfirmed → T13.11 (blocked).

## Waiting on Giuseppe (manual / go-live, not code tasks)
- Resend: verify the sending domain and set `RESEND_FROM` (with `onboarding@resend.dev` Resend delivers only to the account owner). Then test "Invia email di prova" on production.
- Aldo's privacy data for the `/privacy` placeholders: controller, address, P.IVA, privacy email, retention for IBAN and ID documents ([DA COMPLETARE]).
- Real callback number (Admin → Impostazioni; default `+39 095 0000000`).
- Custom domain on Vercel.
- Vercel Pro decision (Hobby is non-commercial use; see `app/DEPLOY.md` D1).
- MFA (TOTP) for the admin accounts.
- GitHub repo visibility (currently private) — decide and keep private unless there is a reason.
- Cleanup SQL for security-test leads: `delete from public.leads where first_name like 'TEST-SECURITY%';` (check `storage.objects` for leftover files first).
- Check HEIC upload on iPhone Safari (not testable in Chromium).

## Later (low-priority)
- Bill dialog: no "Rivedi dati letti" to reopen it after closing.
- Lockfile: T14.13 `npm install` pruned optional esbuild/terser deps — confirm a fresh `npm ci` + build on the Vercel preview.
- vCard has no PHOTO (only SVG icons; vCard 3.0 needs a raster). "Salva il nostro numero" tested OK on real phones (2026-10-28).
- `admin-leads.spec.ts:137` can still time out at 12 workers (2/114); admin edit forms have no `data-hydrated` marker.
- `e2e/admin-settings.spec.ts:80` also writes the global callback phone (mock settings row): may race `acceptance-phase12` — watch in T13.5.
- `acceptance-phase12` settings test is desktop-only: callback-number form + thank-you `tel:` link no longer checked at 390 px (add a read-only 390 px check if needed).
- `finally` cleanup in `acceptance-phase12.spec.ts` / `admin-suppliers.spec.ts` can throw and mask the original assertion error — wrap cleanup steps in `.catch`.
- `/privacy` admin-cookie bullet: add lifetime ("durata della sessione").
- Align server `MAX_LEAD_DOCUMENT_BYTES` (5 MiB) with the 4 MB client limit — `app/src` lead document route.
- Accepted residual exposure in the 1-minute document-removal window (QUESTIONS.md APPLY 20261023110000).

## Log (current phase)
- 2026-10-28 Phase 14 live (PR #4, ae6e137), migrations applied (QUESTIONS.md answers committed). Closed by Giuseppe, no code: CF from the bill stays in step A; vCard OK on real phones. GOTCHAS "preview offers inactive until merge" removed. Phase 14b decisions #25–#27 + tasks — ccea008.
- 2026-10-28 T14b.1 done: equal monthly cost → IBAN-free fixed offer first (badge follows); Vitest 1286 — a4ff579.
- 2026-10-28 T14b.2 done: /privacy IBAN text (required only for offers that state it; ID + bill optional), IBAN notice text-ink font-medium on neutral box; acceptance-phase12 + results e2e 51 passed / 1 skipped — ce0acad.

## Log (Phase 13–14)
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
- 2026-10-24 T13.9 done: /privacy Cookie section (#7, technical only), full "Dati raccolti", footer "Privacy e cookie"; copy.spec 13 passed — c927ffb.
- 2026-10-24 T13.10 Block B check: Vitest 1153, e2e 306 passed / 2 skipped, matrix 390; review: 0 high, 1 medium (privacy sessionStorage sentence untrue — fixed ab85f27), 2 low → Later.
- 2026-10-24 Phase 13 (A+B) complete; FEATURES/GOTCHAS updated — 8fbe62c.
- 2026-10-27 Scope change Phase 14: SPEC PRD v0.6.3 notes + decisions #15–#24, TASKS Phase 14 (T14.1–T14.16), offers CSV in docs/source/.
- 2026-10-27 T14.1 logo pack (4 new suppliers) found uncommitted from an earlier session; verified (deterministic rebuild, 78 tests, previews OK), preview label fixed to "Asti Energy".
- 2026-10-27 T14.2 done: migration 20261027100000_offers_variable_iban_featured.sql (+ BEFORE trigger offers_sync_featured keeping featured/featured_audience in sync for the production app), types, null locked_months handled; Vitest 1173, PGlite checks passed — 300186e. Notes: admin edit currently resets featured_audience (fix in T14.9); GrazieClient prints locked_months directly ("null mesi" for variable — fix in T14.7/T14.11).
- 2026-10-27 T14.3 done: migration 20261027110000_lead_document_kind.sql (kind column; register_lead_document + p_kind default; confirm_lead_document recreated with per-kind count, same signature); route `kind` field, 415 non-PDF bill, 409 too_many_bills; Vitest 1187, PGlite passed — 9e66367.
- 2026-10-27 T14.4 done: data migration 20261027120000_offers_aldo_2026_10_27.sql (4 suppliers, DELETE all offers, 42 offers, count check), PGlite offers_aldo_checks.sql, mock = same 42 (ids offer-aldo-01..42); Vitest 1188 — 5d156af. e2e specs depending on old offers left for T14.16. offer-form-schema test uses MOCK_OFFERS[1] until T14.9 (restore [0]).
- 2026-10-27 T14.5 Block A review: verifier green (build OK with NEXT_PUBLIC_DATA_SOURCE=supabase; mock build fails by design), critical-reviewer 0 high / 2 medium / 4 low; fixes d0ef787 (admin payload without new keys until T14.9, bill_limit_reached on confirm, explicit owners, active-supplier count check, APPLY notes). Re-review of the fix commit below.
- 2026-10-27 T14.5 re-review of d0ef787: all 6 fixed, critical review OK. Low carried into T14.9: mock create/update must set `featured = featured_audience !== null` when an audience is passed (DB trigger parity).
- 2026-10-27 T14.6 done: rankOffers(offers, audience, annual, {excludeSupplierId}), featuredBadgeIds, formatVariablePrice (NBSP before €), monthlyCost null for variable, audienceFor; Vitest 1211 — 7a1422a. Shims `monthlyCost ?? 0` left for T14.7.
- 2026-10-27 T14.7 done: variable card/modal ("PUN + …", "Varia con il PUN", no lock line), badge from featuredBadgeIds, IBAN notice (grey info box), null monthly cost through snapshot/summary/thank-you (monthly_cost_shown null); Vitest 1218, new results e2e green — 6de244b. 14 old results e2e cases fail on stale data → T14.16. Question for Giuseppe: IBAN notice grey vs brand tint.
- 2026-10-27 T14.8 done: 20% IBAN box (brand-50/700), IBAN required client + server (checkCompletionReferences → 422 fields.iban "required"), admin lead detail IBAN-required + "PUN + …"; Vitest 1223, activation e2e 36/36 — 215e0bc.
- 2026-10-27 T14.9 done: admin offer form (Tipo di prezzo, Spread sul PUN, IBAN obbligatorio, In evidenza select), list badges, mock parity; Vitest 1239, admin-offers e2e 16/18 (stale "list: filters" → T14.16) — d6f846a. results.spec/admin-deletions-cross selectors changed, not re-run.
- 2026-10-27 T14.10 done: loading 7.5 s (fractions of durationMs, barFill), results page DEFAULT_LOADING_MS was 4000 → 7500; Vitest 1241, loading e2e 4/4 — 9e3a658. Same 7 stale-data results tests per project still failing → T14.16.
- 2026-10-27 T14.11 done: GET /api/vcard (vCard 3.0, escaping/folding, TEL from settings, no PHOTO: only SVG icons exist), link "Salva il nostro numero" on thank-you; Vitest 1249, thankyou e2e 22 — 15e6c0e.
- 2026-10-27 T14.12 Blocks B+C check: typecheck/lint/Vitest 1249/build ✓; e2e subset 90 passed / 16 failed (8 stale-data tests ×2 → T14.16); review 0 high / 0 medium, low #1 vCard `;` escape fixed by orchestrator (below), lows #2/#3 no change (390 px of variable card → Giuseppe's browser check).
- 2026-10-27 T14.13 done: pdfjs-dist 6.4.299 (legacy build, local worker, lazy chunk), extractPdfText / parseBillText (validators reused, supplier aliases), Vitest 1270, build ✓ — 17582fd.
- 2026-10-27 T14.14 done: BillSection + merge dialog (per-field "Sostituisci…" checkbox), CF written to step A state with step A validation, admin labels, /privacy bill; Vitest 1277, activation-bill e2e 8/8 — 6b879e6. activation-extras "full submit" fails on stale offer id → T14.16. Question for Giuseppe: CF changed from the bill is not visible in step B (lives in step A).
- 2026-10-27 T14.15 Block D: verifier green (build ✓, 45/46 e2e, activation.spec:529 desktop flaky once); critical-reviewer 0 high / 1 medium (documents list race) / 4 low; fixes 0bc7f43 (functional document updates, pdf.js task.destroy, mismatched bill CF dropped, dialog focus). Later: reopen "Rivedi dati letti"; confirm `npm ci` from the new lockfile (pruned optional esbuild/terser deps).
- 2026-10-27 T14.15 re-review of 0bc7f43: M1, L2 fixed; new medium: `await task?.destroy()` in extract.ts finally can hang → use `void task?.destroy().catch(() => undefined)`; L3 partial: focus to bill item also after "Conferma" (apply()). Both applied after T14.16 run (see below).
- 2026-10-27 Re-review fixes applied by orchestrator: destroy() not awaited, focus after Conferma; Vitest 1280, bill e2e 8/8 — see git log.
- 2026-10-27 T14.16 done: e2e/matrix updated to Aldo's offers (new matrix/offer-kinds.spec.ts: variable, IBAN, forced business); e2e 324 passed / 2 skipped ×2, matrix 423 + 8, Vitest 1280; no app bugs — b08a820.
