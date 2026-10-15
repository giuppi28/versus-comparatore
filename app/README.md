This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Customer flow state & lead API

Owner: `lead-api-builder` (TASKS T3.1). Code in `src/lib/lead/`, routes in `src/app/api/lead/`.

### Lead API (PRD §4, §5.1, §10)

All bodies are JSON (`Content-Type: application/json`, max 32 KB), every object is **strict**
(unknown keys → 422 `unknown_field`). Responses: `{ ok: true }` or
`{ ok: false, error: <code>, fields?: { <field>: <code> } }` (`src/lib/lead/api-types.ts`).

| Route | Body | Success | Notes |
|---|---|---|---|
| `POST /api/lead` | `{ data: { privacy_consent: true, ...Page 1 fields }, turnstileToken }` | 201 (200 when it updates the lead already bound to the cookie) | Sets cookies; activation fields not accepted here |
| `PATCH /api/lead` | `{ data: { ...any lead field, step_reached?: "results" \| "offer_chosen" } }` | 200 | Needs the cookie; `step_reached` only moves forward (backward value silently dropped) |
| `POST /api/lead/complete` | `{ data: <full lead>, turnstileToken }` | 200 | Server-side validation of all PRD §10 rules, then `step_reached = completed`, `status = new`, `notifyNewLead()`; **expires the cookies** |
| `DELETE /api/lead` | — | 200 | Expires the cookies ("new comparison") |

Never writable by the customer: `id`, `token`, `created_at`, `updated_at`, `status`, `notes`,
`step_reached = completed/page1`; `privacy_consent` only on create.

Errors: 400 `invalid_body` / `privacy_consent_required` · 401 `no_lead` (no cookie) ·
403 `turnstile_failed` / `forbidden_origin` · 404 `lead_not_found` (cookies expired) ·
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

**Turnstile** (create + complete): server secret `TURNSTILE_SECRET_KEY`; if unset outside
production the official always-pass test secret `1x0000000000000000000000000000000AA` is used
(Cloudflare test secrets are resolved offline). In production without a secret requests fail
closed. Client site key: `getTurnstileSiteKey()` (`src/lib/lead/turnstile-config.ts`) →
`NEXT_PUBLIC_TURNSTILE_SITE_KEY` or the test key `1x00000000000000000000AA`.
Validation errors are returned **before** Turnstile is checked, so a 422 does not burn the token;
after a 403 / success the widget must be reset for a new token.

**Rate limit**: in-memory sliding window per IP (`cf-connecting-ip` → `x-forwarded-for`) and
route: create 10 / complete 10 / update 60 / delete 30 per 10 minutes. Per instance only — add a
Cloudflare WAF rate-limiting rule on `/api/lead*` at deploy.

**Notification**: `notifyNewLead({ id, data, completedAt })` in `src/lib/lead/notify.ts` is a stub
(logs the id); `admin-settings-builder` implements the Resend email keeping the signature.
A failing notification never fails the submit.

### Browser helpers (`src/lib/lead/client.ts`)

```ts
createLead(data: LeadCreateData, turnstileToken: string): Promise<void>
updateLead(patch: LeadPatchData): Promise<void>
completeLead(data: LeadCompleteData, turnstileToken: string): Promise<void>
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
