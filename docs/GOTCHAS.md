# GOTCHAS

Known traps. Read the section relevant to your task before starting. Add new ones in one or two lines.

## Verification
- A green build (`tsc`, lint, build) is not proof the app works: on the CRM it passed three times while the UI was visibly broken (table overflow, server/client import leak, a count regression). Giuseppe's browser check at phase end is mandatory.
- Server/client boundary leaks show up only at runtime, not in the build: a client component importing a module that imports the DB client pulls server code into the browser bundle. Put `import 'server-only'` in every server file so this fails at build time.
- "Plan approved" is not "done": a fix confirmed in a plan was never applied and was only caught later. Check the commit diff, not the summary.
- Automated window resizing (browser MCP `resize_window`) silently does nothing in some setups. For responsive checks: open a fresh tab, resize, navigate, then read `window.innerWidth` to confirm — or check manually in DevTools.

## Tailwind / CSS
- If the project redefines `--spacing-*` tokens, Tailwind's default class-to-pixel mapping no longer holds (e.g. `h-8` may be 48px). Measure with `getBoundingClientRect()` or check the compiled CSS instead of assuming.
- `--spacing-*: initial` also unsets `--spacing-0`, silently breaking `inset-0`, `top-0`, `left-0`. Declare `--spacing-0: 0px` explicitly.
- Install shadcn/ui components manually (not via `init`) when the project already has a token block in `globals.css` — `init` overwrites it.

## Supabase / database
- Tests must never run against production. On the CRM, test writes landed in the production database and needed a rollback script.
- Tests never assert on rows they didn't create; clean fixtures in `finally`, not only on the happy path.
- Close the DB client in `after()` hooks (`db.$client.end()` or equivalent), otherwise the test runner hangs for minutes after the last test.
- Record dates of state changes in an audit log rather than adding a column per state.
- Superseded events: set status to `cancelled`, don't delete them.

## Tooling (macOS / Node)
- `sed -i` on macOS needs an empty argument: `sed -i '' 's/a/b/' file`.
- zsh: don't paste inline `#` comments together with commands.
- `tsx` runs scripts as CJS: top-level `await` needs an async wrapper.
- PDF generation: wkhtmltopdf doesn't support CSS Grid; use Playwright/Chromium.
- Prefer inline SVG over a charting library for one or two simple charts — no new dependency.

## Google Places API
- `locationRestriction` accepts rectangles only; circles go in `locationBias`.
- Hex-grid coverage: step = √3 × radius (e.g. 1385.64 m for an 800 m radius); a step equal to the radius gave 73% overlap.

## VERSUS — project-specific
- **`main` = Vercel Production Branch.** Every push or merge to `main` deploys production. Work on `dev`; only Giuseppe merges to `main`.
- **Shared database.** One Supabase project serves preview, production and the real-DB tests; there is no dev DB. Tests use `TEST-`/`E2E` names and clean up in `finally`; `npm run test:security` leaves 2 `TEST-SECURITY%` leads per run (Giuseppe cleans them).
- **Migrations are not applied by Claude Code.** Write the file in `app/supabase/migrations/` and add `## APPLY: <file>` to `QUESTIONS.md`; the reviewer applies it after Giuseppe's OK. Code must work on the old schema (or the mock layer) until then.
- **No service role key.** Leads only through secret-gated `SECURITY DEFINER` functions (server-only `LEAD_API_SECRET`). Never add `anon` grants on `leads`.
- **The app is in `app/`.** Run npm/npx/playwright from `app/`; env file is `app/.env.local`.
- **Resend.** The test sender `onboarding@resend.dev` only delivers to the Resend owner's address until the domain is verified and `RESEND_FROM` is set. `RESEND_API_KEY` is set for Production only, so "Invia email di prova" on previews returning "configurazione mancante (RESEND_API_KEY)" is expected.
- **Vercel request body ≈4.5 MB.** Client-side upload limit is 4 MB; larger bodies are rejected by Vercel before our route runs.
- **HEIC** decodes only in browsers that support it (Safari); Chromium tests can't cover it.
- **Parallel e2e share one mock repository.** Test rows use E2E/QA names and are removed in `finally`; never assert on rows you did not create. Long specs need `test.slow()` or longer expect timeouts; specs touching global settings must restore them and not run in parallel.
- **Cookies = technical only.** `/privacy` says so, so there is no consent banner. Any analytics (incl. Vercel Analytics), pixel or non-technical cookie needs a consent banner and an update of the `/privacy` "Cookie" section (SPEC decision #13).
- **IBAN 20% box is fixed copy** (activation step B, all offers incl. IBAN-required), valid only while the 20% IBAN discount applies to all offers (SPEC decision #15; supersedes #12).
- **Migration order (Phase 14).** Schema migrations `20261027100000` and `20261027110000` are additive and can be applied any time; data migration `20261027120000` deletes all offers and must be applied only together with the merge of `dev` into `main`.
- **pdf.js worker is served from the package, not a CDN, and loaded lazily.** No third-party script for bill reading; loading it eagerly slows every page.
- **vCard needs a raster PHOTO to show one.** Only SVG icons exist, so the "Salva il nostro numero" contact has no PHOTO until a PNG is added.
- **No Prettier config.** Never `prettier --write` existing files (reflows to 80 cols, buries the real diff; happened in T13.4, T13.8). Match formatting by hand.
- **UI copy rules:** Italian only; no "demo" wording; no phone/call-center/callback mention before the thank-you page; no Facile.it branding.
- **Local `npm run build` with the mock data source fails on `/admin`** (`MockAuthInProductionError`, guard by design). Verify builds with `NEXT_PUBLIC_DATA_SOURCE=supabase npm run build`. PGlite checks: `PGLITE_DIR=<dir with @electric-sql/pglite@0.5> node supabase/tests/run_local.mjs` (PGlite is not an app dependency).
- **Preview admin writes hit production data.** Until Phase 14 is merged, offers created on the preview that are variable, IBAN-required or audience-specific must stay `active = false` (the `main` code would show them wrongly); real-DB tests use inactive fixtures.
