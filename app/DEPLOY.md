# DEPLOY — VERSUS on Vercel + Supabase

Audience: Giuseppe. **Nothing in this repository deploys by itself.** Creating the Vercel project,
adding environment variables and the domain, and every deployment are done by you, by hand, in the
Vercel dashboard (section 7). No automated agent deploys, publishes or goes live.

Stack: Next.js 16 (App Router, `src/proxy.ts`) on **Vercel (Hobby plan) with a custom domain**.
Data/Auth/Storage in Supabase (project `felnnfisnobpgetgtxle`, eu-central-1). New-lead email via
Resend. No CDN/proxy in front of Vercel and no captcha (see D2).

---

## 0. Decisions already taken / to keep in mind

| # | Decision | Why it matters |
|---|---|---|
| D1 | **Hosting: Vercel Hobby (free) + custom domain** (v0.5.1). Vercel's Hobby plan is meant for **personal, non-commercial** use. A comparison site that generates leads for a broker is commercial use, so the **Pro plan (paid) may be needed later**. Moving to Pro is a paid resource: only Giuseppe decides it. | Fair-use terms; nothing in the code changes between Hobby and Pro. |
| D2 | **No anti-spam widget for now.** Protection = server-side per-IP rate limiting + strict validation + same-origin check + the server-only, hashed `LEAD_API_SECRET` required by the Supabase lead functions. A captcha may be added later **only if spam appears**. | Optional extra: a Vercel Firewall rate-limit rule (section 8). |
| D3 | **Real offers.** `/admin/impostazioni` stays "Non pronto" while any active offer has `price_verified = false`. | Seed offers are placeholders. |
| D4 | **Function region `fra1` (Frankfurt)**, set in `app/vercel.json` (`"regions"`), next to the Supabase project (eu-central-1). Hobby allows one region. | Every page/API call talks to Supabase: a US region would add a transatlantic round trip per query. |

---

## 1. Prerequisites

- A Vercel account (Hobby) connected to the GitHub account that owns
  `giuppi28/versus-comparatore`.
- The custom domain, with access to its DNS at the registrar.
- The Supabase project (already created; owner: reviewer). Dashboard access.
- A Resend account (free tier is enough) and a domain/subdomain you can add DNS records to.
- Locally (only to run the checks): Node 24 LTS and npm, `cd app && npm ci`.

Never commit secrets. `app/.env*` (except `.env.example`) and `.vercel/` are gitignored.

---

## 2. Supabase (do this first)

1. **Migrations**: applied by the reviewer, in the order of the `## APPLY:` entries in
   `QUESTIONS.md` / `app/supabase/README.md`, then `app/supabase/seed.sql`. Verify with
   `app/supabase/tests/data_checks.sql` (`ALL DATA CHECKS PASSED`) and
   `app/supabase/tests/rls_test.sql` (`ALL RLS TESTS PASSED`).
2. **Disable public sign-ups**: Authentication → Sign In / Providers → turn OFF "Allow new users to sign up".
3. **Create Aldo's account**: Authentication → Users → Add user → email + strong password,
   tick "Auto Confirm User". Then in the SQL editor:
   `insert into public.admins (user_id) select id from auth.users where email = '<email di Aldo>';`
4. **TOTP (2-step login)**: Authentication → Sign In / Providers → Multi-Factor → TOTP enabled
   (default). The first admin login redirects to `/admin/login/mfa/attiva` to scan the QR code.
5. **Auth URLs (custom domain)**: Authentication → URL Configuration:
   - **Site URL** = `https://<your-domain>` (e.g. `https://versus.example`, no trailing slash).
   - **Redirect URLs**: add `https://<your-domain>/**` (and `https://www.<your-domain>/**` if you
     serve `www`). If you want to log into the admin on Preview deployments, also add
     `https://*-<your-vercel-scope>.vercel.app/**`.
   The app uses only email+password (no magic links / OAuth), so this is hygiene, but a wrong Site
   URL breaks any future email template.
6. **Keys**: Project Settings → API: project URL and the **publishable** key (`sb_publishable_...`).
   **Never** put a `service_role` / secret key anywhere: the app does not use one.
7. Free projects are paused after 7 days without activity: the daily Vercel Cron keep-alive
   (section 6) prevents it.

---

## 3. Environment variables (Vercel → Project → Settings → Environment Variables)

Rules:
- **`NEXT_PUBLIC_*` are public and inlined at BUILD time.** After changing one you must
  **redeploy** for it to take effect.
- **Everything else is server-only**, read at runtime by the server code. Mark secrets as
  **Sensitive** (their value cannot be read back from the dashboard).
- Set each variable for **Production** and **Preview** (Development is not needed: local dev uses
  `app/.env.local`). For Preview you may prefer your own address in `NOTIFICATION_EMAIL`.
