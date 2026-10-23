# DESIGN_REVIEW — VERSUS (Phase 9, 2026-10-15)

Reference aesthetic: `versus elementi/_archivio/comparatore-demo-reference.html` (visual style only): page grey `#EFF1F4`, white cards, ink `#0B0F1A`, thin `#DCE0E7` borders, 10px radius, Archivo wide headings + Inter body. VERSUS uses its green palette as the accent.
Method: Playwright screenshots of every screen at 1440px and 390px (`e2e/matrix/screenshots.spec.ts` → `app/e2e/screenshots/`), reviewed by the orchestrator. Claude in Chrome used only for a final check if connected.
Status legend: `[ ]` open · `[x] fixed in <commit>`.

## Giuseppe's issues (round 1)
- [x] fixed in 3a1f48e — G1 VERSUS logo rendered as an `<img>` of an SVG with a full-bleed white background (white box on tinted bg) → inline `<svg>` component (`components/brand/VersusLogo`), official path data, background rect dropped, on a white header bar.
- [x] fixed in 3a1f48e — G2 No prominent "Comparatore luce e gas" headline → hero H1 "COMPARATORE / LUCE E GAS" (Archivo wide, second line green).
- [x] fixed in 2747a0d — G3 Orbiting-logos loading animation → minimal: VERSUS icon with a soft pulse, message with fade, thin progress bar, one quiet row of greyscale logos highlighted one at a time. ~4 s, current supplier never shown.
- [x] fixed in 587e64a — G4 Current-supplier block "not visible". Investigation: logic is correct (verified locally and on the Vercel preview, real DB has all 14 suppliers active + `show_in_dropdown`). Cause: no service type is preselected, so Block E stays hidden until the customer picks a service, and then appears silently below. Fix (decided by Giuseppe): preselect "Cambio fornitore" + animated reveal of Block E when the service changes.
- [x] fixed in 8a1dc12 — G5 Remove Cloudflare entirely (Turnstile, OpenNext, wrangler, `cloudflare/`, `build:cf`); hosting Vercel; daily Vercel Cron keep-alive; client IP only from Vercel headers.

## Decisions taken by the orchestrator (autonomous mode)
- D1 Headings: page titles use `heading-wide` (Archivo wide, uppercase). Card/section titles get a smaller wide uppercase style (`heading-section`, ~15–17px, like "LA TUA STIMA" in the reference). Field labels stay Inter.
- D2 Buttons: the wide uppercase label is used for `size="lg"` buttons of **both** variants (primary and secondary), so buttons on the same row match ("Indietro" / "Prosegui"). Admin forms use the normal `md` size (normal case). Label size of lg buttons ≥ 14px for readability.
- D3 Form controls: card borders stay `#DCE0E7` (reference), but input/select/checkbox borders get a dedicated darker token with ≥ 3:1 contrast on white (WCAG 1.4.11).
- D4 Disabled primary button: neutral grey fill + muted text (not pale green).
- D5 Option groups: the visible block title already asks the question; the redundant visible legend under it ("Tipo di fornitura", "Tipo di cliente", "Tipo di servizio") becomes visually hidden (kept for screen readers / accessible names).
- D6 Loading screen keeps a quiet logo row (PRD §7 updated accordingly in v0.5.1).

## Findings — shared UI kit (`components/ui`) → setup-builder
- [x] fixed in 6ec59f9 — U1 SelectCard compact variant: the radio/check indicator overlaps the centered label (activation "Nell'alloggio in cui vivi sei…?": "Proprietario", "Usufruttuario"). Reserve space for the indicator.
- [x] fixed in 6ec59f9 — U2 Control border contrast 1.6:1 (`line-strong`) → D3.
- [x] fixed in 6ec59f9 — U3 lg button label 12.5px uppercase is small; mixed-case secondary next to uppercase primary → D2.
- [x] fixed in 6ec59f9 — U4 Disabled primary button looks pale green with low-contrast text (admin login before hydration) → D4.
- [x] fixed in 6ec59f9 — U5 Add `heading-section` utility (D1) and a visually-hidden legend option in the Field/FieldGroup kit (D5).
- [x] fixed in 6ec59f9 — U6 Selected SelectCard captured semi-transparent (activation "380 V"): check transitions/opacity on selected state so the selected card is never faded.

