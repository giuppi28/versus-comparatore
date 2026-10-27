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
- PRD v0.6.2 and v0.6.3 notes — sections below (deltas after v0.6.1).
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

## PRD v0.6.3 notes (deltas, 2026-10-27, Phase 14)
These notes override the PRD and the v0.6.2 notes where they differ.
- §Activation step B (IBAN): the line under the IBAN field becomes "Sconto del 20% se paghi con IBAN", bold, inside a box tinted with VERSUS green; valid for all offers, IBAN-required ones included (decision #15, supersedes #12).
- §12 offers: new `iban_required` flag (admin "Pagamento con IBAN obbligatorio", default off). Results card + offer modal show "Per attivare questa offerta è obbligatorio il pagamento con IBAN: ti servirà al passo successivo."; step B makes IBAN required (label without "facoltativo") when any chosen offer requires it (dual: either one), enforced server-side; admin lead detail shows it (decision #16).
- §12 offers / §8 results: `price_type` may be `variable` (luce only) with `energy_price` = spread over PUN in €/kWh, shown "PUN + 0,01 €/kWh"; the card shows "Varia con il PUN" instead of the monthly cost and no "Bloccato N mesi" (`locked_months` null); variable offers are always after all fixed offers and never auto-featured; no PUN value is stored or fetched (decision #17).
- §8 ordering and badge: forced-featured offers for the customer's audience (admin: Casa / Partita IVA / Entrambi) on top, then fixed offers by monthly cost ascending, then variable offers (spread ascending). Badge "In evidenza" on forced-featured offers; if none is forced for that audience and commodity, the cheapest displayed fixed offer gets it (decision #18).
- §Loading screen: ~7.5 s total; earlier messages 0–3 s (bar to 50 %), "Stiamo ricercando per te l'offerta più bassa" 3–7 s (bar 50→100 %), "Ecco le migliori offerte per te!" short final flash; same sequence under reduced motion (decision #19, supersedes #11).
- §Thank-you: button "Salva il nostro numero" next to the callback number; downloads a vCard 3.0 (decision #20).
- §Activation step B: new section "Bolletta (facoltativa)": one digital PDF ≤ 4 MB, removable, stored like ID documents with kind `bill`; POD, PDR, codice fiscale and current supplier read in the browser and proposed in "Dati letti dalla bolletta: verifica e correggi"; the ID document section is unchanged (decision #21). §13.1 /privacy lists the bill.
- §12 suppliers / offers data: suppliers Sentra Energia, Estra Energia, Enegan, Asti Energy added with their logos; all previous offers replaced by Aldo's 42 offers, `price_verified = true` (decisions #22, #23).

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
| 15 | 2026-10-27 | IBAN line becomes "Sconto del 20% se paghi con IBAN", bold, in a VERSUS-green tinted box under the IBAN field. Fixed front-end text valid for ALL offers, IBAN-required ones included. Supersedes #12 (same truthful-copy reasoning: Giuseppe confirms it is a real general condition). | Giuseppe, scope change (T14.8). |
| 16 | 2026-10-27 | New column `offers.iban_required boolean not null default false` (admin checkbox "Pagamento con IBAN obbligatorio"). If any chosen offer (dual: either) requires it, step B makes IBAN required and the lead route handler rejects a step-B/complete request without IBAN (server-side, offers read through the data layer). The SQL lead functions are not changed for this. | Giuseppe (T14.2, T14.8). |
| 17 | 2026-10-27 | Variable offers: `price_type in ('fixed','variable')`; `variable` only for `commodity = 'luce'` (PUN is the electricity index; gas/PSV out of scope); `energy_price` holds the spread over PUN (€/kWh); `locked_months` null for variable, 1–120 for fixed. UI: "PUN + 0,01 €/kWh", "Varia con il PUN" instead of a monthly cost, no lock line. No PUN value is stored or fetched. Monthly-cost logic returns null for variable offers. | Giuseppe; v1 was fixed-only (T14.2, T14.5). |
| 18 | 2026-10-27 | Featured per audience: new column `offers.featured_audience text null check in ('casa','business','both')` is the source of truth; `featured` stays and the app keeps it in sync (`featured = featured_audience is not null`) so the production app keeps working until merge; the schema migration backfills `featured_audience = 'both'` where `featured`. Ordering: forced-featured for the customer's audience → fixed by monthly cost asc → variable by spread asc (current-supplier exclusion unchanged, applied first). Badge: forced-featured; else the cheapest displayed fixed offer of that commodity. Variable offers are never auto-featured. | Giuseppe (T14.2, T14.5). |
| 19 | 2026-10-27 | Loading screen ~7.5 s: earlier messages 0–3 s with the bar to 50 %; "Stiamo ricercando per te l'offerta più bassa" 3–7 s (bar 50→100 %); "Ecco le migliori offerte per te!" final ~0.5 s flash. Same sequence under reduced motion (no motion). Lead update during the animation still fires exactly once. Supersedes #11. | Giuseppe (T14.9). |
| 20 | 2026-10-27 | Thank-you "Salva il nostro numero": a GET route returns a vCard 3.0 (`text/vcard; charset=utf-8`, `Content-Disposition: attachment; filename="versus.vcf"`) with FN "VERSUS Comparatore", ORG VERSUS, TEL = callback number from settings (`get_callback_phone`), optional PHOTO (VERSUS icon, base64 PNG). A server route (not a client Blob) because iOS Safari opens "Aggiungi contatto" reliably only for a served .vcf. | Giuseppe (T14.10). |
| 21 | 2026-10-27 | Bill upload: `lead_documents.kind text not null default 'id_document' check in ('id_document','bill')`; same token-bound slot/confirm/remove design and admin signed-URL preview. Limits: id_document max 2 (unchanged), bill max 1, bill = `application/pdf` only, ≤ 4 MB client. Data extraction runs only in the browser with `pdfjs-dist` (no third-party service, no server parsing): POD `IT\d{3}E\d{8}`, PDR 14 digits, codice fiscale (16-char pattern), current supplier = match against known supplier names. Extracted values are proposed in a review dialog, never written silently over a value the customer typed. Scanned/unreadable PDF → "Non siamo riusciti a leggere i dati: inseriscili a mano". | Giuseppe; personal data stays in our stack (T14.3, T14.11–T14.13). |
| 22 | 2026-10-27 | New suppliers Sentra Energia (`sentra-energia`), Estra Energia (`estra-energia`), Enegan (`enegan`), Asti Energy (`asti-energia`): active, in dropdown, sell luce+gas, `logo_path '/logos/<slug>.svg'`. Logos from the "originali" pack (Sentra and Asti traced from PNG). Display name "Asti Energy" (its site shows "Aenergy"). | Giuseppe (T14.1, T14.4). |
| 23 | 2026-10-27 | Offers data: all previous offers deleted (leads keep their snapshots via the existing delete trigger) and replaced by Aldo's 42 offers (list in the T14.4 brief). Every price is the price Aldo applies when a customer chooses the offer, so `price_verified = true`. All offers: fees/other costs/activation 0, active, locked 12 months if fixed. Advantages = true facts only: "Prezzo bloccato per **12 mesi**" (fixed), "Tariffa **monoraria**" (luce fixed), "Attivala online con noi, gratis e in 1 minuto", "Puoi revocare il contratto entro 14 giorni". | Giuseppe + Aldo, 2026-10-27 (T14.4). |
| 24 | 2026-10-27 | Migration order: schema migration (additive, backward compatible) can be applied any time; the offers DATA migration (DELETE + variable rows the production app cannot render) is applied only together with Giuseppe's merge of `dev` into `main`. Mock data = the same 42 offers meanwhile. | Shared DB = production (#2). |