- Never prefix a secret with `NEXT_PUBLIC_` (it would reach the browser; the build guard fails).

| Variable | Kind | Production + Preview value |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public, build time | `https://felnnfisnobpgetgtxle.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public, build time | `sb_publishable_...` (see `SUPABASE.md`) |
| `NEXT_PUBLIC_DATA_SOURCE` | public, build time | **`supabase`** (a Vercel build with anything else fails on purpose) |
| `NEXT_PUBLIC_SITE_URL` | public, build time | `https://<your-domain>` (no trailing slash; lead link in the email) |
| `LEAD_API_SECRET` | **Sensitive, server-only** | 32 random bytes hex. Passed as `p_secret` to `create_lead` / `update_lead` / `complete_lead`. **Must match the SHA-256 stored in the DB** (`private.app_secrets`, name `lead_api_secret`), otherwise every lead write fails with `server_error`. Use the same value as in your local `app/.env.local`, or rotate (see `app/supabase/README.md`). |
| `RESEND_API_KEY` | **Sensitive, server-only** | `re_...` (section 4) |
| `RESEND_FROM` | server-only | e.g. `VERSUS <notifiche@mail.yourdomain.it>` (verified domain) |
| `NOTIFICATION_EMAIL` | server-only | **Fallback** recipient of the new-lead email (the primary one is the admin setting returned by `complete_lead`). Aldo's address in Production. |
| `CRON_SECRET` | **Sensitive, server-only** | Random string (`openssl rand -hex 32`). Vercel sends it as `Authorization: Bearer <CRON_SECRET>` to the cron route (section 6). Without it the cron route answers 401 in production. |
| `SUPABASE_PROJECT_REF` | server-only, optional | `felnnfisnobpgetgtxle` (not read by the app code today) |
| `ADMIN_MOCK_EMAIL`, `ADMIN_MOCK_PASSWORD`, `ADMIN_MOCK_SESSION_SECRET` | **never on Vercel** | Local tests only; the mock admin login is refused when `NODE_ENV=production`. |
| `NEXT_PUBLIC_LOADING_MS` | **never on Vercel** | Test knob for the loading screen. |

### Build secret guard

`npm run build` runs `next build` and then (`postbuild`) `npm run check:bundle`
(`scripts/check-bundle-env.mjs`). On Vercel it runs in strict mode automatically (`VERCEL=1`) and
**fails the deployment** when:
- a `NEXT_PUBLIC_*` variable that looks like a secret (`…SECRET`, `…PASSWORD`, `…PRIVATE`,
  `…SERVICE_ROLE`, `…API_KEY`) has a value;
- the value of `LEAD_API_SECRET`, `RESEND_API_KEY`, `CRON_SECRET` (or the mock admin credentials)
  appears anywhere in the build output `.next/` (client bundles, prerendered pages, server chunks);
- `NEXT_PUBLIC_DATA_SOURCE` is not `supabase` or the public Supabase URL/key is missing.
It prints variable names and file paths only, never values. Locally:
`npx next build && npm run check:bundle` (add `-- --strict` to also check the Supabase config).

---

## 4. Resend (new-lead email to Aldo)

1. https://resend.com → Domains → Add domain (use a subdomain such as `mail.yourdomain.it`).
2. Add the DNS records Resend shows (SPF, DKIM, optionally DMARC) at your registrar; wait for "Verified".
3. API Keys → create a key with "Sending access" restricted to that domain → `RESEND_API_KEY`.
4. `RESEND_FROM` = `VERSUS <notifiche@mail.yourdomain.it>` (must be on the verified domain).
5. Recipient: the address saved in `/admin/impostazioni` (returned by `complete_lead`), with
   `NOTIFICATION_EMAIL` as fallback. Today it is `giuppips@gmail.com` (Q3): change both to Aldo's
   address before go-live.
6. The email is sent inside the request that completes the lead; a failure is logged and never
   blocks the customer.

---

## 5. Local checks before the first deploy (no deploy, no login)

```bash
cd app
npm ci
npm run typecheck && npm run lint && npm run test
npx next build && npm run check:bundle      # or: npm run build (runs the guard automatically)
```

`npm run start` serves the production build locally (`http://localhost:3000`) with the values in
`app/.env.local`.

---

## 6. Supabase keep-alive (Vercel Cron, prevents the 7-day pause)

- `app/vercel.json` declares one cron job: `GET /api/cron/keepalive`, schedule `17 4 * * *`
  (UTC, once a day: the Hobby maximum; Vercel may run Hobby crons at any time within that hour).
- The route (`src/app/api/cron/keepalive/route.ts` → `src/lib/keepalive.ts`) does one public,
  RLS-compliant read with the **publishable** key: `comuni?select=istat_code&limit=1`. No database
  secret is involved. It answers JSON `{ "ok": true, "status": 200 }` (HTTP 200), or
  `{ "ok": false, "status": <supabase status>, "reason": "..." }` (HTTP 503) when the read fails.