## Findings — Page 1 → page1-builder
- [x] fixed in 587e64a — P1 G4 (preselect Cambio fornitore + animated reveal of Block E).
- [x] fixed in 587e64a — P2 Block titles in Inter bold → `heading-section` (D1); redundant legends hidden (D5).
- [x] fixed in 587e64a — P3 "Confronta le offerte" CTA: full-width lg with D2 style; check the sticky/bottom spacing on mobile.
- [x] fixed in 587e64a — P4 Consistent vertical rhythm between blocks (24px mobile / 24–32px desktop); errors summary & field errors still near the field.

## Findings — Results + offer modal → results-builder
- [x] fixed in 95dfba1 — R1 Page title "Le migliori offerte Luce per te" / "Scegli l'offerta Gas" in Inter bold → `heading-wide` (smaller than the hero).
- [x] fixed in 95dfba1 — R2 "I tuoi consumi" card title → `heading-section`; make the consumption sidebar sticky on desktop (top offset under the header).
- [x] fixed in 95dfba1 — R3 Modal header: offer name not vertically centred with the logo tile; section titles ("I vantaggi dell'offerta", "Caratteristiche principali") → `heading-section`.
- [x] fixed in 95dfba1 — R4 Dual step indicator + "Torna alla Luce" link: align on one baseline, consistent pill style. (At 390px the back pill wraps to a second row, left-aligned: accepted, no copy cut.)

## Findings — Activation + thank-you → activation-form-builder
- [x] fixed in 810527a — A1 Card titles ("Dati intestatario", "Fornitura", "La tua offerta", "Luce", "Gas") → `heading-section`.
- [x] fixed in 810527a — A2 Buttons row "Indietro" / "Prosegui" mixed styles → D2.
- [x] fixed in 810527a — A3 Thank-you: supplier shown as a text chip although the logo exists → show the supplier logo (fallback to the chip when no logo).
- [x] fixed in 810527a — A4 Thank-you: nested grey cards inside the white card are heavy → white sub-cards with thin border, or a single list; total row stays green.

## Findings — Admin → admin-leads-builder (whole admin area)
- [x] fixed in 47a5013 — AD1 Page titles ("Lead", "Modifica offerta", …) → `heading-wide` (small); card titles → `heading-section`.
- [x] fixed in 47a5013 — AD2 Leads segmented control (Completati / Parziali / Tutti): selected = full green block, heavy → subtle segmented control (white selected pill with border/shadow on grey track, or ink text + green underline).
- [x] fixed in 47a5013 — AD3 Leads filters use native-looking selects, inconsistent with the UI kit Select → use the kit Select.
- [x] fixed in 47a5013 — AD4 Top nav has no active-page indicator → add one (aria-current + visual).
- [x] fixed in 47a5013 — AD5 Mobile (390px): nav "Impostazioni" is clipped at the right edge → make the nav fit (wrap, smaller gaps or horizontal scroll with visible affordance); no horizontal page scroll.
- [x] fixed in 47a5013 — AD6 Admin form buttons: "Annulla" vs "SALVA MODIFICHE" mixed styles → md size both (D2).

## Re-check
- [x] After fixes: full screenshot pass at 1440 + 390 (matrix screenshots.spec, no horizontal overflow on any screen) and Lighthouse a11y = 100 on every public page/state, desktop + mobile. Screens re-checked by the orchestrator.

## Notes from the fix round
- Page 1 preselection is applied by Page 1 itself after hydration (only while `serviceType` is null), so a service already chosen is never overridden; the lead created at consent now carries `service_type = cambio_fornitore`. The "service required" validation stays in the code (unreachable from the UI, still unit-tested).
- Admin login/MFA keep the full-width lg submit ("ACCEDI"): entry screens, not CRUD forms.
- The offers admin filter got the same segmented style as the leads filter, for consistency.

## Phase 10 — round 1 (design-reviewer, T10.7, 2026-10-15)

Method: matrix screenshot spec (`app/e2e/screenshots/*-1440.png|*-390.png`, regenerated) + own Playwright runs (header at 1440/1024/768/700/640/390, loading at ~1.5 s and ~3 s at 1440/390, reduced-motion at 1440/390; scratch shots in the session scratchpad). Checked against PHASE10_BRIEF B1–B6, ui-ux-pro-max priorities 1→10 (a11y, touch, layout/responsive, style consistency, typography/colour, animation) and the frontend-design restraint rules.

