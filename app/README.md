# VERSUS app

Next.js (App Router, TypeScript strict) + Tailwind, Supabase (or the in-memory mock data layer).
Deployment is documented in `DEPLOY.md` (nothing here deploys by itself).

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server (`NEXT_PUBLIC_DATA_SOURCE=mock` uses the mock repository). |
| `npm run typecheck` / `lint` / `test` | `tsc --noEmit`, ESLint, Vitest. |
| `npm run test:coverage` | Vitest with v8 coverage. |
| `npm run e2e` | Playwright specs (desktop 1440px + mobile 390px); the `e2e/matrix/` specs are ignored. |
| `PORT=<port> npm run e2e:matrix` | Phase 7 matrix (`playwright.matrix.config.ts`), two phases against the same server: everything not tagged `@serial` in parallel, then the `@serial` admin CRUD tests with one worker. Extra args are forwarded to both phases. Env: `MATRIX_WORKERS` (default 4), `MATRIX_OUTPUT` (Playwright output dir, default `./test-results/matrix`), `MATRIX_JSON` (JSON report path). The matrix cases are documented in `e2e/matrix/cases.ts`. |
| `npm run build` | `next build`, then automatically (`postbuild`) `npm run check:bundle`. Does not deploy; see `DEPLOY.md` (hosting: Vercel). |
| `npm run check:bundle` | Secret guard on the build output (`scripts/check-bundle-env.mjs`): fails if a secret-like `NEXT_PUBLIC_*` variable has a value or if the value of a server secret (`LEAD_API_SECRET`, `RESEND_API_KEY`, `CRON_SECRET`, mock admin credentials) appears anywhere in `.next/`. `--strict` (automatic on Vercel, `VERCEL=1`) also requires `NEXT_PUBLIC_DATA_SOURCE=supabase` and the public Supabase config. Run it after `npx next build` too. |

### Running e2e locally

Next 16 allows only one `next dev` per folder: when a server is already running, reuse it by setting
`PORT` to its port (Playwright reuses an existing server outside CI). When running several e2e runs in
parallel, pass a distinct `--output` per run (or `MATRIX_OUTPUT` for the matrix) so they do not
overwrite each other's results.

## Results page and loading

`/offerte` loads the active offers on the server on every request (`force-dynamic`, `getRepository()`),
so admin changes reach customers immediately. In mock mode admin and public pages share the same
server-side mock singleton.

The loading screen lasts 4000 ms by default; `NEXT_PUBLIC_LOADING_MS` overrides it and `?fast=1`
forces 250 ms. Browser storage keys: `sessionStorage` `versus.results.loaded.v1` (loading already
shown for the current results) and `versus.activation.step.v1` (current activation step).

## Notifications

The new-lead email to Aldo is sent through Resend via `fetch`. Without `RESEND_API_KEY`,
`RESEND_FROM` or a recipient it is log-only (the submit never fails).

Recipient order: (1) `notification_email` returned by the `complete_lead` RPC (the admin setting
`settings.notification_email`, supabase mode, QUESTIONS Q7); (2) the `NOTIFICATION_EMAIL` env var,
now only a **fallback** (used when the RPC returns null); (3) the admin settings in mock mode.

## Supabase keep-alive (Vercel Cron)

Free Supabase projects pause after 7 days without activity. `app/vercel.json` declares a daily Vercel
Cron Job (Hobby allows one run per day) that calls `GET /api/cron/keepalive`
(`src/app/api/cron/keepalive/route.ts` → `src/lib/keepalive.ts`). It does one public read with the
**publishable** key (`comuni?select=istat_code&limit=1`) and answers JSON `{ ok, status[, reason] }`
(200 when the read succeeded, 503 otherwise, `Cache-Control: no-store`). Protection: Vercel's
`CRON_SECRET` — when set, Vercel sends `Authorization: Bearer <CRON_SECRET>` and every other request
gets 401; when unset the route refuses everything in production and is open in local dev/tests
(`curl localhost:3000/api/cron/keepalive`). The admin proxy (`src/proxy.ts`, matcher `/admin*`) does
not touch it.

## Environment: server-only lead secret

`LEAD_API_SECRET` (server-only, never `NEXT_PUBLIC_*`, never sent to the browser) is passed as the first
argument of `create_lead` / `update_lead` / `complete_lead` by the server routes. It is 32 random bytes
(hex) and **must match the SHA-256 stored by migration `20261015140000_lead_secret_notification_placeholders.sql`**
in `private.app_secrets` (name `lead_api_secret`); otherwise the RPCs raise `invalid_secret`.
Rotation steps: see `supabase/README.md`.

## Customer flow state & lead API

