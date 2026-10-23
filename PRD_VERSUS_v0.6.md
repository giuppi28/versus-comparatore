# VERSUS — Comparatore luce e gas — PRD v0.6

Status: brainstorming complete — ready to build.
Last update: 2026-10-23 — v0.6: Phase 12 (activation data, callback number, Resend test email); 2026-10-15 — v0.5.2: visual upgrade (Phase 10, `PHASE10_BRIEF.md`) — visual/layout notes only; v0.5.1: hosting Vercel, Cloudflare removed (no Turnstile; rate limiting kept)
Owner: Giuseppe Pappalardo (SiteXP) — Client: Aldo (energy broker)

The previous demo is discarded. Reference material lives in the read-only folder `/Users/pippo/Desktop/versus elementi/`; the project lives in `/Users/pippo/Desktop/versus-comparatore/`. Everything is rebuilt from scratch.

---

## 1. Product summary

Public website where private customers and businesses (Partita IVA) compare **electricity (luce)**, **gas**, or **luce + gas** offers. The site shows an **estimate only**. After choosing an offer the customer fills in an activation form ("Attiva online in 1 minuto"); an operator from Aldo's call center always calls back to confirm and complete the activation (same model as Facile.it).

Brand: **VERSUS — comparatore luce e gas**. Existing black & white logo, green palette.
*v0.5.2 visual:* header lockup = black VERSUS icon (no square) + typeset "VERSUS" / dominant **COMPARATORE** / green "luce e gas"; light-green tinted header with a thin green gradient strip and the trust line "Confronto gratuito · 100% online" (≥1024px); simple footer on public pages (lockup, Privacy link, © VERSUS). Decorative illustrations (bulb, flame, bolt-drop, house) derived from the logo, always aria-hidden and never under text. Layouts are inspired by Facile.it but fully restyled with VERSUS identity — never copy Facile.it-specific elements (Club/points, "Tariffa esclusiva", "Annuncio pubblicitario", orange, "Parla con un esperto").

Target: all of Italy. Customers: private households and businesses.

---

## 2. Customer flow overview

1. **Page 1** — data collection + consumption estimate → lead saved on privacy consent
2. **Loading screen** — animated search (~4 s)
3. **Page 2** — offer results (luce, then gas for dual)
4. **Offer modal** — opens on "Attiva online in 1 minuto": offer advantages + confirm CTA
5. **Activation form — step A "Dati intestatario"**
6. **Activation form — step B "Fornitura"** (+ Luce / Gas supply data)
7. **Thank-you page** — lead completed and overwritten in the back-office

Out of scope v1: bill upload, offer PDF documents, customer emails, variable/indexed offers, VAT in estimates, multiple admin users.

---

## 3. Tech stack & hosting (decided, zero cost)

| Layer | Choice | Notes |
|---|---|---|
| App | Next.js (single app: public site + `/admin`) | deployed on Vercel |
| Hosting | Vercel Hobby + custom domain | Hobby is for non-commercial use; Pro (paid) may be needed for commercial use |
| Database | Supabase Postgres (Free) | |
| Auth | Supabase Auth, email + password | single admin user (Aldo) |
| File storage | Supabase Storage | supplier SVG logos (public) + customers' ID documents (private bucket `lead-documents`) |
| Email | Resend (free tier) | new-lead notification to Aldo only |
| Anti-spam | None for now | server-side rate limiting; add anti-spam later only if spam appears |
| Domain | ~10–15 €/year | only unavoidable cost |

Supabase free projects pause after 7 days of inactivity → daily Vercel Cron Job (keep-alive). Railway: not used.

---

## 4. Security requirements

1. Public sign-up **disabled**. One admin account (Aldo), created manually. Login = email + password (strong password enforced). MFA available as an option (recommended, not mandatory).
2. **Row Level Security (RLS)** on every table:
   - anonymous: read **active** offers and suppliers only; create and update **only their own in-progress lead** through server routes using a per-session lead token — no generic public update permission; never read leads.
   - authenticated admin: full access.
3. `/admin` protected **server-side**.
4. Supabase **service role key** only server-side.
5. Login protected by rate limiting.
6. Public forms protected by server-side rate limiting (no captcha for now; add anti-spam later only if spam appears).
7. Uploaded **SVG logos sanitized** server-side (strip scripts, event handlers, external refs).
8. GDPR: privacy consent checkbox required before any personal data is stored.

---

## 5. Admin area (Aldo only)

