# SEO/GEO round 2 — resume brief (written 2026-11-07)

When Giuseppe writes "riprendi" after `/clear`, start here, after the small T17.7 docs tick
(see the RESULT section of `docs/geo/T17.7-search-console-plan.md`).

## Goal (Giuseppe, 2026-11-07)
Rank first, above the big comparison sites (Facile.it, Segugio, SosTariffe, Selectra, ...), for
"offerte luce e gas" on Google Italia, and be the comparison site that AI assistants name and cite.
Use everything already built: Phase 17 pack, the 4 indexable guides, the hidden offers pages,
Search Console and Bing now live.

## Starting point (2026-11-07)
- Domain `versuscomparatorelucegas.it` registered 2026-11-04: no history, no backlinks, not indexed yet.
  Indexing requested 2026-11-07 for the home and 4 guides; sitemap read by Google (5 URLs) and sent to Bing.
- On site: H1 "Offerte luce e gas", FAQ, JSON-LD (Organization, WebSite, Service, FAQPage), `llms.txt`,
  OG image, canonical, 308 from vercel.app/www, Lighthouse lab 97–100. Facts: `docs/geo/canonical-facts.md`.
- Search Console + Bing on **info@sitexp.it** (not giuppips@gmail.com).

## Fixed rules (do not reopen without Giuseppe)
- The visible frontend stays as it is; any visible change needs Giuseppe's OK on that specific change.
- The 4 offers pages stay `noindex, follow`; guides are indexable; no links from home/header/footer/form
  to the hidden pages (memory `seo-pages-hidden-from-frontend`, SPEC #35). Same content to users and bots.
- CLAUDE.md hard rules: no Facile.it elements or wording, advantages only from DB offers, no "demo",
  phone/callback wording only where SPEC #28/#31 allow it, facts only from `canonical-facts.md`.
- No DB writes, no push/merge/deploy by Claude; commits `T19.<n>: ...` on `dev`.

## Be honest with Giuseppe first
"offerte luce e gas" is a head term held by domains with many years and thousands of referring
domains. On-site work alone will not beat them; the gap is authority (links, brand searches, mentions)
and time. State this in one short message with what realistically moves the needle, then propose the plan.

## Round 2 plan to propose (Phase 19, ask before building)
1. Competitor and SERP study for "offerte luce e gas" and the close variants (luce, gas, partita IVA,
   cambio fornitore, voltura, subentro, allaccio, Sicilia/Catania): who ranks, page types, content depth,
   schema, internal links, which sources AI assistants cite. Tools: `geo` skill, `searchfit-seo`
   competitor-analyzer / content-strategist. Output in `docs/geo/`.
2. Keyword map: head term on the home only; long-tail and local terms where a new domain can win early.
3. Off-site authority plan (the main lever): directories and listings, Google Business Profile if Aldo has
   a real address, supplier/partner mentions, local press, social profiles in `sameAs`. Giuseppe/Aldo do the
   sign-ups; Claude prepares the texts.
4. On-site gaps from step 1 (only invisible or approved changes): schema depth, guide content, freshness,
   E-E-A-T (who is behind VERSUS, Aldo as broker), `llms.txt`.
5. Measurement: define the GEO re-test panel (T17.9 leftover) and a Search Console check calendar.