Owner: `lead-api-builder` (TASKS T3.1). Code in `src/lib/lead/`, routes in `src/app/api/lead/`.

### Lead API (PRD §4, §5.1, §10)

All bodies are JSON (`Content-Type: application/json`, max 32 KB), every object is **strict**
(unknown keys → 422 `unknown_field`). Responses: `{ ok: true }` or
`{ ok: false, error: <code>, fields?: { <field>: <code> } }` (`src/lib/lead/api-types.ts`).

| Route | Body | Success | Notes |
|---|---|---|---|
| `POST /api/lead` | `{ data: { privacy_consent: true, ...Page 1 fields } }` | 201 (200 when it updates the lead already bound to the cookie) | Sets cookies; activation fields not accepted here |
| `PATCH /api/lead` | `{ data: { ...any lead field, step_reached?: "results" \| "offer_chosen" } }` | 200 | Needs the cookie; `step_reached` only moves forward (backward value silently dropped) |
| `POST /api/lead/complete` | `{ data: <full lead> }` | 200 | Server-side validation of all PRD §10 rules, then `step_reached = completed`, `status = new`, `notifyNewLead()`; **expires the cookies** |
| `DELETE /api/lead` | — | 200 | Expires the cookies ("new comparison") |

Never writable by the customer: `id`, `token`, `created_at`, `updated_at`, `status`, `notes`,
`step_reached = completed/page1`; `privacy_consent` only on create.

Errors: 400 `invalid_body` / `privacy_consent_required` · 401 `no_lead` (no cookie) ·
403 `forbidden_origin` · 404 `lead_not_found` (cookies expired) ·
413 `payload_too_large` · 422 `validation` + `fields` · 429 `rate_limited` (+ `Retry-After`) · 500 `server_error`.

Field codes: `required`, `invalid`, `unknown_field`, the shared validator codes
(`format`, `length`, `checksum`, `prefix`, `empty`, `surname_mismatch`, `name_mismatch`),
`not_available` (chosen offer not active for the customer type), `not_found` (comune).
Map them to Italian messages with the `*_MESSAGES` tables in `src/lib/logic/validators`.

Complete rules: names, phone, CF (format + check char + consistency with name/surname),
housing title, comune, CAP, address, civico, residente always required; Partita IVA → ragione
sociale + P.IVA (checksum); Luce → chosen offer, POD (not for Primo allaccio), `power_kw`
(one of 1.5/3/3.5/4/4.5/5/6/10/15, `null` = "Altro"), voltage 220/380, current supplier for
Cambio fornitore/Voltura; Gas → chosen offer, PDR (not for Primo allaccio; `has_gas = false`
forces gas to Primo allaccio), ≥1 gas use, current supplier for Cambio/Voltura. Fields hidden
in the flow are stored as `null`.

**Cookies**: `versus_lead` (secret token) and `versus_lead_step` (furthest step), both
`HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`, `Secure` in production. The token is never in a
response body and never readable by JS. After a successful complete both cookies are
expired: the thank-you page reads the summary from the flow state, not from the server.

**Anti-spam**: there is no captcha (decision v0.5.1: add one later only if spam appears). Lead
writes are protected by the same-origin check, strict validation, the per-IP rate limit below and
the server-only `LEAD_API_SECRET` required by the Supabase lead functions (direct RPC calls with
the publishable key are refused).

**Rate limit**: in-memory sliding window per IP and route: create 10 / complete 10 / update 60 /
delete 30 per 10 minutes (`/api/comuni`: 120 per minute; admin login and TOTP: 5 per 15 minutes per
IP + account). The client IP comes from `src/lib/client-ip.ts` and uses **only the headers set by
Vercel**: `x-real-ip`, else the first value of `x-forwarded-for` (Vercel overwrites it); any other
client-IP header is ignored because a client could spoof it. Per instance only — optionally add a
Vercel Firewall rate-limit rule on `/api/lead*` and `/admin/login` (see `DEPLOY.md`).

**Notification**: `notifyNewLead({ id, data, completedAt })` in `src/lib/lead/notify.ts` sends the new-lead email
(see the "Notifications" section above). A failing notification never fails the submit.

### Browser helpers (`src/lib/lead/client.ts`)

```ts
createLead(data: LeadCreateData): Promise<void>
updateLead(patch: LeadPatchData): Promise<void>
completeLead(data: LeadCompleteData): Promise<void>
clearLead(): Promise<void>
// failures throw LeadApiError { status, code, fields, retryAfterSec } ("network_error" = status 0)
```

### Flow state (`src/lib/lead/flow-state.ts` + `flow-context.tsx`)

