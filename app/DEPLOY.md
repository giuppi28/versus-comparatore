# DEPLOY — VERSUS on Cloudflare Workers (OpenNext) + Supabase

Audience: Giuseppe. **Nothing in this repository deploys by itself.** The only commands that
publish anything are in section 8 and are run by you, by hand. Every command in the other sections
is local and read-only with respect to Cloudflare.

Stack: Next.js 16 (App Router, `proxy.ts`) built by `@opennextjs/cloudflare` into a Worker + static
assets. Data/Auth/Storage in Supabase (project `felnnfisnobpgetgtxle`, eu-central-1).

---

## 0. Decisions you must take before going live

| # | Decision | Why it matters |
|---|---|---|
| D1 | **Workers plan. DECIDED (Q10): start on Workers Free** (project constraint: zero cost). Monitor for error 1102 (CPU limit) in real use; if it appears, Giuseppe decides whether to move to Paid. Background: The Free plan allows only 10 ms CPU per request and a 3 MB (compressed) Worker. Our bundle is about 2.1 MB gzip (measured by gzipping the OpenNext output; the exact number is printed by the first `deploy`). Server-rendering Next.js pages and the admin area routinely exceeds 10 ms CPU, so expect `Exceeded CPU` errors (HTTP 1102) on Free. **Workers Paid (USD 5/month)** raises CPU to 30 s (configurable) and the size limit to 10 MB. | Paid is a paid resource: nobody creates it without you. Watch Worker → Observability/Logs for 1102 after launch. |
| D2 | **Open questions Q3–Q9** in `QUESTIONS.md` (section 9). Q6 (Turnstile bypass via direct RPC) and Q9 (privacy text) should be answered before real traffic. | Legal + abuse risk. |
| D3 | **Real offers.** `/admin/impostazioni` stays "Non pronto" while any active offer has `price_verified = false`. | Seed offers are placeholders. |

---

## 1. Prerequisites

