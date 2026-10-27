-- =====================================================================================
-- Phase 14 (T14.4)  Aldo's 42 offers (2026-10-27) + 4 new suppliers.
--
-- !! DATA MIGRATION: DELETES ALL EXISTING OFFERS and inserts 42 new ones, including
-- !! variable (PUN + spread) luce offers that the app currently in production cannot render.
-- !! Requires 20261027100000_offers_variable_iban_featured.sql first.
-- !! Apply ONLY together with Giuseppe's merge of dev into main (decision #24).
--
-- Leads that chose a deleted offer keep their snapshot (trigger offers_snapshot_before_delete).
-- Source: docs/source/offers-2026-10-27.csv. One transaction; idempotent (re-run replaces
-- the offers with the same 42). Placeholder suppliers and suppliers without offers untouched.
-- =====================================================================================
begin;

-- 1. New suppliers (sell luce + gas, active, in the "Fornitore attuale" dropdown)
insert into public.suppliers (name, slug, logo_path, sells_luce, sells_gas, show_in_dropdown, sort_order, active, is_placeholder)
values
  ('Sentra Energia', 'sentra-energia', '/logos/sentra-energia.svg', true, true, true, 12, true, false),
  ('Estra Energia',  'estra-energia',  '/logos/estra-energia.svg',  true, true, true, 13, true, false),
  ('Enegan',         'enegan',         '/logos/enegan.svg',         true, true, true, 14, true, false),
  ('Asti Energy',    'asti-energia',   '/logos/asti-energia.svg',   true, true, true, 15, true, false)
on conflict (slug) do nothing;

-- 2. Replace all offers
delete from public.offers;