- Protection: set `CRON_SECRET` (section 3). Vercel then adds `Authorization: Bearer <CRON_SECRET>`
  to every cron call; any other request gets **401** `{ "ok": false, "status": 0, "reason": "unauthorized" }`.
  If `CRON_SECRET` is missing, the route refuses everything in production (fail closed), so the
  keep-alive silently does nothing: check the logs after the first run.
- Crons run only on the **Production** deployment. Check: Project → Settings → Cron Jobs (the job is
  listed, with "Run" to trigger it manually) and Project → Logs filtered on `/api/cron/keepalive`:
  a successful run logs `supabase-keepalive {"ok":true,"status":200}`.
- If the Supabase project is already paused, restore it from the Supabase dashboard first.

---

## 7. Vercel project and deploy (manual, by Giuseppe only)

> Nobody else, and no automated agent, does these steps. There is intentionally no `deploy`
> script in `package.json`.

1. Vercel dashboard → Add New… → Project → import `giuppi28/versus-comparatore`.
2. **Root Directory: `app`** (the Next.js app lives there; `app/vercel.json` is read from it).
   Framework Preset: **Next.js** (auto-detected). Install / Build commands: defaults
   (`npm install`, `npm run build`; the build runs the secret guard). Output: default.
3. Settings → Build and Deployment → Node.js Version: **24.x**.
4. Add the environment variables of section 3 **before** the first deploy (the strict guard fails
   a build without `NEXT_PUBLIC_DATA_SOURCE=supabase`).
5. Deploy. Every push to `main` then creates a Production deployment and every other branch a
   Preview deployment. If you want deploys to stay manual, disable automatic deployments in
   Settings → Git (or use "Ignored Build Step").
6. Preview deployments are protected by Vercel Authentication by default (Settings → Deployment
   Protection): keep it on.

### Custom domain

1. Project → Settings → Domains → Add → `<your-domain>` (and `www.<your-domain>` if wanted; Vercel
   proposes the redirect between the two).
2. At your registrar create **exactly the DNS records Vercel shows** for that domain (typically an
   `A` record for the apex and a `CNAME` for `www` / subdomains). Alternatively switch the domain's
   nameservers to Vercel.
3. Wait until the domain shows "Valid Configuration". **HTTPS is automatic** (certificate issued and
   renewed by Vercel).
4. Set `NEXT_PUBLIC_SITE_URL` to `https://<your-domain>` and **redeploy** (build-time value), and
   update the Supabase Site URL / Redirect URLs (section 2.5).

---

## 8. Rate limiting and Vercel Firewall (optional extra)

The in-app limiters are in memory, per Vercel Function instance: create 10 / complete 10 /
update 60 / delete 30 per 10 minutes per IP on `/api/lead*`, 120 per minute on `/api/comuni`, and
5 attempts per 15 minutes per IP + account on the admin login and TOTP. Instances share nothing, so
they stop bursts, not a distributed attack. Supabase Auth adds its own limits on the login, and the
admin needs TOTP.

Client IP: only the headers set by Vercel are trusted: `x-real-ip`, else the first value of
`x-forwarded-for` (Vercel overwrites it, so a client cannot inject a fake hop). Any other client-IP
header is ignored (spoofable without a CDN that sets it).

Optional, recommended if abuse appears: Project → Firewall → Configure → New rule → **Rate limit**:
- If: Request Path starts with `/api/lead` **or** Request Path equals `/admin/login`, Method `POST`.
- Key: IP. Example threshold: 15 requests / 60 s. Action: Deny (429).
Plan limits on the number of rules and windows vary by plan and change over time: check them in the
dashboard. Leave Vercel's default DDoS mitigation on.

---

## 9. Open questions that affect go-live (`QUESTIONS.md`)

| Q | Topic | Impact | Needed before go-live? |
|---|---|---|---|
| Q3 | Aldo's notification email | admin setting + `NOTIFICATION_EMAIL` | Yes |
| Q4 | "Tariffa monoraria" on gas offers | copy of seed offers | Before real offers |
| Q5 | Climate-zone data licence (Openpolis CC BY-NC vs commercial site) and comuni without zone | legal/data | Yes (decide) |
| Q9 | Privacy notice text (`/privacy` placeholders) | **legal: required** | Yes |

Resolved and relevant here: Q6 (direct RPC calls blocked by the hashed `LEAD_API_SECRET`), Q7
(`complete_lead` returns the recipient; env fallback).

---

## 10. Go-live checklist

Tick in order. Everything is on the production URL.

- [ ] Section 2 done (migrations + seed + both SQL tests green, TOTP on, Auth Site URL / Redirect URLs
      on the custom domain).

