# PHASE 10 BRIEF — Visual upgrade (approved by Giuseppe, 2026-10-15)

This brief is approved by Giuseppe. Where it conflicts with `PRD_VERSUS_v0.5.md` on **visual/layout matters only** (§6 Page 1 layout, §7 loading screen, §8 title, §10 option cards, §11 thank-you visuals, header/brand), this brief wins. Business logic, data, security, copy rules and flows of the PRD are unchanged. At the end the orchestrator records the visual changes in the PRD as v0.5.2 (Giuseppe asked for it).

Current screenshots (before): `app/e2e/screenshots/*-1440.png` and `*-390.png`.
Brand sources: `app/public/brand/versus_icona.svg`, `versus_logo_nero.svg` (originals in the read-only source folder `versus elementi/versus-logo-svg/`). Supplier logos: `logopack/black/*.svg` (black, already normalized) and `logopack/color/`.

## Mandatory: use the design skills
Two skills are available in `.claude/skills/` (copied there by the orchestrator in step 0 from `design-skills/`):
- `frontend-design` — read `.claude/skills/frontend-design/SKILL.md` before designing anything.
- `ui-ux-pro-max` — read `.claude/skills/ui-ux-pro-max/SKILL.md`, then query it, from the project root, e.g.:
  - `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "loading animation progress marquee" --domain ux`
  - `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "energy comparison landing trust" --domain landing`
  - `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<topic>" --domain gsap|style|color|typography|icons`
Every design agent must cite in its report which skill guidance it applied (2–5 bullet points). The design reviewer checks the result against both skills (ui-ux-pro-max priority table 1→10 + frontend-design principles).

## Global constraints (unchanged, binding)
- Clean style of the first demo (grey page bg, white cards, thin borders, 10px radius, Archivo wide headings + Inter) + VERSUS green. Keep it clean: decoration must never make the page busy.
- Mobile-first: everything must look right at 390px and 1440px. No horizontal scroll. No CLS.
- Accessibility: text contrast ≥ 4.5:1 (decorations must never sit under text in a way that lowers contrast), decorative SVGs `aria-hidden="true"` + `pointer-events: none`, `prefers-reduced-motion` respected everywhere, Lighthouse a11y stays ≥ 95 (target 100).
- Animate only `transform` / `opacity` (and SVG `stroke-dashoffset`). No new heavy animation libraries unless a skill recommendation clearly justifies it and the bundle impact is measured and reported (prefer CSS keyframes + small React state).
- Copy rules from CLAUDE.md still apply: Italian UI, no "demo", **no phone/call-center/callback wording before the thank-you page**, no Facile.it elements, no invented numbers or savings claims.
- The current supplier is never shown in the loading screen (PRD §7 rule kept). Placeholder suppliers (Tutela / Altro / Non lo so) are never shown as logos.
- All existing tests must stay green (update tests that assert old visuals; never weaken functional assertions).

## B1 — Brand lockup + header + footer (all screens) → `setup-builder`
- New logo lockup: **VERSUS icon only (black, no rounded black square, no background rect)** + wordmark **typeset with our fonts** (not SVG text paths). **Remove the black rectangle** with "COMPARATORE LUCE E GAS" inside.
- Giuseppe wants the word **COMPARATORE** to be big and the first thing people see. Lockup proposal (designer may refine with the skills): icon · "VERSUS" · and a strong "COMPARATORE luce e gas" line where COMPARATORE is visually dominant. Must work at 390px (compact variant).
- Header bars are "too plain/white": add colour. Options to evaluate with the skills (pick one, justify): thin green gradient strip on top of a white header; light green tinted header; deep green header with white lockup. Add something useful on the right of the header if the skills suggest it (e.g. a short trust line like "Confronto gratuito · 100% online" — no call wording, no numbers).
- Ask the skills whether extra sections are appropriate (see B3) and add a simple **site footer** on public pages (lockup, link to /privacy, © VERSUS). No fake legal data — if a legal field is needed, leave it out.
- Update `VersusLogo` / `SiteHeader` and their tests (the path-drift test must still verify the icon paths match the official SVG).
- Create a shared **decorative illustration set** in `components/brand/decor/` derived from the visual language of the logo icon (house outline, flame = gas, drop with lightning bolt = luce, swoosh): at least `BulbIllustration` (light bulb, VERSUS green, can contain the bolt), `FlameIllustration` (gas flame like the one in the logo), `BoltDropIllustration`. Line weights/shapes consistent with the logo. Pure SVG, aria-hidden, sizable, colour via props/CSS vars.
- Create a shared **option-icon set** in `components/ui/icons/` (same stroke style as the existing Page 1 icons in `components/page1/icons.tsx`; move/re-export those there) so other builders can use it (needed by B5).