- Node 24 LTS (the project was built with 24.13) and npm.
- A free Cloudflare account (https://dash.cloudflare.com/sign-up). If you want a custom domain, the
  domain's DNS must be on Cloudflare (adding a zone is free).
- The Supabase project (already created; owner: reviewer). You need dashboard access.
- A Resend account (free tier is enough) and a domain you can add DNS records to.
- This repo cloned, `cd app && npm ci`.

Never commit secrets. `app/.env*` (except `.env.example`), `.dev.vars`, `.open-next/` and `.wrangler/`
are gitignored.

---

## 2. Supabase (do this first)

1. **Apply migrations in order** (SQL editor, or the reviewer does it): the exact list and order
   is the `## APPLY:` entries in `QUESTIONS.md` and in `app/supabase/README.md`:
   1. `20261015120000_schema.sql`
   2. `20261015120100_rls_and_lead_functions.sql`
   3. `20261015121100_comuni_data_01.sql` … `20261015121900_comuni_data_09.sql` (9 files, in order)
   4. `20261015130000_storage_supplier_logos.sql`
   5. `app/supabase/seed.sql` (not a migration; idempotent)
   6. Verify: run `app/supabase/tests/data_checks.sql` (must end with `ALL DATA CHECKS PASSED`) and
      `app/supabase/tests/rls_test.sql` (must end with `ALL RLS TESTS PASSED`).
2. **Disable public sign-ups**: Authentication → Sign In / Providers → turn OFF "Allow new users to sign up".
3. **Create Aldo's account**: Authentication → Users → Add user → email + strong password,
   tick "Auto Confirm User". Copy his user UUID, then in the SQL editor:
   `insert into public.admins (user_id) values ('<auth.users.id>');`
   Repeat for any other admin (e.g. you).
4. **TOTP (2-step login)**: Authentication → Sign In / Providers → Multi-Factor → TOTP must be enabled
   (it is by default). The first admin login redirects to `/admin/login/mfa/attiva` to scan the QR
   code with an authenticator app. Once a factor is verified the RLS policies require `aal2`.
5. **Auth URLs**: Authentication → URL Configuration → Site URL = your final site URL
   (e.g. `https://versus.example`). Add the same URL (and the `workers.dev` URL if you test with it)
   under Redirect URLs. The app uses only email+password (no magic links / OAuth), so this is hygiene,
   but a wrong Site URL breaks any future email template.
6. **Keys**: Project Settings → API. You need the project URL and the **publishable** key
   (`sb_publishable_...`). **Never** put a `service_role` / secret key anywhere: the app does not
   use one and must not get one.
7. Free projects are paused after 7 days without activity: see section 7 (keep-alive).

---

## 3. Environment variables

Rule of thumb: **`NEXT_PUBLIC_*` = public and baked in at BUILD time** (Next inlines them in the
bundle; changing them in Cloudflare later has no effect, you must rebuild). **Everything else = server
runtime value, stored as a Cloudflare secret** (never in git, never in a file that is built).

| Variable | Public? | When | Where it goes | Value |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | build | `app/.env.production.local` | `https://felnnfisnobpgetgtxle.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | build | `app/.env.production.local` | `sb_publishable_...` (see `SUPABASE.md`) |
| `NEXT_PUBLIC_DATA_SOURCE` | public | build | `app/.env.production.local` | **`supabase`** (production builds with `mock` fail on purpose) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | public | build | `app/.env.production.local` | real site key (section 4) |
| `NEXT_PUBLIC_SITE_URL` | public | build | `app/.env.production.local` | final URL, no trailing slash (used for the lead link in the email) |
| `TURNSTILE_SECRET_KEY` | **secret** | runtime | Cloudflare secret | real secret key (section 4) |
| `RESEND_API_KEY` | **secret** | runtime | Cloudflare secret | `re_...` (section 5) |
| `RESEND_FROM` | server | runtime | Cloudflare secret | e.g. `VERSUS <notifiche@yourdomain.it>` (verified domain) |
| `LEAD_API_SECRET` | **secret** | runtime | Cloudflare secret | Shared secret the lead API sends to the Supabase lead functions (Q6; the database stores only its hash). **Server-only: a Cloudflare secret, never `NEXT_PUBLIC_*`, never in `.env.production.local`.** Generate a long random value (e.g. `openssl rand -hex 32`); the reviewer stores the matching hash in the DB. Added by the Q6 lead-function work: confirm the exact name in `app/.env.example` when that lands. |
| `NOTIFICATION_EMAIL` | server | runtime | Cloudflare secret | Aldo's address (required in supabase mode: `/admin/impostazioni` cannot be read by the lead API under RLS; see Q7) |
| `SUPABASE_PROJECT_REF` | server | not read by the app code today | optional | `felnnfisnobpgetgtxle` |
| `ADMIN_MOCK_EMAIL`, `ADMIN_MOCK_PASSWORD`, `ADMIN_MOCK_SESSION_SECRET` | **never** | local tests only | do not set | The mock admin login is refused when `NODE_ENV=production`. |
| `NEXT_PUBLIC_LOADING_MS` | n/a | tests | do not set | test knob for the loading screen |

### Why `.env.production.local` must contain only public values

OpenNext copies every variable Next loaded from the `.env*` files at build time into the Worker
bundle (`.open-next/cloudflare/next-env.mjs`). So a secret in `.env.production.local` or in your
dev `.env.local` would be uploaded inside the code. `npm run build:cf` therefore ends with a guard
(`cloudflare/check-bundle-env.mjs`) that **fails** if anything other than `NEXT_PUBLIC_*` was
embedded or if the data source is not `supabase`. To build cleanly:

```bash
cd app
# 1. public values only
cat > .env.production.local <<'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://felnnfisnobpgetgtxle.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
NEXT_PUBLIC_DATA_SOURCE=supabase
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAxxxx
NEXT_PUBLIC_SITE_URL=https://versus.example
EOF
# 2. your dev .env.local (mock mode, test secrets) would also be read: move it aside while building
mv .env.local .env.local.bak
npm run build:cf
mv .env.local.bak .env.local
```

(Or build from a fresh clone, or use Workers Builds, section 8b, where no `.env.local` exists.)

---

## 4. Cloudflare Turnstile (free)

1. Dashboard → Turnstile → Add widget. Name `VERSUS`, hostnames: your domain (and the
   `<worker>.<subdomain>.workers.dev` hostname if you test there). Mode: Managed.
2. Copy the **site key** → `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (build time).
3. Copy the **secret key** → Cloudflare secret `TURNSTILE_SECRET_KEY`.
4. The app treats Cloudflare's dummy keys (`1x0000...`) as "test keys": `/admin/impostazioni`
   shows "Chiavi Turnstile reali" as failed until real keys are present. Turnstile is verified server
   side on `POST /api/lead`, `POST /api/lead/complete` and the admin login; with no secret in
   production the lead API fails closed.

---

## 5. Resend (new-lead email to Aldo)

1. https://resend.com → Domains → Add domain (use a subdomain such as `mail.yourdomain.it`).
2. Add the DNS records Resend shows (SPF, DKIM, optionally DMARC) at your DNS provider; wait for
   "Verified".
3. API Keys → create a key with "Sending access" restricted to that domain → `RESEND_API_KEY`.
4. `RESEND_FROM` = `VERSUS <notifiche@mail.yourdomain.it>` (must be on the verified domain).
5. `NOTIFICATION_EMAIL` = Aldo's inbox (Q3: `giuppips@gmail.com` for now, change to Aldo's before go-live). Aldo can also set the address in
   `/admin/impostazioni`, but until Q7 is resolved the server only uses the env value.
