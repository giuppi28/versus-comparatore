# Index probe — 2026-11-12 (scheduled task, read only; run by: Claude)

Scope: did Google and Bing pick up the SEO changes deployed on 2026-11-09 (PR #12)? Baselines: `panel-2026-11-09.md` (and its addendum), `panel-2026-11-10.md`.

Method: raw HTML via `curl` with Googlebot and bingbot user-agents (no JS); google.it, bing.com, search.brave.com and DuckDuckGo read once in the app's built-in browser (not logged in, `hl=it&gl=it&pws=0`, one machine, one snapshot: positions move daily). Nothing was submitted, requested or changed anywhere.

## Check / 2026-11-09 / today

| Check | 2026-11-09 | 2026-11-12 |
|---|---|---|
| Home, Googlebot and bingbot UA | 200 | **200** for both (154,776 B / 154,703 B) |
| Home `<title>` (raw HTML) | "Offerte luce e gas: comparatore gratuito \| VERSUS" (new one deployed that evening) | "Comparatore luce e gas: confronta le offerte gratis \| VERSUS" |
| Home H1 (raw HTML) | "Offerte luce e gas" | "Comparatore luce e gas" |
| Sitemap | 7 URLs, `lastmod` 2026-11-07 | **8 URLs** (the 8th is `/guida/come-funziona-comparatore-luce-gas`, added 2026-11-10); home and new guide `lastmod` 2026-11-10, the other six 2026-11-07. The task expected 7: the difference is the new guide, not a fault |
| Google `site:` count | 5 of 7 (home + 4 older guides) | **8 of 8** |
| Google title for the home | old ("Offerte luce e gas…") | **new**: "Comparatore luce e gas: confronta le offerte gratis \| VERSUS", with the new description |
| `/guida/come-scegliere-offerta-luce-gas` on Google | unknown to Google | **indexed** (in `site:`) |
| `/guida/fine-tutela-mercato-libero` on Google | discovered, not indexed | **indexed** (in `site:`) |
| `/guida/come-funziona-comparatore-luce-gas` on Google | did not exist | **indexed** (in `site:`; missing from `site:` on 2026-11-10) |
| Google "comparatore luce e gas" | not in the first 60 | **not in the first 3 pages** (29 results read). Page 1 unchanged: ilportaleofferte.it, arera.it, altroconsumo.it, tariffe.segugio.it, billoo.it, facile.it, vivienergia.it, ilportaleofferte.it, supermoney.it. No AI Overview seen in this session |
| Google "versus comparatore luce gas" | not read (brand phrases absent from page 1 on 9 and 10 Nov) | **organic position 1** (home), **position 2** (guide "Come funziona un comparatore luce e gas"), **position 5** (guide "Come scegliere un'offerta"). A sponsored result (switcho.it) sits above. Not on pages 2-3 |
| Google "versus comparatore luce e gas" | absent from page 1 | **organic position 1** (home) |
| Google "versus comparatore" (two words) | not read (absent on 10 Nov) | absent from page 1: versus.com, hdblog.it, Google Play, techradar, kimovil, treccani |
| Third-party mentions (`"versuscomparatorelucegas.it" -site:`) | 0 | 0 relevant (Google returned generic comparator articles, none naming the domain in the listing) |
| Bing `site:` | 0 of 7 | **0 of 8** (Bing returns unrelated Fastweb modem pages) |
| Bing bare-domain query | comparatorelucegas.it, comparatoreenergia.it | same two, not us |
| Brave `site:` | 0 | 0 ("Troppo poche corrispondenze trovate") |
| DuckDuckGo `site:` | 0 | 0 ("No results found", HTML endpoint; the JS endpoint answered an error page to the automated browser) |

## Reading

- **Google has fully picked up the 9 November changes**: new home title and description, all 8 URLs in the index (the 2 guides that were missing plus the guide of 10 November).
- **Google now recognises the brand phrase**: on 10 November "versus comparatore luce e gas" returned the generic comparator page with no VERSUS; today the home is the first organic result for it and for "versus comparatore luce gas". This is the first ranking on a non-domain query.
- **No movement on the target phrase** "comparatore luce e gas": not in the first 3 pages. Expected: the SERP follows authority and age (see `panel-2026-11-10.md`, reading §2), and there are still no third-party links or mentions.
- **Bing, Brave and DuckDuckGo are still at 0.** Two indexing requests and two IndexNow submissions have not led to a crawl visible in the index. Whether the home left "Discovered but not crawled" could not be read today.

## Not checked, and why

- **Google Search Console** (URL inspection, last crawl dates, Performance report, impressions for "comparatore luce e gas") and **Bing Webmaster Tools** (home inspection status, sitemap URLs discovered, IndexNow list): the Claude in Chrome extension was not connected during this run, and the task rules allow these only through Giuseppe's logged-in Chrome. Skipped; no credentials were asked or entered.
- Google positions beyond page 3 for "comparatore luce e gas" (kept the number of Google page loads low to avoid the 429 seen on 10 November).
- Real AI assistants (ChatGPT, Perplexity, Gemini, Copilot): out of scope today, planned for 2026-11-23.

## Next actions

| # | Action | Owner | Needs a submit? |
|---|---|---|---|
| 1 | Off-site authority (T21.4 / O1-O4 of `panel-2026-11-10.md`): Google Business Profile, Bing Places, social profiles named "VERSUS — comparatore luce e gas", first honest links and citations. This is what decides the position for "comparatore luce e gas" and is the outside signal Bing is waiting for | Giuseppe, Aldo | Off-site |
| 2 | 2026-11-16: read Search Console (Performance, pages report, links) and Bing Webmaster (crawl state of the home, sitemap count 7 → 8, IndexNow list) with the Chrome extension connected | Giuseppe opens Chrome; Claude reads | No |
| 3 | If on 16 November Bing still says "Discovered but not crawled": Bing "Request indexing" for the home again and sitemap resubmit (it listed 7 URLs on 10 November, the site has 8) | Giuseppe approves, Claude or Giuseppe submits | **Yes — not done today** |
| 4 | 2026-11-23: full AI-assistant panel (T22.6) | Giuseppe / Claude through Chrome | No |