with spec (commodity, customer_type, supplier_slug, name, price_type, energy_price, iban_required, featured_audience) as (
  values
    ('luce', 'casa', 'iren', 'Prezzo Fisso Revolution', 'fixed', 0.13, true, null),
    ('luce', 'casa', 'iren', 'Prezzo Fisso Revolution', 'fixed', 0.14, false, null),
    ('luce', 'casa', 'iren', 'Prezzo Variabile Revolution', 'variable', 0.01, false, null),
    ('luce', 'casa', 'eni-plenitude', 'Fixa Time', 'fixed', 0.13, false, null),
    ('luce', 'casa', 'eni-plenitude', 'Trend', 'variable', 0.02, true, null),
    ('luce', 'casa', 'sentra-energia', 'Anno Sicuro', 'fixed', 0.11, false, null),
    ('luce', 'casa', 'sentra-energia', 'Energia Anno Sicuro', 'fixed', 0.15, false, null),
    ('luce', 'casa', 'enel-energia', 'Offerta Enel Energia', 'fixed', 0.19, false, null),
    ('luce', 'casa', 'a2a-energia', 'Offerta A2A Energia', 'fixed', 0.19, false, null),
    ('luce', 'casa', 'edison-energia', 'Offerta Edison Energia', 'fixed', 0.20, false, null),
    ('luce', 'casa', 'estra-energia', 'Offerta Estra Energia', 'fixed', 0.16, false, null),
    ('luce', 'casa', 'enegan', 'Offerta Enegan', 'fixed', 0.19, false, null),
    ('luce', 'casa', 'asti-energia', 'Offerta Asti Energy', 'fixed', 0.14, false, null),
    ('luce', 'business', 'sentra-energia', 'Offerta Sentra Energia', 'fixed', 0.13, false, 'business'),
    ('luce', 'business', 'enel-energia', 'Offerta Enel Energia', 'fixed', 0.14, false, 'business'),
    ('luce', 'business', 'asti-energia', 'Offerta Asti Energy', 'fixed', 0.16, false, null),
    ('luce', 'business', 'iren', 'Offerta Iren', 'fixed', 0.17, false, null),
    ('luce', 'business', 'eni-plenitude', 'Offerta Eni Plenitude', 'fixed', 0.18, false, null),
    ('luce', 'business', 'estra-energia', 'Offerta Estra Energia', 'fixed', 0.19, false, null),
    ('luce', 'business', 'a2a-energia', 'Offerta A2A Energia', 'fixed', 0.20, false, null),
    ('luce', 'business', 'edison-energia', 'Offerta Edison Energia', 'fixed', 0.21, false, null),
    ('luce', 'business', 'enegan', 'Offerta Enegan', 'fixed', 0.21, false, null),
    ('gas', 'casa', 'iren', 'Gas Revolution Prezzo Fisso', 'fixed', 0.34, true, null),
    ('gas', 'casa', 'iren', 'Gas Revolution Prezzo Fisso', 'fixed', 0.45, false, null),
    ('gas', 'casa', 'eni-plenitude', 'Trend', 'fixed', 0.36, true, null),
    ('gas', 'casa', 'eni-plenitude', 'Fixa Time', 'fixed', 0.45, false, null),
    ('gas', 'casa', 'sentra-energia', 'Offerta Sentra Energia', 'fixed', 0.34, false, null),
    ('gas', 'casa', 'enegan', 'Offerta Enegan', 'fixed', 0.40, false, null),
    ('gas', 'casa', 'asti-energia', 'Offerta Asti Energy', 'fixed', 0.36, false, null),
    ('gas', 'casa', 'enel-energia', 'Offerta Enel Energia', 'fixed', 0.76, false, null),
    ('gas', 'casa', 'a2a-energia', 'Offerta A2A Energia', 'fixed', 0.70, false, null),
    ('gas', 'casa', 'edison-energia', 'Offerta Edison Energia', 'fixed', 0.78, false, null),
    ('gas', 'casa', 'estra-energia', 'Offerta Estra Energia', 'fixed', 0.76, false, null),
    ('gas', 'business', 'sentra-energia', 'Offerta Sentra Energia', 'fixed', 0.39, false, 'business'),
    ('gas', 'business', 'enegan', 'Offerta Enegan', 'fixed', 0.40, false, 'business'),
    ('gas', 'business', 'iren', 'Offerta Iren', 'fixed', 0.77, false, null),
    ('gas', 'business', 'eni-plenitude', 'Offerta Eni Plenitude', 'fixed', 0.80, false, null),
    ('gas', 'business', 'asti-energia', 'Offerta Asti Energy', 'fixed', 0.70, false, null),
    ('gas', 'business', 'enel-energia', 'Offerta Enel Energia', 'fixed', 0.88, false, null),
    ('gas', 'business', 'a2a-energia', 'Offerta A2A Energia', 'fixed', 0.78, false, null),
    ('gas', 'business', 'edison-energia', 'Offerta Edison Energia', 'fixed', 0.80, false, null),
    ('gas', 'business', 'estra-energia', 'Offerta Estra Energia', 'fixed', 0.76, false, null)
)
insert into public.offers (
  supplier_id, name, commodity, customer_type, price_type,
  energy_price, other_variable_costs, fixed_fee_monthly, other_fixed_costs_monthly,
  locked_months, activation_cost, promo_text, advantages, details,
  featured, featured_audience, iban_required, active, price_verified
)
select
  s.id, spec.name, spec.commodity, spec.customer_type, spec.price_type,
  spec.energy_price, 0, 0, 0,
  case when spec.price_type = 'fixed' then 12 else null end,
  0, null,
  case
    when spec.price_type = 'variable' then array[
      'Attivala online con noi, gratis e in 1 minuto',
      'Puoi revocare il contratto entro 14 giorni']
    when spec.commodity = 'luce' then array[
      'Prezzo bloccato per **12 mesi**',
      'Tariffa **monoraria**',
      'Attivala online con noi, gratis e in 1 minuto',
      'Puoi revocare il contratto entro 14 giorni']
    else array[
      'Prezzo bloccato per **12 mesi**',
      'Attivala online con noi, gratis e in 1 minuto',
      'Puoi revocare il contratto entro 14 giorni']
  end,
  null,
  spec.featured_audience is not null, spec.featured_audience, spec.iban_required, true, true
from spec
join public.suppliers s on s.slug = spec.supplier_slug;

-- 3. Every supplier with offers sells the commodity of those offers
update public.suppliers s
   set sells_luce = s.sells_luce or exists (select 1 from public.offers o where o.supplier_id = s.id and o.commodity = 'luce'),
       sells_gas  = s.sells_gas  or exists (select 1 from public.offers o where o.supplier_id = s.id and o.commodity = 'gas')
 where exists (select 1 from public.offers o where o.supplier_id = s.id);

-- 4. Final check: counts per (commodity, customer_type) = 13 / 9 / 11 / 9
do $$
declare
  v_luce_casa int; v_luce_business int; v_gas_casa int; v_gas_business int; v_total int;
begin
  select count(*) filter (where commodity = 'luce' and customer_type = 'casa'),
         count(*) filter (where commodity = 'luce' and customer_type = 'business'),
         count(*) filter (where commodity = 'gas' and customer_type = 'casa'),
         count(*) filter (where commodity = 'gas' and customer_type = 'business'),
         count(*)
    into v_luce_casa, v_luce_business, v_gas_casa, v_gas_business, v_total
    from public.offers o
    join public.suppliers s on s.id = o.supplier_id
   where s.active;
  if (v_luce_casa, v_luce_business, v_gas_casa, v_gas_business, v_total) <> (13, 9, 11, 9, 42) then
    raise exception 'offers_aldo_2026_10_27: unexpected counts luce casa %, luce business %, gas casa %, gas business %, total %',
      v_luce_casa, v_luce_business, v_gas_casa, v_gas_business, v_total;
  end if;
end $$;

commit;