6. The email is sent inside the request that completes the lead; a failure is logged and never
   blocks the customer.

---

## 6. Build and local preview (no deploy, no login)

```bash
cd app
npm ci
npm run typecheck && npm run lint && npm run test
npm run build:cf       # next build + OpenNext bundle + env guard -> .open-next/
npm run preview:cf     # build:cf, then `wrangler dev` (local workerd, localhost:8787)
```

- `build:cf` needs the section-3 setup (clean env). Expected output: ends with
  `OpenNext build complete.` and `check-bundle-env: OK`. Expected warning:
  *"Node.js middleware support is experimental in cloudflare"*: it refers to `src/proxy.ts`
  (Next 16 Node middleware). The `/admin` redirect to `/admin/login` was verified in local workerd;
  and the admin pages additionally call `requireAdmin()` in their layout, so the proxy is not the
  only gate. Re-check it once on the real deployment (go-live checklist).
- Local secrets for preview go in `app/.dev.vars` (gitignored), e.g. test Turnstile keys.
  They are only used by `wrangler dev`.
- `preview:cf` talks to the real Supabase configured in `.env.production.local`. Use the
  publishable key only.

---

## 7. Supabase keep-alive (prevents the 7-day pause)

Implemented but **disabled**. Code: `cloudflare/keepalive.ts` (one `GET
/rest/v1/comuni?select=istat_code&limit=1` with the publishable key, RLS-compliant, no secrets),
`cloudflare/worker.ts` (`scheduled()` handler that wraps the OpenNext worker), config commented in
`wrangler.jsonc`. Unit tests: `cloudflare/keepalive.test.ts`; verified in local workerd by calling
`/__scheduled` (the ping reached the fake REST endpoint, status 200).

To enable (only after the first successful deploy):

1. In `wrangler.jsonc` uncomment `"vars"` (fill the 3 public values) and `"triggers"`
   (daily at 04:17 UTC).
2. Rebuild and redeploy (section 8). The cron appears under Worker → Settings → Triggers.
3. Check: Worker → Logs shows `supabase-keepalive {"ok":true,"status":200}` after the first run
   (or trigger manually from the dashboard cron test).
4. If the project was already paused, restore it from the Supabase dashboard first.

Alternative with no Worker involvement: a free uptime monitor hitting
`https://<ref>.supabase.co/rest/v1/comuni?select=istat_code&limit=1` with header
`apikey: <publishable key>` once a day also counts as activity.