Overall: B1–B6 are delivered and the result is clean and coherent (lockup, tinted header, centred Page 1, loading ring + marquee, green "PER TE", icon cards, decorated thank-you, footer). Loading screen, results, modal, activation and admin need no change. One real responsive bug (P10-1) and a handful of polish items.

### Findings

- [ ] **P10-1 — high — all public pages, 640–~800px (tablet / large phone landscape): header trust line overflows and creates horizontal page scroll.**
  Measured `scrollWidth - clientWidth` on `/`: 768px = 12px, 700px = 80px, 640px = 140px (0 at 390 and ≥1024). The header row (lockup ≈440px + trust line "Confronto gratuito · 100% online" ≈240px + gap) does not fit between the `sm` breakpoint (640) and ~800px; the trust text is cut at the right edge at 768 ("100% onlin").
  Fix: in `components/brand/SiteHeader.tsx` show the trust line only from `lg` (`hidden lg:flex` instead of `hidden sm:flex`); keep `sm:h-16`. (Alternative: `min-w-0` + shorter text at `md`, but hiding is simplest and matches the 390px behaviour.) Re-check 640, 700, 768, 800, 1024 for `scrollWidth == clientWidth`.
  Owner: `setup-builder`. Rule: ui-ux-pro-max §5 Layout & Responsive "No horizontal scroll"; brief global constraint "no horizontal scroll".

- [ ] **P10-2 — medium — Page 1, 1024–1440px: header is narrowed to `lg:max-w-2xl`, its content overflows that box and sits off-centre, and the header jumps horizontally between Page 1 and every other screen.**
  `app/(public)/page.tsx` passes `className="lg:max-w-2xl"`; the inner row is 672px but lockup + trust line need ≈700px, so the content spills to the right (centre of the group at x≈787 at 1440 instead of 720) and the lockup starts at x≈410 on Page 1 vs x≈170 on loading, results, activation, thank-you and the footer. The brief asks to centre the Page 1 hero and form, not to shrink the header; the narrow header also makes Page 1's own footer (x≈170) misaligned with its header.
  Fix: remove the `className="lg:max-w-2xl"` override so Page 1 uses the same `max-w-6xl` header as all other pages (hero and form stay centred below). Verify at 1440 and 1024.
  Owner: `page1-builder` (file `app/src/app/(public)/page.tsx`). Rule: ui-ux-pro-max §4 Style consistency / §9 predictable navigation chrome; frontend-design "visual structure is information".

- [ ] **P10-3 — medium — Page 1 "Confrontiamo le offerte di" strip, 1440 + 390: colour logos forced to greyscale at 75% opacity look washed-out and uneven.**
  `components/page1/LandingSections.tsx` uses the colour SVG with `opacity-75 grayscale`: Plenitude, Iberdrola, A2A and Acea become faint grey, Acea reads as an anonymous "Q", while Enel/E.ON/Edison are heavy. The normalised black set (`/logos/black/*.svg`, already used by the loading marquee) renders crisp and consistent at the same box size.
  Fix: reuse the loading screen's `blackLogoUrl()` logic (move it to a shared helper, e.g. `lib/logos.ts`, and import it in both places): local `/logos/<slug>.svg` → `/logos/black/<slug>.svg`, no `grayscale` filter; fallback for non-local URLs `brightness-0`; use a uniform `opacity-80` (or 100) and keep the 28/32px box heights. Keep placeholders (Tutela/Altro/Non lo so) excluded.
  Owner: `page1-builder`. Rule: ui-ux-pro-max §6 colour/"gray-on-gray" and §4 consistency; brief B2 ("real supplier logos, black/greyscale").

- [ ] **P10-4 — low — Page 1 hero bulb, 1440 / 768 / 390: decoration touches or sits under the headline.**
  At 1440 the bulb's left ray starts exactly at the right edge of the "E" of COMPARATORE; at 768 and 390 the bulb outline runs behind the last letters of COMPARATORE and behind the first lines of the subtitle ("mostriamo", "casa o"). Contrast is not reduced (the tint is very pale) but the headline should read on clean grey. Size/strength at desktop are fine (visible but low emphasis): keep.
  Fix: desktop (`lg`+) shift the bulb ≈60–80px further right or down so no ray touches the H1; below `lg` crop it to the top-right corner above/beside the H1 (e.g. top offset so it ends before the subtitle) or drop its opacity ≈30% on `<md`; it must never overlap the subtitle or the first card.
  Owner: `page1-builder`. Rule: brief global "decorations never under text", ui-ux-pro-max §1 contrast.