## B2 — Page 1 → `page1-builder` (after B1)
- **Center the whole interface** at desktop: header content, hero and form column centered in the viewport (today everything is left-aligned in a wide container). Hero text centered.
- Add a **big green light bulb in the background** (from `decor/`), e.g. behind/beside the hero, partially cropped, low emphasis so text stays perfectly readable. Scaled/repositioned on mobile (never behind form fields).
- Hero headline keeps "COMPARATORE / LUCE E GAS" (coherent with the new lockup emphasis).
- Optional extra sections below the form, **only if the skills recommend them** for a comparison/lead-gen landing: e.g. "Come funziona" (3 steps: confronta → scegli → attiva online), a strip "Confrontiamo le offerte di" with real supplier logos (black/greyscale), a short FAQ with factual answers consistent with the PRD. They must not push the form below the fold on desktop, must not interfere with the flow or tests, and must follow the copy rules.

## B3 — Loading screen (full redesign) → `loading-builder`
Giuseppe does not like the current one. Wanted: much more clean, works better, more striking.
- Large **VERSUS icon in black only** (no black square with white logo) centered (~120–160px desktop, ~96px mobile).
- A **progress ring around the icon** (SVG circle, VERSUS green, `stroke-dashoffset`), synced with the existing total duration (~4 s) and the existing completion contract (don't break navigation/timing tests).
- **Big, well-visible text** under the icon (Archivo wide, ~28–40px desktop / ~22–26px mobile) with rotating messages; the **key words highlighted in VERSUS green** (e.g. "Stiamo confrontando le **offerte luce** per te", "Analizziamo i **migliori fornitori**", "Calcoliamo la tua **spesa mensile**" — adapt to luce / gas / luce+gas; no numbers you can't guarantee; no call wording).
- Underneath, a **banner (marquee) with all the supplier logos scrolling**: real suppliers only, **black SVG logos** (`logopack/black` → copy to `app/public/logos/black/` if needed), seamless infinite loop, soft fade at both edges, consistent logo height. The current supplier is excluded; placeholders excluded.
- `prefers-reduced-motion`: no marquee movement (static row), ring shows progress without spin, message changes without motion.
- Must look great at 390px.

## B4 — Results page → `results-builder`
- In the title "LE MIGLIORI OFFERTE LUCE **PER TE**" the words **"PER TE" in VERSUS green** (all variants: luce, gas, dual step 1/2).
- Apply the centered layout / new header consistently.

## B5 — Activation form → `activation-form-builder` (after B1 icon set)
- Add **icons to every option block (SelectCard)** in step A and step B (e.g. "Nell'alloggio in cui vivi sei…?": Proprietario, Inquilino, Usufruttuario, Altro; and every other option group in step B). Same stroke style as Page 1 icons, from `components/ui/icons/`. Icons are decorative (`aria-hidden`), labels stay text.

## B6 — Thank-you page → `thankyou-builder` (use model sonnet for this phase)
- The page is "perfect": do not change the card. Add **background decoration**: **light bulbs on the right side**, **gas flame(s) on the left side**, imitating the logo style (use `decor/` illustrations; may also use the bolt-drop and house outline). Subtle, never under the card text, scaled down/cropped on mobile.

## B7 — Design review loop → new agent `design-reviewer` (sonnet)
- After B1–B6: take screenshots of every public screen at 1440 + 390 (`npm run e2e` screenshot spec), review them against this brief and both skills, write findings in `DESIGN_REVIEW.md` under a new "## Phase 10" section with ids (P10-1, P10-2, …) and the owning agent. The orchestrator dispatches fixes; then a second review round. Max 2 fix rounds; anything left goes to QUESTIONS.md for Giuseppe.

## B8 — Regression → `qa-tester`
- typecheck, lint, Vitest, standard Playwright, full matrix (`npm run e2e:matrix`), copy checks, Lighthouse a11y on public pages, regenerated screenshots. Report numbers in PROGRESS.md.

## Git / deploy for this phase
- Work on branch `preview/phase10` (create it from local `main`). Commit after each task. Push **only** to `origin preview/phase10` (Vercel builds a Preview — that is fine and wanted). **Never push to `main`, never merge, never deploy to production.** Giuseppe will review the preview (with Claude in Chrome) and approve the merge himself.
