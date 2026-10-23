# PHASE 12 BRIEF — Activation data, callback number, Resend test (Giuseppe, 2026-10-23)

Branch `preview/phase12` (from `main` = d56489d). Never push to `main`, never deploy production, never touch secrets or Vercel env.
Lean: no over-engineering, no extra features, only essential tests (Vitest for logic/validation/security; a few Playwright specs for the new UI). No per-task screenshots/Lighthouse.
UI: reuse the existing VERSUS UI kit (`src/components/ui`) and patterns; no new visual styles. Read `.claude/skills/ui-ux-pro-max/SKILL.md` before UI work.
All UI copy Italian; code/comments/docs English. No phone/call wording anywhere except the thank-you page (and the admin settings label).
Mock server: the dev mock server caches the repository singleton (`globalThis.__versusRepo`); restart it after data-layer changes.

## E1 — Resend test email (admin)
- `/admin/impostazioni`: button "Invia email di prova" → server action (requireAdmin first) sends a short test email via Resend to the **current saved** `notification_email`.
- Shows Resend's response (id) or error **verbatim** (status + body message). Missing `RESEND_API_KEY`/`RESEND_FROM`/recipient → clear Italian message, no send.
- Warning banner when `RESEND_FROM` ends with `@resend.dev`: "Il mittente di prova consegna solo al proprietario dell'account Resend."
- Light rate limit: max 1 send / 30 s and 10 / hour per admin (in-memory is fine).

## E2 — Callback number
- New setting `callback_phone` "Numero da cui chiamiamo", default `+39 095 0000000`, editable in Impostazioni (validated: Italian phone-like, digits/spaces/+ only, 6–20 chars).
- Thank-you text (replaces the current callback sentence): "Riceverai a breve una chiamata dal numero <numero> da un nostro consulente per confermare l'attivazione."
- `settings` stays admin-only. Expose only this value safely (db-builder decides: returned by `complete_lead` and/or a minimal public read). Fallback to the default when unavailable.

## E3 — IBAN (step B, optional)
- Field "IBAN (facoltativo, se vuoi pagare con addebito sul conto)". Normalize (uppercase, strip spaces). Validate country length + mod-97. Bank name from ABI: skip (no reliable offline table).
- Checkbox "L'intestatario del conto è diverso dal titolare" → required Nome, Cognome, Codice fiscale of the account holder (existing CF validation incl. name/surname consistency). Only meaningful when an IBAN is given.
- Stored on the lead; shown in admin lead detail.

## E4 — Identity document (step B, optional)
- Either document data (Tipo: Carta d'identità / Patente / Passaporto; Numero; Data di scadenza (not in the past); Ente di rilascio) **or/and** an upload: JPEG or PDF only, max 5 MB, magic-byte check (JPEG `FF D8 FF`, PDF `%PDF-`), max 2 files.
- Private Supabase Storage bucket, no public access. Upload only through a server route bound to the lead token cookie (rate limited). No service-role key exists: db-builder designs the mechanism (e.g. server-only-secret RPC issuing a one-time upload path + Storage policy).
- Admin lead detail: preview + download via short-lived signed URL (≤ 5 min).
- Deleting a lead deletes its files (admin delete actions, single + bulk).
- `/privacy`: add a placeholder sentence about ID documents and IBAN (optional data, used only to complete the activation with the chosen supplier).

## E5 — POD / PDR
- Normalize input: uppercase, strip spaces and dots (client + server).
- Clear message when a PDR (14 digits) is typed in the POD field ("Sembra un codice PDR (gas): qui serve il POD della luce, che inizia con IT.") or a POD in the PDR field (mirror message).
- Distributor recognition via `src/config/distributors.ts`: POD prefix `IT` + 3 digits; PDR first 4 digits. Main distributors only.
  - POD (consistent across several secondary sources, no official list found): IT001 e-distribuzione, IT002 areti, IT011 inrete, IT012 unareti, IT020 ireti. Mark IT001 as certain, the others as "secondary sources" in a comment; list in QUESTIONS.md for confirmation.
  - PDR: no reliable source → table empty (Italgas `0088` from a single source → QUESTIONS.md only).
- Admin lead detail: "Distributore: <nome>" or "non riconosciuto" (luce and gas).
- Light **non-blocking** warning in step B only when the POD distributor clearly doesn't serve the customer's comune, for mapped cases only: comune Roma (ISTAT 058091) exclusively areti, Milano (015146) exclusively unareti; and areti PODs outside Roma/Formello. Copy: "Controlla il POD: il distributore indicato non serve di solito questo comune." Doubts → QUESTIONS.md.
- No SII integration.
