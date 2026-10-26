> **Superseded (2026-10-24):** the current handoff is `docs/HANDOFF.md`. This file is history.

# VERSUS — Handoff status (2026-10-15, 19:40 Europe/Rome)

## What it is
VERSUS — "comparatore luce e gas": Italian electricity & gas comparison website for Aldo (energy broker). Owner: Giuseppe Pappalardo (SiteXP). Customers (private and Partita IVA) compare offers (luce / gas / luce+gas), get a monthly estimate, fill an activation form; Aldo's call center calls them back. Aldo manages offers and leads in an admin area.

## Status: LIVE and working end to end
- Production: https://versus-comparatore.vercel.app (public). Giuseppe ran a full test lead: lead saved, notification email received, lead visible in /admin.
- Offers are still realistic PLACEHOLDERS (price_verified = false) until Aldo provides real prices.

## Where things are
- Project folder (Giuseppe's Mac): /Users/pippo/Desktop/versus-comparatore/ — Next.js app in app/. Coordination files at root: CLAUDE.md (rules, model policy), PRD_VERSUS_v0.5.md (v0.5.1 after Cloudflare removal), TASKS.md, PROGRESS.md, QUESTIONS.md, REVIEW.md, DESIGN_REVIEW.md, app/DEPLOY.md, app/README.md. Subagents in .claude/agents/.
- Read-only source material: /Users/pippo/Desktop/versus elementi/ (VERSUS logo SVGs, supplier logos, old demo in _archivio/ = aesthetic reference only).
- GitHub: giuppi28/versus-comparatore (private). main = production branch.
- Supabase: project "versus-comparatore", ref felnnfisnobpgetgtxle, eu-central-1, org "sitexp" (free plan).
- Vercel: project versus-comparatore (prj_QW3MWVuyGsbd7hQ83YRNgIkBccWI), team giuseppes-projects-a9ce686f (team_EXAImqxxiMCC308Dzf5AxkG0), Hobby plan, region fra1.

## Stack & key decisions
- Next.js (App Router, TS) + Tailwind; Supabase Postgres + Auth + Storage; Resend for lead notification emails; hosting Vercel (Hobby) — Cloudflare fully removed (no Turnstile; anti-spam to be added only if spam appears).
- Security: RLS on every table; anon reads only active suppliers/offers + comuni; leads written only via SECURITY DEFINER functions create_lead/update_lead/complete_lead that require a server-only LEAD_API_SECRET (DB stores only its SHA-256 in private.app_secrets) + per-lead token; server-side rate limiting by IP (Vercel headers only); admin = Supabase Auth user listed in public.admins; optional TOTP MFA; public sign-up DISABLED.
- Old lead functions and the comuni bootstrap loader are disabled (privileges revoked, moved to schema private, renamed *_disabled) — not dropped.
- Data: 7,894 comuni with DPR 412/93 climate zones; 14 suppliers (11 real + Tutela/Altro/Non lo so placeholders); 8 test offers (4 luce, 4 gas; Edison and Eni Plenitude featured), all fixed-price monorario, VAT excluded.
- Design: clean style of the first demo (bg #EFF1F4, white cards, #DCE0E7 borders, 10px radius, Archivo wide + Inter) with VERSUS green; real SVG logo; hero "Comparatore luce e gas"; minimal loading screen; "Cambio fornitore" preselected so the current-supplier dropdown is visible.
- Tests (last run): 815 unit, 191 e2e (+1 skipped), 386/386 full matrix, 74 security tests on real DB, Lighthouse accessibility 100.

## Accounts & configuration done
- Admin: giuppips@gmail.com (Supabase Auth, in public.admins).
- settings.notification_email = giuppips@gmail.com (temporary, to be replaced with Aldo's).
- Vercel env: NEXT_PUBLIC_DATA_SOURCE=supabase, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_PROJECT_REF, NOTIFICATION_EMAIL, LEAD_API_SECRET (Production + Preview, sensitive), CRON_SECRET (Production), RESEND_API_KEY (Production), RESEND_FROM="VERSUS <onboarding@resend.dev>", NEXT_PUBLIC_SITE_URL. Turnstile vars removed.
- Supabase keep-alive: daily Vercel Cron Job (needs CRON_SECRET — set).

## Still open (go-live)
1. From Aldo: privacy notice data (controller name, address, P.IVA, privacy email, retention period, confirmation that data goes to the chosen supplier) → fill the placeholders in /privacy.
2. From Aldo: real offer prices → enter/verify in admin (go-live checklist blocks while price_verified = false).
3. Aldo's email → notification_email + his own admin account.
4. Resend: onboarding@resend.dev can only email the Resend account owner (giuppips@gmail.com). To email Aldo, verify a real domain in Resend and update RESEND_FROM.
5. Custom domain (optional) → Vercel Settings → Domains.
6. Vercel Hobby is for non-commercial use: Pro (20 $/month) may be needed once it serves Aldo commercially.
7. Every push to main deploys to production automatically: agents should push to preview/* branches and merge to main only after Giuseppe approves.
8. Delete leftover TEST-SECURITY test leads from the admin if still present.

## Working preferences (Giuseppe)
- Talk to him in Italian; anything given to Claude Code (prompts, docs) in English; always state model + effort for prompts to paste elsewhere.
- Wants autonomy; mixed models to control cost (Sonnet default, Opus only for security-critical work); use /loop only when really needed.
- Destructive SQL through the Supabase connector requires an interactive confirmation that often cannot be given: prefer non-destructive alternatives (revoke/rename) or ask Giuseppe to do it from the dashboard/admin.