- [ ] **P10-5 — low — Loading screen, reduced motion, 390px: static logo grid is off-centre.**
  Each `LogoItem` carries `pr-10 sm:pr-14`, so the centred wrapped row has a right-heavy gap (≈76px left margin vs ≈156px right inside the card at 390).
  Fix: in the reduced-motion branch of `SupplierMarquee` add negative end margin to compensate (`-mr-10 sm:-mr-14` on the `<ul>`) or switch the items to symmetric `px-5 sm:px-7` for the static variant only; leave the animated marquee spacing unchanged.
  Owner: `loading-builder`. Rule: ui-ux-pro-max §5 layout polish; brief B3 (static row for reduced motion).

- [ ] **P10-6 — low/medium — Thank-you page, 1440 + 390: background decoration is busier than "subtle", and at 390 only cropped slivers show behind the card edges.**
  At 1440 there are 4 flames + a house outline on the left and 2 bulbs + a drop on the right (≈8 mid-green pieces); the brief says "subtle, never busy" and the frontend-design rule is one memorable element. At 390 the cropped pieces peek out at the card's top and bottom corners and read like rendering artefacts.
  Fix: desktop keep one large flame (left) and one large bulb (right), plus at most one small accent per side (drop or small flame), and soften the fill ≈20% (lighter than today). Mobile: hide the decoration below `sm` (`hidden sm:block`) or show a single piece fully in the top margin above the card, never cropped by the card edge. Decoration stays `aria-hidden`, static, behind the card.
  Owner: `thankyou-builder`. Rule: frontend-design "Restraint and self-critique"; brief B6 and global "keep it clean".

### Checked and dismissed (no action)
- Footer (1440 + 390): lockup, Privacy link (44px tall tap area), © VERSUS 2026; consistent on Page 1, results, activation, thank-you, privacy. Fine.
- Admin login and admin header with the new lockup: white admin header with the compact lockup, tidy at 1440 and 390 (nav wraps below the lockup on mobile, no clipping). Fine; admin is deliberately not tinted green.
- Bulb "too faint/small": acceptable and correct for "low emphasis"; only its position needs P10-4.
- Selected "380 V" card looking semi-transparent in `activation-dual-b-filled-1440.png`: screenshot taken mid colour-transition (`transition-colors` only, no opacity); the selected state is solid in the 390 shot. Not a bug.
- Loading screen (1.5 s / 3 s, normal and reduced motion, 1440 + 390): ring, green keywords, black logos, edge fades, current supplier absent, no CLS or overflow. Good.
- Results luce / gas / dual step 1 + 2, offer modal: "PER TE" green in all variants, centred title, step pill, cards and modal clean at both widths. Good.
- Activation step A/B (casa and Partita IVA, dual): option icons consistent with Page 1 icon style, labels intact, 390 layout clean. Good.
- Copy rules: no call wording before the thank-you page, no "demo", no Facile.it elements, no invented numbers on any screen reviewed.
- Note (not design, already known): the privacy page still shows legal placeholders in square brackets (`[Ragione sociale del titolare]`, etc.). Must be filled before go-live.

### Verdict round 1
Needs fixes: P10-1 (high) must be fixed; P10-2 and P10-3 (medium) should be fixed; P10-4/5/6 are polish. After fixes the result is ready.

## Phase 10 — round 2 (design-reviewer, T10.7, 2026-10-15)

Method: own Playwright runs against the mock dev server (header/Page 1/privacy overflow at 320, 360, 390, 640, 700, 768, 800, 1024, 1280, 1440; Page 1 at 390/768/1024/1440; loading at 390/1440 in normal and reduced motion; thank-you at 390/1024/1280/1440) plus the regenerated matrix screenshots (`app/e2e/screenshots/*`: results luce/gas/dual, modal, activation, privacy). Note: `thankyou-luce-1440.png` and the other `thankyou-<case>-*` files in that folder still show the pre-P10-6 decoration (stale, not regenerated by commit 6443134); `thankyou-dual-logo-*` is current. Scratch shots live in the session scratchpad (`.../scratchpad/r2/`).