---

## 8. Deploy (manual, by Giuseppe only)

> Nobody else, and no automated agent, runs these commands. They create the Worker in your
> Cloudflare account.

### 8a. CLI

```bash
cd app
npx wrangler login                 # opens the browser, you authenticate
npm run build:cf                   # fresh build with the clean env (section 3)

# First deploy: creates the Worker "versus-comparatore" (free to create) and uploads the code.
# Free plan size limit is 3 MB gzip: the command prints "Total Upload ... gzip: ..." (see D1).
npx opennextjs-cloudflare deploy

# Then the secrets (each command prompts for the value; they are stored in Cloudflare, not in git):
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_FROM
npx wrangler secret put NOTIFICATION_EMAIL
npx wrangler secret put LEAD_API_SECRET
```

(There is intentionally no `deploy` script in `package.json`.)

The Worker is reachable at `https://versus-comparatore.<your-subdomain>.workers.dev` immediately.
To keep the site private until you decide, add `"workers_dev": false` and `"preview_urls": false`
to `wrangler.jsonc` before the first deploy and attach the custom domain from the dashboard.

### 8b. Alternative: Workers Builds (Git integration)

Dashboard → Workers & Pages → Create → Import a repository (`giuppi28/versus-comparatore`),
root directory `app`, build command `npm ci && npm run build:cf`, deploy command
`npx opennextjs-cloudflare deploy`. Put the five `NEXT_PUBLIC_*` values under "Build variables and
secrets" (they must exist at build time) and the five secrets (`TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `RESEND_FROM`, `NOTIFICATION_EMAIL`, `LEAD_API_SECRET`) under the Worker's "Variables and
Secrets". There is no `.env.local` on the build machine, so the env guard passes naturally.
Disable automatic builds on push if you want deploys to stay manual.

### Custom domain

Worker → Settings → Domains & Routes → Add → Custom domain → `versus.yourdomain.it` (the zone must
be on your Cloudflare account; DNS and certificate are created automatically, free). Then set
`NEXT_PUBLIC_SITE_URL`, Turnstile hostnames and Supabase Site URL to that domain and **rebuild**
(the site URL is build-time).

### WAF rate-limiting (the real protection; do this before go-live)

The in-memory limiters (`src/lib/lead/rate-limit.ts`, `src/lib/auth/rate-limit.ts`,
`/api/comuni`) live inside one Worker isolate: Cloudflare runs many isolates, restarts them, and
they share nothing, so they only stop trivial bursts. They are a second line, not the defense.

Cloudflare dashboard → your domain → Security → WAF → Rate limiting rules. Plans differ and change
over time (the Free plan currently gives **1 rule**, counting per IP over a fixed 10 s window with a
10 s block). Confirm the limits in the dashboard.

Proposed rules, in priority order (create 1 on Free, add the others if you upgrade):

1. **Write endpoints** (the one rule to create on Free):
   - Expression: `(http.request.method eq "POST" and (starts_with(http.request.uri.path, "/api/lead") or http.request.uri.path eq "/admin/login"))`
   - Characteristic: IP. Threshold 15 requests / 10 s. Action: Block (10 s).
   - A real customer makes ~4 requests in the whole flow (create, 1–2 patches, complete); a login
     is 1–2. This stops bursts against Turnstile verification, Resend and the login. Slow
     brute force on the login is additionally stopped by the in-app limiter, Turnstile on the login
     form, Supabase Auth's own rate limits and TOTP.
2. **Comuni autocomplete**: `(http.request.uri.path eq "/api/comuni")`, IP, 60 requests / 10 s,
   Block. The autocomplete is debounced, so a person stays well below.
3. **Login page** if not covered by 1 on a paid plan: `(http.request.uri.path eq "/admin/login")`,
   IP, 5 requests / 60 s (paid plans allow longer windows).

Also enable (free): Security → Bots → Bot Fight Mode; SSL/TLS mode Full (strict); Always Use HTTPS.

---

