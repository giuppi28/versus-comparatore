-- =====================================================================================
-- T1.4  Seed: suppliers (PRD §6 Block E dropdown + special options), 8 test offers
--       (TASKS.md T1.4), settings row. Idempotent: safe to run more than once.
-- Offer names are invented on purpose (not real commercial products).
-- All offers: fixed, monorario, customer_type both, active, price_verified = false,
-- activation 0 €, other fixed costs 0 €/month.
-- Advantages: luce shows "Tariffa **monoraria**"; gas shows "Prezzo **fisso** per tutta la
-- durata del blocco" instead (time bands apply only to electricity — QUESTIONS.md Q4).
-- =====================================================================================

-- Suppliers ---------------------------------------------------------------------------
-- The three special options are listed in the "Fornitore attuale" dropdown and have no
-- offers. They carry sells_luce/sells_gas = true (same as the app mock data) so a
-- per-commodity dropdown filter keeps them; with no offers they never appear in results.
-- They are flagged is_placeholder = true (QUESTIONS.md Q8).
insert into public.suppliers (name, slug, logo_path, sells_luce, sells_gas, show_in_dropdown, sort_order, active, is_placeholder)
values
  ('Enel Energia',                         'enel-energia',    '/logos/enel-energia.svg', true, true, true,   1, true, false),
  ('Eni Plenitude',                        'eni-plenitude',   '/logos/eni-plenitude.svg', true, true, true,   2, true, false),
  ('Edison Energia',                       'edison-energia',  '/logos/edison-energia.svg', true, true, true,   3, true, false),
  ('A2A Energia',                          'a2a-energia',     '/logos/a2a-energia.svg', true, true, true,   4, true, false),
  ('Hera Comm',                            'hera-comm',       '/logos/hera-comm.svg', true, true, true,   5, true, false),
  ('Iren',                                 'iren',            '/logos/iren.svg', true, true, true,   6, true, false),
  ('Acea Energia',                         'acea-energia',    '/logos/acea-energia.svg', true, true, true,   7, true, false),
  ('Sorgenia',                             'sorgenia',        '/logos/sorgenia.svg', true, true, true,   8, true, false),
  ('Engie',                                'engie',           '/logos/engie.svg', true, true, true,   9, true, false),
  ('E.ON Energia',                         'eon-energia',     '/logos/eon-energia.svg', true, true, true,  10, true, false),
  ('Iberdrola',                            'iberdrola',       '/logos/iberdrola.svg', true, true, true,  11, true, false),
  ('Servizio di Tutela / Tutele Graduali', 'tutela',          null, true, true, true, 100, true, true),
  ('Altro fornitore',                      'altro-fornitore', null, true, true, true, 101, true, true),
  ('Non lo so',                            'non-lo-so',       null, true, true, true, 102, true, true)
on conflict (slug) do nothing;
-- Keep the flag right on databases seeded before is_placeholder existed (idempotent).
update public.suppliers set is_placeholder = true
 where slug in ('tutela', 'altro-fornitore', 'non-lo-so') and not is_placeholder;
-- Logos (T5.1): real suppliers point at the shipped logo pack (app/public/logos/<slug>.svg).
-- Fills only a null logo_path (e.g. rows inserted before this seed set it), so an
-- admin-uploaded logo is never overwritten on re-run. Placeholders keep logo_path = null.
update public.suppliers
   set logo_path = '/logos/' || slug || '.svg'
 where logo_path is null
   and not is_placeholder
   and slug in ('enel-energia', 'eni-plenitude', 'edison-energia', 'a2a-energia', 'hera-comm', 'iren',
                'acea-energia', 'sorgenia', 'engie', 'eon-energia', 'iberdrola');

-- Offers ------------------------------------------------------------------------------
with spec (supplier_slug, name, commodity, energy_price, other_variable_costs, fixed_fee_monthly,
           locked_months, featured, promo_text) as (
  values
    -- Luce: other variable costs 0,0600 €/kWh
    ('edison-energia', 'Edison Luce Fissa 12',    'luce', 0.1290, 0.0600,  9.00, 12, true,  'Fino a 60€ di sconto il primo anno'),
    ('sorgenia',       'Sorgenia Luce Sicura 24', 'luce', 0.1350, 0.0600,  8.00, 24, false, null),
    ('a2a-energia',    'A2A Luce Smart',          'luce', 0.1250, 0.0600, 12.00, 12, false, null),
    ('iberdrola',      'Iberdrola Luce Stabile',  'luce', 0.1390, 0.0600,  7.50, 12, false, null),
    -- Gas: other variable costs 0,2600 €/Smc
    ('eni-plenitude',  'Plenitude Gas Fisso 12',  'gas',  0.4900, 0.2600,  9.00, 12, true,  'Fino a 50€ di sconto il primo anno'),
    ('hera-comm',      'Hera Gas Sereno',         'gas',  0.5100, 0.2600,  8.00, 24, false, null),
    ('engie',          'Engie Gas Facile',        'gas',  0.4750, 0.2600, 11.00, 12, false, null),
    ('iren',           'Iren Gas Chiaro',         'gas',  0.5200, 0.2600,  7.00, 12, false, null)
)
insert into public.offers (
  supplier_id, name, commodity, customer_type, price_type,
  energy_price, other_variable_costs, fixed_fee_monthly, other_fixed_costs_monthly,
  locked_months, activation_cost, promo_text, advantages, details,
  featured, active, price_verified
)
select
  s.id, spec.name, spec.commodity, 'both', 'fixed',
  spec.energy_price, spec.other_variable_costs, spec.fixed_fee_monthly, 0,
  spec.locked_months, 0, spec.promo_text,
  array_remove(array[
    'Prezzo **bloccato** ' || spec.locked_months || ' mesi',
    case when spec.commodity = 'gas' then 'Prezzo **fisso** per tutta la durata del blocco'
         else 'Tariffa **monoraria**' end,
    spec.promo_text,
    'Attivala **online** con noi, **gratis** e in **1 minuto**',
    'Puoi **revocare** il contratto entro 14 giorni'
  ], null),
  null,
  spec.featured, true, false
from spec
join public.suppliers s on s.slug = spec.supplier_slug
where not exists (
  select 1 from public.offers o where o.supplier_id = s.id and o.name = spec.name
);

-- Settings (single row; notification email still unknown - QUESTIONS.md Q3) -------------
insert into public.settings (id, notification_email) values (true, null)
on conflict (id) do nothing;