### Round-1 items
- [x] verified — P10-1 header overflow: `scrollWidth - clientWidth` = 0 on `/` and `/privacy` at 320, 360, 390, 640, 700, 768, 800, 1024, 1280, 1440. Trust line shows from lg only; compact lockup at 390/320 is tidy.
- [x] verified — P10-2 Page 1 header: same `max-w-6xl` header as every other screen (lockup at x=170 at 1440 on Page 1, loading, results, thank-you; footer aligned with it). No jump between screens.
- [x] verified — P10-3 supplier strip: black normalised logos, uniform weight, centred last row, 1440 and 390. (Enel's thin strokes and the Acea mark are asset traits, not a defect.)
- [x] verified — P10-4 (position part): at 1024/1280/1440/1920 the bulb box starts 17-18px or more to the right of the H1 text (e.g. 1440: H1 right 1047 / bulb left 1064; subtitle clear), nothing touches the headline or the first card; below lg the sliver sits above the H1 and never overlaps text. See P10-7/P10-8 for tint and mobile polish.
- [x] verified — P10-5 reduced-motion logo row centred: 390 left/right gaps 81/81px, 1440 60/62px.
- [x] verified — P10-6 thank-you decor: 1440/1280/1024 one large flame (left) + one large bulb (right), small accents only from xl, softer tint, clear of the card; hidden below lg (390 shows none, no cropped slivers); no horizontal scroll.

### Answer to the specific question (Page 1 bulb at 1440)
Yes, it is now slightly too faint. `text-brand-100` (#D6F5E3) on the page grey (#EFF1F4) is about 1.1:1 and the mask fades it out before the shape finishes, so at 1440 it reads as a ghost; on a normal laptop screen or with reduced brightness it is easy to miss and does not read as an intentional brand element. Also the mask ends beyond the hero's `overflow-hidden` bottom, so the lower part of the bulb is hard-cropped at y≈375 instead of fading. Tried in a live DOM override at 1024/1280/1440: brand-200 tint, 30rem tall, fade completed exactly at the hero bottom. The result reads clearly as a green bulb with bolt, is still low emphasis, stays clear of the text (bulb box left edge unchanged: 17px or more from the H1 at every width), and no overflow. Proposed exact fix is P10-7.

### New findings (polish, no regressions)
- [ ] **P10-7 — low/medium — Page 1 hero bulb, lg+ (1024-1920): too faint and hard-cropped at the bottom.**
  In `app/src/app/(public)/page.tsx` change the `BulbIllustration` classes: `lg:text-brand-100` becomes `lg:text-brand-200`; `lg:top-5` becomes `lg:top-5` unchanged (keep `lg:left-[calc(50%+21.5rem)]`, which keeps the clearance); `lg:h-[28rem]` becomes `lg:h-[30rem]`; `lg:[mask-image:linear-gradient(to_bottom,#000_30%,transparent_72%)]` becomes `lg:[mask-image:linear-gradient(to_bottom,#000_28%,transparent_62%)]` (the fade then ends at the hero bottom, no hard edge). Optionally also move `top` to 1.25rem. Strength stays below the headline (decor only, no text under it).
  Owner: `page1-builder`. Rule: frontend-design "one memorable element, quiet around it" (the bulb must register as intentional); ui-ux-pro-max §4 style consistency / §1 decoration never lowers text contrast (unchanged).
- [ ] **P10-8 — low — Page 1 hero, below lg (390 and 768): the bulb shows only as a cropped sliver (arc fragment + bolt tip) under the header edge, which reads like a rendering artefact.**
  Visible at the top-right of the hero at 390 and 768 (≈40-60px high). Fix (simplest): add `hidden lg:block` to the `BulbIllustration` in `page.tsx` and drop the `sm:`/base size/position classes; the desktop bulb remains the brand element and mobile stays clean ("scaled/repositioned on mobile" is satisfied by not showing a meaningless fragment). Alternative: keep it only if it can be shown whole, which the H1 width at 390 does not allow.
  Owner: `page1-builder`. Rule: frontend-design "cut any decoration that does not serve the brief"; brief B2 "never behind form fields", "keep it clean".
- [ ] **P10-9 — housekeeping (not a UI defect) — stale screenshots.** `app/e2e/screenshots/thankyou-luce-1440.png`, `thankyou-gas-*`, `thankyou-dual-1440/390`, `thankyou-business-*`, `thankyou-luce-*` still show the old busy decoration (from the round-1 commit); regenerate with the matrix screenshot spec in the final regression pass so the repo images match the shipped design.
  Owner: orchestrator / `qa-tester` (T10 regression).

### Checked again, no change
Loading (normal and reduced motion, 390/1440), results luce/gas/dual step 1+2 and modal, activation A/B incl. Partita IVA, privacy, footer on all public pages, copy rules (no call wording before thank-you, no "demo", no Facile.it elements, no invented numbers). No horizontal overflow anywhere. The selected activation card captured semi-transparent in one 390 screenshot is the known mid-colour-transition capture, not a bug.

### Verdict round 2
Ready, with two optional low-severity polish items for Page 1 (P10-7 tint/fade, P10-8 hide the mobile sliver). All six round-1 findings are verified fixed. If the orchestrator prefers not to spend another fix round, these can go to QUESTIONS.md for Giuseppe; neither blocks release. P10-9 is regression-pass housekeeping.

## Phase 12

Round 1 (T12.8), static review of existing screenshots and source; no new screenshots taken.

- [x] fixed (T12.7 design round) [medium] Activation step B, 390px, Documento — native file input renders English "Choose File / No file chosen" (screenshot) → hide the native input (`sr-only`, still focusable) and render a VERSUS secondary button "Scegli file" plus an Italian status line ("Nessun file selezionato"), with a visible `focus-within` ring on the wrapper; keep the `<label htmlFor>` (PaymentDocumentSections.tsx, DocumentFields).
- [x] fixed (T12.7 design round) [medium] Activation step B, 390px, Documento — file button has `py-2.5` (~40px) and the file input has no explicit focus-visible style → set `min-h-11` on the button and add the same focus ring used by Input/Button (PaymentDocumentSections.tsx line ~238).
- [ ] [medium] Activation step B, Documento — uploaded files cannot be removed or replaced; with the 2-file cap the user is stuck with a wrong upload → add a "Rimuovi" tertiary button (min 44px, `aria-label="Rimuovi <nome file>"`) per list item that drops it from `a.documents` (PaymentDocumentSections.tsx, list item).
- [x] fixed (T12.7 design round) [low] Activation step B, Pagamento — label "IBAN (facoltativo, se vuoi pagare con addebito sul conto)" repeats "facoltativo" already in the section title and wraps to two lines at 390px → shorten to "IBAN" with a hint line "Solo se vuoi pagare con addebito sul conto", same hint style as the POD helper (PaymentDocumentSections.tsx line 30).
- [x] fixed (T12.7 design round) [low] Activation step B, Documento — nothing tells the user the four data fields are all-or-nothing, and the upload heading "Oppure carica il documento" is a bare `<p>` → add one muted intro line under the section title ("Compila tutti i campi, oppure carica il file") and make the upload block a `<fieldset>` with a `<legend>` (PaymentDocumentSections.tsx lines 148, 206).
- [x] fixed (T12.7 design round) [low] Activation step B, 390px — the distributor warning ("Controlla il POD: ...") is amber text without an icon or `role="status"`, unlike the red field errors; it is also separated from its field by the Potenza select → place it directly under the POD hint and give it the same warning style as other notices, with `aria-live="polite"` (StepB.tsx, POD block).
- [x] [low] Admin lead detail, 390px — inline "Anteprima del documento" image shows a broken-image icon with alt text when the signed URL fails, with no error → add `onError` that hides the image and sets the existing `lead-document-error` message; add `max-w-full` (LeadDocuments.tsx).
- [x] [low] Admin lead detail, 390px — IBAN in the Pagamento card breaks mid-group ("0123 / 456") → render the IBAN with `break-words` and `tabular-nums`, or split into non-breaking groups of 4 (LeadDocuments.tsx parent / lead detail page IBAN field).

Checked and fine: thank-you (phone wording only there, as allowed; contrast OK; no overflow at 390px); no phone/call wording in step B; spinner uses `role="status"`, upload error uses `role="alert"`; section titles and field styles reuse the existing Input/Select/CheckboxField kit.