## 9. Open questions that affect go-live (`QUESTIONS.md`)

| Q | Topic | Impact | Needed before go-live? |
|---|---|---|---|
| Q3 | Aldo's notification email | `NOTIFICATION_EMAIL` | Yes |
| Q4 | "Tariffa monoraria" on gas offers | copy of seed offers | Before real offers |
| Q5 | Climate-zone data licence (Openpolis CC BY-NC vs commercial site) and 21 comuni without zone | legal/data | Yes (decide) |
| Q6 | `create_lead` callable directly with the publishable key (bypasses Turnstile + app rate limit) | spam leads in DB | Strongly recommended (shared-secret fix by reviewer); WAF rule only covers the app routes, not `supabase.co` |
| Q7 | Notification recipient in Supabase mode (env fallback today) | Aldo's address change in the admin has no effect on the email | Acceptable with the env fallback |
| Q8 | Placeholder suppliers visible in admin selects (`is_placeholder` migration) | admin UX | No |
| Q9 | Privacy notice text (`/privacy` placeholders) | **legal: required** | Yes |

---

## 10. Go-live checklist

Tick in order. Everything is on the production URL.

- [ ] Section 2 done (migrations + seed + both SQL tests green, TOTP on).

**Manual items (also listed in `/admin/impostazioni` under "Verifiche manuali").** The app cannot
detect these with the publishable key (no service role, and no DB column to persist an
acknowledgement), so the admin page shows them as informational "Da verificare manualmente" items.
They do **not** feed the automatic "Pronto per la pubblicazione" status: that status covers the
automatic checks only, so tick these here yourself before going live.

- [ ] **Public sign-up disabled in Supabase Auth**: dashboard → Authentication → Sign In / Providers →
      "Allow new users to sign up" OFF. (Cannot be switched off through the reviewer's connector.
      Non-admin users would only get anon-level access, but disable it anyway: PRD §4.1.)
- [ ] **Aldo's admin account created and inserted in `public.admins`** (needs his email, Q3).
      Authentication → Users → Add user (email + strong password, "Auto Confirm User"), then in the
      SQL editor:
      ```sql
      insert into public.admins (user_id)
      select id from auth.users where email = '<email di Aldo>';
      ```
      Check that it inserted one row (`select count(*) from public.admins;`).
- [x] **Temporary function `public.bootstrap_load_comuni` removed**: done by the reviewer on 2026-10-15
      (privileges revoked, moved to schema `private` and renamed `old_*_disabled`; not reachable through
      the API). Shown as done in `/admin/impostazioni`.
