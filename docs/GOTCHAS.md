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
- **Shared database.** One Supabase project (`felnnfisnobpgetgtxle`) serves preview, production and the real-DB test suites. There is no dev DB. Tests create their own rows with a `TEST-`/`E2E` prefix and clean them in `finally`; `npm run test:security` leaves 2 `TEST-SECURITY%` leads per run (Giuseppe cleans them).
- **Migrations are not applied by Claude Code.** Write the file in `app/supabase/migrations/` + `## APPLY: <file>` in `QUESTIONS.md`; the reviewer applies it after Giuseppe's OK. Until then code must work against the old schema (or the mock data layer).
- **No service role key.** Leads only through secret-gated `SECURITY DEFINER` functions with the server-only `LEAD_API_SECRET`. Never add `anon` grants on `leads`.
- **The app is in `app/`.** Run npm/npx/playwright from `app/`; env file is `app/.env.local`.
- **Resend test sender** `onboarding@resend.dev` delivers only to the Resend account owner's address. Other recipients fail until the domain is verified and `RESEND_FROM` is set.
- **`RESEND_API_KEY` is set for Production only** on Vercel: on previews "Invia email di prova" returns "configurazione mancante (RESEND_API_KEY)". Expected.
- **Vercel request body ≈4.5 MB.** Upload limit is therefore 4 MB client-side; a larger body is rejected by Vercel before our route runs.
- **HEIC** decodes only in browsers that support it (Safari); Chromium tests can't cover it.
- **Known flaky e2e** (green on re-run, under `fullyParallel`): `matrix/validation.spec.ts:246` (mobile), `admin-leads.spec.ts:213` (desktop), `acceptance-phase12` callback phone (mobile, global `settings` row shared by parallel projects), `page1.spec.ts:108` (concurrent admin-suppliers test leaves a logo supplier). Tests touching global settings must restore them and avoid running in parallel with each other.
- **Cookies = technical only.** `/privacy` states the site uses only technical cookies, so there is no consent banner. Adding analytics (incl. Vercel Analytics), pixels, embeds that set cookies or any non-technical cookie requires a consent banner first, plus an update of the `/privacy` "Cookie" section (SPEC decision #13).
- **IBAN 15% line is fixed copy** (activation step B), valid only while the 15% IBAN discount applies to all offers (SPEC decision #12).
- **UI copy rules:** Italian only; no "demo" wording; no phone/call-center/callback mention before the thank-you page; no Facile.it branding.
