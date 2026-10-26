# Features — VERSUS

Plain-language list of what the site does, base for Aldo's manual. Full spec: `PRD_VERSUS_v0.6.md`. Maintained by `scribe` at phase end.

## Customer site
- **Compare offers** — the customer chooses luce, gas or luce + gas, home (Casa) or business (Partita IVA), and the type of request (cambio fornitore, subentro, voltura, primo allaccio). How to use it: fill in the blocks on the first page; the site estimates the yearly consumption from the household data, or uses the consumption the customer types in.
- **Offer results** — after a loading screen of about 6 seconds (it first shows "Stiamo ricercando per te l'offerta più bassa", then "Ecco le migliori offerte per te!"), the customer sees the offers with the estimated monthly cost (VAT excluded): featured offers first, then from cheapest to most expensive. Offers of the customer's current supplier are not shown; the monthly consumption can be edited and the costs update instantly. For luce + gas, the luce offer is chosen first, then the gas offer.
- **Offer details** — "Attiva online in 1 minuto" opens a window with the offer's advantages and a button to continue.
- **Online activation** — two short steps: holder data (step A) and supply data (step B: address, POD/PDR, optional IBAN and identity document). Under the IBAN field a fixed line reads "Sconto del 15% se paghi con IBAN" (15% discount if you pay by IBAN). The site checks the codes as they are typed, recognizes the electricity distributor from the POD, and accepts up to 2 document photos or PDFs (photos are reduced automatically; the customer can remove a file).
- **Thank-you page** — confirms the request and shows the number Aldo's consultant will call from.
- **Privacy page** — the privacy notice, linked from the footer as "Privacy e cookie". It lists in full the personal data collected and has a Cookie section: the site uses technical cookies only (a 24-hour cookie that keeps a request in progress, and login cookies for the admin area). Form data typed by the customer is kept in the browser tab only until it is closed. There are no analytics or marketing cookies, so no cookie banner is shown.

## Admin area (Aldo)
- **Login** — email and password, optional two-step code (TOTP).
- **Leads** — list and detail of every request, complete or abandoned, with status (nuovo, contattato, in lavorazione, chiuso) and internal notes. The detail shows the chosen offer, IBAN, document data and files (preview/download). Leads can be deleted one by one or in bulk; their files are deleted too.
- **Suppliers** — create, edit, activate/deactivate and delete suppliers; upload the logo (SVG).
- **Offers** — create and edit every field of an offer (prices, fixed fee per month or per year, locked months, promo, advantages, conditions), mark it as featured, activate/deactivate, delete. "Prezzo verificato" must be ticked on every active offer before go-live.
- **Settings** — notification email for new leads, "Invia email di prova", callback number shown on the thank-you page, and the go-live checklist.
- **New-lead email** — Aldo receives an email for each completed request.