`<FlowProvider>` is mounted in `src/app/(public)/layout.tsx`: put every customer page
(Page 1, loading, results, activation, thank-you) inside the `(public)` route group.

```tsx
"use client";
import { useFlow } from "@/lib/lead/flow-context";
const { state, hydrated, update, reset } = useFlow();
update({ commodity: "dual" });                       // shallow merge, persisted
update({ activation: { pod: "IT001E12345678" } });   // activation / chosenOffers merged 1 level
update({ chosenOffers: { luce: snapshotOffer(offer, annualKwh(state)!) } });
reset();                                             // new comparison (+ clearLead())
```

- `state` (`FlowState`): `commodity`, `customerType`, `firstName`, `lastName`, `phone`,
  `companyName`, `comune {istat,name,province,caps,climate_zone}`, `privacyConsent`,
  `serviceType`, `currentSupplierLuce/Gas`, `hasGas`, `people`, `appliances`, `gasUses`,
  `sqmRange`, `estimatedKwhYear/SmcYear`, `manualConsumption`, `manualKwhYear/SmcYear`,
  `finalKwhMonth/SmcMonth`, `chosenOffers {luce,gas}` (price snapshot incl. `monthly_cost`),
  `activation {taxCode, vatNumber, housingTitle, cap, address, streetNumber, isResident, pod,
  powerKw (default 3, null = Altro), voltage, pdr, gasUses (null = use Page 1 uses)}`,
  `leadCreated`, `leadCompleted`.
- Persisted in `sessionStorage["versus.flow.v1"]` (failures ignored); refresh keeps the data.
- `hydrated` is false during SSR/hydration; wait for it before redirecting on missing data.
- Selectors: `annualKwh`, `annualSmc` (manual entry if chosen, else estimate),
  `serviceTypeFor(state, "gas")`, `meterCodeRequired`, `totalMonthlyCost`, `snapshotOffer`.
- Payload mappers: `toLeadCreateData` (Page 1, valid fields only),
  `toLeadPatchData(state, step?)`, `toLeadCompleteData` (full lead, raw values so the server
  reports field errors). Shared business rules: `src/lib/lead/rules.ts`.

Typical sequence: Page 1 consent → `createLead(toLeadCreateData(state), token)` →
`update({ leadCreated: true })`; later Page 1 edits / loading screen →
`updateLead(toLeadPatchData(state, "results"))`; offer confirmed →
`updateLead(toLeadPatchData(state, "offer_chosen"))`; activation submit →
`completeLead(toLeadCompleteData(state), token)` → `update({ leadCompleted: true })` →
thank-you page (renders from `state`).

## Admin data access

All admin pages, server actions and `/admin` route handlers get their data from one
server-only entry point (`src/lib/data/admin.ts`, imports `server-only`):

```ts
import { getAdminRepository } from "@/lib/data/admin";
const repo = await getAdminRepository(); // async: checks the admin session first
```

- It calls `requireAdmin()` first (redirects when not an admin), so the mock repository
  (no RLS) is unreachable without a session.
- **mock mode**: returns the same process-wide singleton as `getRepository()` (kept on
  `globalThis`, survives Next dev module reloads). An admin edit (deactivate, featured, ...)
  is therefore visible on the public site served by the same server. State is lost on
  server restart. Unit tests can call `resetMockRepository()` (refused in production and
  outside mock mode).
- **supabase mode**: `createSupabaseRepository(await createSupabaseServerClient())`, a new
  repository per call bound to the admin's cookie session, so every query runs as the
  authenticated admin under RLS. Never cache it across requests.

Admin methods on `Repository` (`src/lib/data/repository.ts`): `queryLeads`, `getLead`,
`updateLeadAdmin`, `listAllSuppliers`, `getSupplier`, `createSupplier`, `updateSupplier`,
`uploadSupplierLogo`, `listAllOffers`, `getOffer`, `createOffer`, `updateOffer`,
`setOfferFlags`, `listUnverifiedActiveOffers`, `getSettings`, `updateSettings`.
Typed errors: `LeadNotFoundError`, `SupplierNotFoundError`, `OfferNotFoundError`,
`SupplierSlugTakenError`, `InvalidLogoError`.

Logos: `uploadSupplierLogo(supplierId, svg)` expects an already **sanitized** SVG (it
only rejects scripts/handlers/external refs as defence in depth) and returns a `logo_path`
(mock: `data:` URL; Supabase: object path `<supplier_id>/<ts>.svg` in the public
`supplier-logos` bucket). Store it with `updateSupplier(id, { logo_path })`. Public screens
turn any `logo_path` into an `<img src>` with `resolveLogoUrl(logo_path)` from `@/lib/data`.
The Storage bucket and its policies need a migration (not part of the current ones).