- [ ] **Notification email: change `settings.notification_email` to Aldo's address before go-live.**
      In the real DB it is currently `giuppips@gmail.com` (Q3, answered: Aldo's address comes later).
      Change it in `/admin/impostazioni` and set the `NOTIFICATION_EMAIL` secret to the same value.
      Aldo's admin account (item above) is still to be created, once we have his email.
- [ ] **Privacy notice (Q9, deferred to go-live; go-live blocker).** Replace the six placeholders in the
      `/privacy` page with the data controller's details (ask Aldo): `[Ragione sociale del titolare]`,
      `[Indirizzo completo del titolare]`, `[Partita IVA del titolare]`,
      `[Indirizzo email di contatto privacy]`, `[Periodo di conservazione dei dati]`,
      `[Data di aggiornamento]`. Shown as a manual item in `/admin/impostazioni`. Verify: open
      `/privacy` and make sure no square-bracket text remains.

- [ ] Real offers entered/verified in `/admin/offerte` (all active offers `price_verified = true`).
- [ ] Section 3 variables: build with the five `NEXT_PUBLIC_*`, five secrets set (including `LEAD_API_SECRET`).
- [ ] `/admin/login` works with Aldo's account + TOTP; `/admin` while logged out redirects to the login.
- [ ] `/admin/impostazioni` shows **"Pronto per la pubblicazione"** (every check green: offers verified,
      notification email, `NOTIFICATION_EMAIL`, Resend key and sender, real Turnstile keys, site URL,
      data on Supabase).
- [ ] Complete one real test lead end to end (use your own data): it appears in `/admin/leads`, the
      email arrives, the thank-you page shows. Delete/mark the test lead afterwards.
- [ ] Check mobile (390 px) and desktop; no "demo" wording anywhere.
- [ ] `/privacy` has the final text (Q9, see the privacy item above). WAF rule(s) active (section 8). Keep-alive enabled (section 7).
- [ ] Cookie/CSP sanity: the lead cookies are `HttpOnly; Secure` (they are, in production).
- [ ] Supabase Security Advisors (dashboard → Advisors): only the expected warnings (SECURITY DEFINER
      lead functions, `is_admin()`).
- [ ] Custom domain attached, `workers.dev` URL disabled (`"workers_dev": false`) if desired.

---

## 11. Rollback

- **Code**: Cloudflare dashboard → Worker → Deployments → pick the previous version → Rollback
  (or `npx wrangler rollback`). Secrets are not part of a version, so they stay.
- **Take the site offline fast**: Worker → Settings → Domains & Routes → remove the custom domain
  (the public site disappears, data is untouched).
- **Build-time variables** (`NEXT_PUBLIC_*`) are in the code version: rolling back restores the old ones.
- **Database**: migrations are forward-only. Take an export (Supabase → Database → Backups on paid
  plans; on Free export tables from the SQL editor/CSV) before applying new migrations. To undo a
  bad migration write a new corrective migration and ask the reviewer to apply it.
- **Leaked secret**: rotate it at the provider (Turnstile secret, Resend key), then
  `npx wrangler secret put <NAME>` with the new value. The publishable key is public by design;
  nothing breaks if it is seen.

---

## 12. Compatibility notes (audit of the code against Workers)

- Build: `npm run build` (Next 16.4.1, Turbopack) and `npm run build:cf` pass. Output sizes: `.open-next`
  35 MB on disk (cache assets included); gzip of the server function 1.54 MB, middleware 0.53 MB,
  worker entry < 1 KB, static assets 1.3 MB (served from the assets binding, not counted in the Worker size).
- Flags: `nodejs_compat` + `global_fetch_strictly_public`, `compatibility_date` 2026-10-01 (bump it
  deliberately, test with `preview:cf`).
- Cache: read-only static-assets incremental cache (`open-next.config.ts`): no R2/KV/D1/Durable
  Object resources are created. The app uses no ISR; `revalidatePath` in admin actions is harmless
  (admin pages are dynamic). Introducing ISR / `unstable_cache` later requires the R2 or KV cache.
- Images: `next/image` is used only for local SVGs (served as-is); no Images binding needed.
- Node APIs: only Web Crypto (`crypto.subtle`, `crypto.randomUUID`) and `Buffer` (mock repository
  only, unreachable in production); `node:fs`/`node:path` appear only in tests. `server-only` is a
  build-time marker and works. `@supabase/ssr` and `@supabase/supabase-js` use `fetch` (verified in
  workerd: REST reads work). `zod` is pure JS. `@xmldom/xmldom` (SVG sanitizer, admin logo upload)
  is pure JS and bundles fine; its runtime behaviour in workerd was not exercised (it needs a
  logged-in admin): include "upload a supplier logo" in the first production smoke test.
- Resend and Turnstile use `fetch`. The Resend call is awaited inside the request (no `waitUntil`).
- Secrets/env: at runtime OpenNext copies Worker bindings (secrets, vars) into `process.env` at
  the start of each request; all server code reads `process.env` inside functions (none at module
  top level), so this works. `NEXT_PUBLIC_*` are inlined at build.
- Client IP: the limiters use `cf-connecting-ip` first, which Cloudflare sets and clients cannot spoof.
- `proxy.ts` is a Node.js-runtime middleware: OpenNext marks this as experimental (see section 6).
- `npm audit` reports advisories only in dev-time tooling pulled by the adapter/ESLint
  (`glob`, `braces` CLI); none is in the deployed Worker.