**Manual items (also listed in `/admin/impostazioni` under "Verifiche manuali").** The app cannot
detect these with the publishable key, so the admin page shows them as informational items; they do
**not** feed the automatic "Pronto per la pubblicazione" status. Tick them here yourself.

- [ ] **Public sign-up disabled in Supabase Auth**: Authentication → Sign In / Providers →
      "Allow new users to sign up" OFF (PRD §4.1).
- [ ] **Aldo's admin account created and inserted in `public.admins`** (needs his email, Q3):
      ```sql
      insert into public.admins (user_id)
      select id from auth.users where email = '<email di Aldo>';
      ```
      Check: `select count(*) from public.admins;`.
- [x] **Temporary function `public.bootstrap_load_comuni` removed**: done by the reviewer on 2026-10-15.
- [ ] **Notification email**: change `settings.notification_email` (in `/admin/impostazioni`) and the
      `NOTIFICATION_EMAIL` variable to Aldo's address (today `giuppips@gmail.com`, Q3).
- [ ] **Privacy notice (Q9, go-live blocker).** Replace the six placeholders in `/privacy`:
      `[Ragione sociale del titolare]`, `[Indirizzo completo del titolare]`,
      `[Partita IVA del titolare]`, `[Indirizzo email di contatto privacy]`,
      `[Periodo di conservazione dei dati]`, `[Data di aggiornamento]`. Verify that no
      square-bracket text remains.

- [ ] Real offers entered/verified in `/admin/offerte` (all active offers `price_verified = true`).
- [ ] Section 3 variables set for Production (and Preview): the four `NEXT_PUBLIC_*`,
      `LEAD_API_SECRET` (matches the DB hash), `RESEND_API_KEY`, `RESEND_FROM`, `NOTIFICATION_EMAIL`,
      `CRON_SECRET`. The build log shows `check-bundle-env: OK (…, data source = supabase)`.
- [ ] Resend domain verified, key and sender set; a test lead's email arrives.
- [ ] `/admin/login` works with Aldo's account + TOTP; `/admin` while logged out redirects to the login.
- [ ] `/admin/impostazioni` shows **"Pronto per la pubblicazione"** (offers verified, notification
      email, `NOTIFICATION_EMAIL`, Resend key and sender, site URL, data on Supabase).
- [ ] Complete one real test lead end to end (your own data): it appears in `/admin/leads`, the email
      arrives, the thank-you page shows. Have it deleted afterwards (reviewer, SQL editor).
- [ ] **Delete the `TEST-SECURITY` leads** (first/last name `TEST-SECURITY`) left in the real DB by
      the security suite (`npm run test:security`): ask the reviewer (the admin area has no delete).
- [ ] Custom domain "Valid Configuration", HTTPS on, `NEXT_PUBLIC_SITE_URL` = the domain (redeployed).
- [ ] Cron job listed in Settings → Cron Jobs; the first run logged `supabase-keepalive {"ok":true,...}`.
- [ ] Check mobile (390 px) and desktop; no "demo" wording anywhere.
- [ ] Lead cookies are `HttpOnly; Secure` in production (DevTools → Application → Cookies).
- [ ] Supabase Security Advisors: only the expected warnings (SECURITY DEFINER lead functions, `is_admin()`).
- [ ] Optional: Vercel Firewall rate-limit rule (section 8).

---

## 11. Rollback

- **Code**: Project → Deployments → pick a previous Production deployment → **Instant Rollback**
  (or "Promote to Production"). Environment variables are not part of the rollback.
- **Build-time variables** (`NEXT_PUBLIC_*`) are baked into each deployment: rolling back restores
  the old ones; changing them needs a new deployment.
- **Take the site offline fast**: Settings → Domains → remove the custom domain (data untouched), or
  pause the project.
- **Database**: migrations are forward-only. Export the data before new migrations; to undo, write a
  corrective migration and ask the reviewer to apply it.
- **Leaked secret**: rotate it at the provider (`RESEND_API_KEY` at Resend; `CRON_SECRET`: any new
  random value; `LEAD_API_SECRET`: new value in Vercel **and** new SHA-256 in the DB, see
  `app/supabase/README.md`), update the Vercel variable, redeploy. The publishable key is public by
  design.

---

## 12. Compatibility notes (Vercel)

- Runtime: all routes run as Node.js Vercel Functions (no Edge-runtime routes). `src/proxy.ts`
  (Next 16 proxy, matcher `/admin` + `/admin/:path*`) only guards the admin area; the admin layout
  additionally calls `requireAdmin()`. The cron route `/api/cron/keepalive` is outside the matcher.
- Server code reads `process.env` inside functions, so runtime variables apply to every new deployment.
- The in-memory limiters reset when an instance is recycled (see section 8).
