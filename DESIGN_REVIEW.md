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