### 5.1 Leads
- List + detail view.
- Lead created on Page 1 privacy consent; the **same record** is updated at each step and **overwritten/completed** on final submit (`step_reached`: page1 / results / offer_chosen / completed).
- Status: new / contacted / in progress / closed. Internal notes.
- Completed leads clearly distinguished from abandoned/partial ones.
- Email notification to Aldo on each completed lead (address = Aldo's, configurable in settings).
- Lead detail shows IBAN (+ different account holder), ID document data and uploaded files (preview/download via short-lived signed URL, ≤5 min), and the distributor recognized from POD/PDR ("non riconosciuto" otherwise). Deleting a lead deletes its files.
- Admin can delete leads (single/bulk), offers and suppliers (with their offers); leads keep a snapshot of the deleted offer/supplier (Phase 11).

### 5.2 Suppliers
- Create / edit suppliers, upload SVG logo (sanitized). Flags: sells luce, sells gas, active.

### 5.3 Offers
- Pre-loaded by us with complete data; Aldo can **edit every field**, **activate/deactivate**, **create new offers** (any supplier, including new ones).
- Admin offer list shows exactly the active offers customers see.
- **Fixed-price, single-rate (monorario) offers only** in v1.
- Initial offers are realistic placeholders, **no "demo" label anywhere**. Internal `price_verified` (default false); go-live blocked until all active offers are verified by Aldo.
- Offer fields:
  - supplier, name, commodity (luce|gas), customer type (casa|business|both)
  - energy price (€/kWh or €/Smc)
  - other variable costs (€/kWh or €/Smc)
  - fixed fee (quota fissa) — per month **or** per year (stored monthly)
  - other fixed costs — per month or per year (stored monthly)
  - price locked for N months
  - activation cost (default 0,00 €)
  - promo/discount text
  - **advantages list** (ordered bullets with check marks in the offer modal; supports bold words)
  - details / conditions text
  - featured (In evidenza), active, price_verified
- **VAT excluded** from the estimate.

### 5.4 Settings
- Notification email (address for new completed leads).
- "Invia email di prova": sends a test email via Resend to the saved notification email and shows Resend's response verbatim (id or error). Warning banner when the sender is `@resend.dev` ("Il mittente di prova consegna solo al proprietario dell'account Resend."). Rate limited (1 send / 30 s, 10 / hour per admin).
- "Numero da cui chiamiamo" (default `+39 095 0000000`): shown on the thank-you page (§11). Validated: digits, spaces and `+` only, 6–20 characters.

---

## 6. Page 1 — data collection

Layout: **single centered column** (v0.5.2: hero and form centered at desktop), visual **blocks with icons**. Hero "COMPARATORE / LUCE E GAS" with a large low-emphasis green bulb in the background (≥1280px only). Below the form: "Come funziona" (3 steps), "Confrontiamo le offerte di" (real supplier logos, static) and a short factual FAQ.

### Block A — What to compare
**Luce** / **Gas** / **Luce + Gas** (icon cards).

### Block B — Customer type
**Casa** / **Partita IVA**.

### Block C — Personal data
- First name, last name, phone. Partita IVA: + company name (ragione sociale).
- **Comune**: searchable autocomplete of all Italian municipalities (ISTAT, ~7,900). Required. Maps to province, CAP(s), official climate zone (DPR 412/93).
- NOT asked here: codice fiscale, P.IVA number, email.
- Privacy consent checkbox (required). On acceptance the lead is saved immediately.

### Block D — Service type
**Cambio fornitore** / **Subentro** / **Voltura** / **Primo allaccio**.

### Block E — Current supplier
- Shown only for **Cambio fornitore** and **Voltura**. Hidden for **Subentro** and **Primo allaccio**.
- **Luce + Gas**: two separate dropdowns.
- **All offers of the current supplier are excluded** from results (per commodity).
- List: Enel Energia, Eni Plenitude, Edison Energia, A2A Energia, Hera Comm, Iren, Acea Energia, Sorgenia, Engie, E.ON Energia, Iberdrola + Servizio di Tutela / Tutele Graduali, Altro fornitore, Non lo so. (Verify names before go-live.)

### Block F — Consumption estimate (Casa)
Client-side; live result ("Consumo stimato: ~X kWh/anno" / "~X Smc/anno") + "Conosco il mio consumo" for manual entry.
"Quante persone vivono in casa?" (1 / 2 / 3 / 4 / 5+) asked **once**.

**Luce — "Per cosa utilizzi la Luce?"** (multi-select icon cards)

| People | 1 | 2 | 3 | 4 | 5+ |
|---|---|---|---|---|---|
| Base kWh/year | 900 | 1300 | 1600 | 1900 | 2200 |

| Appliance | kWh/year |
|---|---|
| Frigorifero | 300 |
| Forno | 150 |
| Lavastoviglie | 250 |
| Lavatrice | 200 |
| Climatizzatore | 500 |
| Scaldabagno elettrico | 600 per person |

**Gas**
- "Hai già il Gas a casa?" Sì / No. **No** → gas service type forced to Primo allaccio, current gas supplier hidden.
- "Per cosa utilizzi il Gas?" multi-select: Cucina, Riscaldamento, Acqua Calda.

| Use | Smc/year |
|---|---|
| Cucina | 40 + 10 per person |
| Acqua calda | 70 per person |
| Riscaldamento | m² × climate-zone coefficient |

Riscaldamento → also ask m²: <60 (50) / 60–90 (75) / 90–120 (105) / >120 (140).

| Zone | A | B | C | D | E | F |
|---|---|---|---|---|---|---|
| Smc per m² | 2 | 4 | 7 | 10 | 13 | 16 |

All coefficients in a single config file.

### Block F — Consumption (Partita IVA)
Annual kWh and/or Smc entered directly, with a hint on where to find it in the bill.

### Copy rule
**No mention of phone calls / call center / callback anywhere** until the thank-you page.

---

## 7. Loading screen

~4 s. *v0.5.2:* large black VERSUS icon centered inside a green progress ring; big rotating messages with key words in green, adapted to luce / gas / luce e gas ("Analizziamo i **tuoi consumi**" → "Stiamo confrontando le **offerte luce** per te" → "Analizziamo i **migliori fornitori**" → "Calcoliamo la tua **spesa mensile**" → "Ecco le **migliori offerte** per te!"; no supplier count); below, an infinite marquee of black supplier logos with faded edges (static row under reduced motion). Current supplier and placeholders never shown. Lead update during the animation.

---

## 8. Page 2 — Offer results

**Left — "I tuoi consumi"**: only consumption, editable (monthly kWh / Smc, prefilled = estimate ÷ 12); editing recalculates instantly. No potenza, fascia, filters.

**Right — offer cards**: supplier logo, Prodotto, "Bloccato N mesi", Prezzo/kWh (or /Smc), Quota fissa, "Vedi dettagli", **Spesa mensile** (large, tooltip "stima"), promo box, "In evidenza" band for featured, **single CTA "Attiva online in 1 minuto"**. No date, no filters.

*v0.5.2:* title "Le migliori offerte Luce|Gas **per te**" with "per te" in green in every variant (dual steps included; the step indicator distinguishes them), title block centered.

**Order:** featured first, then monthly cost ascending. **Excluded:** current supplier's offers.

**Luce + Gas:** same page, two steps (luce → gas) without reload; indicator "1 Luce ✓ → 2 Gas"; can go back.

```
monthly_cost = (annual_consumption / 12) × (energy_price + other_variable_costs)
             + fixed_fee_monthly + other_fixed_costs_monthly      (VAT excluded)
```

---

## 9. Offer modal

Opens on "Attiva online in 1 minuto". Close (X). Supplier logo + offer name. **"I vantaggi dell'offerta"** check-mark list (prezzo bloccato N mesi, tariffa monoraria, promo text, "Attivala online con noi, gratis e in 1 minuto", "Puoi revocare il contratto entro 14 giorni", + Aldo's advantages). "Caratteristiche principali". Single green CTA "Attiva online in 1 minuto". Persuasive but truthful copy (every advantage must be a real offer condition).
Luce + Gas: modal for each choice; activation form follows the gas choice.

---

## 10. Activation form

Two columns: form left, **"La tua offerta" sticky summary right** (logo, Spesa mensile large, Prodotto, Attivazione 0,00 €, Cambio contatore NO, Bloccato N mesi, Prezzo/kWh and/or /Smc, Quota fissa; dual: both offers + total). Payment (IBAN) and identity document are optional in step B (see below). No Club/points.

*v0.5.2:* every option card in steps A and B has a decorative icon (same set as Page 1).

### Step A — "Dati intestatario" (all required)
- Nome, Cognome (prefilled, editable); Telefono cellulare (prefilled)
- **Codice fiscale**: format + check character + **consistency with name and surname** (official algorithm for the first 6 chars) → inline error on mismatch.
- Partita IVA customers: + **P.IVA number** (11 digits, checksum validated); ragione sociale prefilled.
- "Nell'alloggio in cui vivi sei…?" Proprietario / Inquilino / Usufruttuario / Altro
- **No email field.** No "Mercato libero / tutelato".
- Prosegui / Indietro

### Step B — "Fornitura" (all required unless noted)
- Comune di fornitura (prefilled) + CAP; Indirizzo + civico; "Sei residente a questo indirizzo?" Sì / No
- **Luce**: Attuale fornitore (prefilled; hidden for Subentro / Primo allaccio), **POD** (starts with IT, 14 chars, accept 15 → keep 14; not required for Primo allaccio), Potenza impegnata (1,5 / 3 / 3,5 / 4 / 4,5 / 5 / 6 / 10 / 15 kW / Altro; default 3), Livello di tensione **220 V (monofase) / 380 V (trifase)**. No spesa annua.
- **Gas**: Attuale fornitore (prefilled; hidden for Subentro / Primo allaccio), **PDR** (14 digits; not required for Primo allaccio), usi del gas (prefilled, editable). No spesa annua.
- **POD / PDR**: input normalized (uppercase, no spaces/dots); a PDR typed in the POD field (or vice versa) gets a specific message; non-blocking warning when the POD distributor clearly does not serve the comune (mapped cases only: Roma/areti, Milano/unareti). No SII integration.
- **Pagamento (facoltativo)**: IBAN (format + mod-97; no bank lookup); checkbox "L'intestatario del conto è diverso dal titolare" → required Nome, Cognome, Codice fiscale of the holder (CF consistent with the holder's names).
- **Documento d'identità (facoltativo)**: tipo (Carta d'identità / Patente / Passaporto), numero, data di scadenza (not past), ente di rilascio — the four data fields are all-or-nothing — and/or upload JPG/PDF, magic-byte checked, max 4 MB (Vercel request-body limit ≈4.5 MB; spec asked 5 MB), max 2 files, via a server route bound to the lead token into a private bucket.
- Prosegui (submit) / Indietro

**On submit:** lead overwritten/completed (`step_reached = completed`, status = new) → email notification to Aldo → thank-you page.

---

## 11. Thank-you page

"Grazie, [Nome]!" — "Riceverai a breve una chiamata dal numero <numero> da un nostro consulente per confermare l'attivazione." (`<numero>` = admin setting "Numero da cui chiamiamo", §5.4.) + summary of chosen offer(s). No email/quote promise. Only place where the callback is mentioned.
*v0.5.2:* card unchanged; subtle background decoration (gas flame left, light bulb right) in the side margins, ≥1024px only.

---

## 12. Data model

- `suppliers`: id, name, slug, logo_path, sells_luce, sells_gas, show_in_dropdown, sort_order, active
- `offers`: id, supplier_id, name, commodity, customer_type, price_type (fixed), energy_price, other_variable_costs, fixed_fee_monthly, other_fixed_costs_monthly, locked_months, activation_cost, promo_text, advantages[], details, featured, active, price_verified, updated_at
- `comuni`: istat_code, name, province_code, province_name, region, caps[], climate_zone
- `leads`: id, token, created_at, updated_at, step_reached, status, notes,
  commodity, customer_type, first_name, last_name, phone, tax_code, company_name, vat_number, housing_title,
  comune_istat, cap, address, street_number, is_resident,
  service_type, current_supplier_luce, current_supplier_gas, has_gas,
  people, appliances[], gas_uses[], sqm_range, estimated_kwh_year, estimated_smc_year, manual_consumption, final_kwh_month, final_smc_month,
  chosen_offer_luce, chosen_offer_gas, monthly_cost_shown,
  pod, power_kw, voltage, pdr,
  privacy_consent, marketing_consent,
  iban, iban_holder_different, iban_holder_first_name, iban_holder_last_name, iban_holder_tax_code,
  document_type, document_number, document_expiry, document_issuer
- `lead_documents`: metadata of the lead's uploaded files (id, lead_id, object_path in private bucket `lead-documents`, mime, size, status pending/uploaded, expires_at, uploaded_at)
- `settings`: notification_email, callback_phone, other global values

---

## 13. Remaining items (non-blocking)
1. Privacy notice text (states the contact purpose; discreet on Page 1).
2. Supplier logos: originals in the source folder, builder produces the uniform pack in `logopack/`.
3. Aldo's notification email address.
4. Real offers from Aldo to replace placeholders before go-live.
