# PHASE 11 BRIEF — Admin deletions (approved by Giuseppe, 2026-10-15)

Giuseppe (and later Aldo) must be able to **delete leads quickly** (e.g. once a lead has been called back), and to **delete offers and suppliers** when needed. Today the admin area has no delete anywhere. Admin UI copy in Italian.

## Current state (verified)
- RLS/grants already allow admins (with MFA when enrolled) to DELETE on `leads`, `offers`, `suppliers` (`*_admin_all` policies + `grant ... delete ... to authenticated`). Anon has no delete. **No policy change is needed.**
- FKs: `offers.supplier_id → suppliers` is **ON DELETE RESTRICT**; `leads.chosen_offer_luce/gas → offers` and `leads.current_supplier_luce/gas → suppliers` are **ON DELETE SET NULL**. Leads store no snapshot of the chosen offer → deleting an offer today would silently erase which offer an old lead chose.
- Preview and production deployments use the **same Supabase project**. Any migration must be additive and backward compatible with the app currently in production.

## D1 — Preserve lead history before deletions → `db-builder` (opus, security-critical)
Migration `app/supabase/migrations/<timestamp>_lead_snapshots_on_delete.sql` (additive only, no DROP, no change to RLS or to the lead functions):
- Add to `public.leads`: `chosen_offer_luce_snapshot jsonb`, `chosen_offer_gas_snapshot jsonb`, `current_supplier_luce_name text`, `current_supplier_gas_name text` (nullable).
- `BEFORE DELETE` trigger on `public.offers` (SECURITY DEFINER, `search_path = ''`, owned by postgres, not executable by anon/authenticated directly): for every lead referencing the offer, store a compact snapshot (supplier name, offer name, commodity, prices, fixed fee, blocked months) in the matching `*_snapshot` column if it is still null.
- `BEFORE DELETE` trigger on `public.suppliers`: store the supplier name in `current_supplier_*_name` of referencing leads if null. Also **reject deleting a placeholder supplier** (`is_placeholder = true`: Tutela / Altro fornitore / Non lo so) with a clear error.
- Keep `offers.supplier_id` ON DELETE RESTRICT (the app deletes offers first, explicitly — see D3).
- Tests: extend `supabase/tests/data_checks.sql` / `rls_test.sql` (PGlite): snapshots written, placeholder delete rejected, anon still cannot delete anything. Then `## APPLY: <file>` in QUESTIONS.md (the reviewer session applies it to the real DB — do not wait on it to build the UI; the mock layer must implement the same behaviour).
- Lead detail in admin shows the snapshot when the live offer/supplier no longer exists ("Offerta eliminata: …").

## D2 — Leads deletion (fast) → `admin-leads-builder` (sonnet)
- Delete button on the lead detail page and a per-row delete action in the list.
- **Bulk delete**: checkboxes on list rows + "Seleziona tutti (pagina)" + "Elimina selezionati (N)". Works together with the existing filters, so Aldo can filter e.g. status "Contattato" and delete them in one go.
- Confirmation in an in-page modal from the UI kit (**never** `window.confirm`/alert), showing how many leads will be deleted; "Elimina" (danger) / "Annulla". One click + one confirm, no typing.
- Server action: admin check exactly like the existing actions, zod-validated array of UUIDs (max 200 per call), `delete ... where id in (...)`, revalidate list, toast/feedback "N lead eliminati". After deleting from the detail page, redirect to the list.
- Deletion is permanent: the modal says so ("L'operazione non può essere annullata").

## D3 — Offers and suppliers deletion → `admin-offers-builder` + `admin-suppliers-builder` (sonnet)
- **Offers**: delete action in the list and in the edit page, same confirm modal. Text explains that leads keep a copy of the offer data. Keep the existing "disattiva" toggle and suggest it in the modal as the softer alternative.
- **Suppliers**: delete action in list + edit page. If the supplier has offers, the modal says "Questo fornitore ha N offerte: verranno eliminate anche le offerte" and the server action deletes that supplier's offers first, then the supplier (both in the same server action; if the supplier delete fails, report it). Placeholder suppliers: no delete button (and the server rejects it too). If the supplier logo is in the Storage bucket, remove the object as well; logos in `/public/logos` are left alone.
- After deletion, results/loading for customers must simply no longer show that offer/supplier (already true via queries — add an e2e proving it).

## D4 — Loading marquee: all suppliers → `loading-builder` (sonnet)
Giuseppe asked for **all** the companies in the loading banner. Today it shows only suppliers that have an offer for the chosen commodity (3 logos for luce). Show **all active real suppliers with a logo** (placeholders excluded), still **excluding the customer's current supplier**. Update tests.

## D5 — Check Page 1 current-supplier block → `qa-tester` (+ `page1-builder` only if it is a real bug)
In `app/e2e/screenshots/page1-desktop-start.png` the block under "Di quale servizio hai bisogno?" (current supplier, shown because "Cambio fornitore" is preselected) appears as an empty grey card. Verify in a real browser at 1440 and 390 after the reveal animation. If it is only screenshot timing, make the screenshot spec wait for the animation end; if the block is really empty, fix it.

## D6 — Tests and review
- Vitest for actions/validation; Playwright admin e2e: single delete, bulk delete with filter, cancel keeps data, offer delete keeps lead snapshot visible, supplier-with-offers delete, placeholder supplier not deletable, unauthenticated delete rejected (server action called without session → no deletion).
- Full regression (unit, standard e2e, matrix). Security suite against the real DB **only after** the reviewer applied the migration (note it creates TEST-SECURITY leads — they can now be deleted from the admin).

## Git
Branch `preview/phase11` created from `preview/phase10` (Phase 10 is approved by Giuseppe but not merged yet). Push only to `origin preview/phase11`. Never push/merge `main`, never deploy production, never touch env vars/secrets.
