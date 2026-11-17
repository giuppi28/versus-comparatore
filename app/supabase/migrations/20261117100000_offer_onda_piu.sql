-- =====================================================================================
-- 2026-11-17  Aldo's new offer "Onda Più" (luce + gas, casa + business).
--
-- Must rank FIRST and carry the "In evidenza" badge in every combination:
--   * featured_audience = 'both' -> forced-featured group (ranked first, badge) for casa and P.IVA;
--   * lowest energy price of all offers (luce 0.10 €/kWh, gas 0.30 €/Smc; previous minimums
--     luce 0.11 / gas 0.34), so it also beats the other forced-featured business offers.
-- New supplier "Onda Più" (slug onda-piu) without logo: the UI shows the text fallback.
-- Idempotent: re-running replaces only the Onda Più offers. Touches no other offer.
-- =====================================================================================
begin;

insert into public.suppliers (name, slug, logo_path, sells_luce, sells_gas, show_in_dropdown, sort_order, active, is_placeholder)
values ('Onda Più', 'onda-piu', null, true, true, true, 16, true, false)
on conflict (slug) do update set active = true, sells_luce = true, sells_gas = true;

delete from public.offers o
 using public.suppliers s
 where s.id = o.supplier_id and s.slug = 'onda-piu';

with spec (commodity, customer_type, energy_price) as (
  values
    ('luce', 'casa',     0.10),
    ('luce', 'business', 0.10),
    ('gas',  'casa',     0.30),
    ('gas',  'business', 0.30)
)
insert into public.offers (
  supplier_id, name, commodity, customer_type, price_type,
  energy_price, other_variable_costs, fixed_fee_monthly, other_fixed_costs_monthly,
  locked_months, activation_cost, promo_text, advantages, details,
  featured, featured_audience, iban_required, active, price_verified
)
select
  s.id, 'Onda Più', spec.commodity, spec.customer_type, 'fixed',
  spec.energy_price, 0, 0, 0,
  12, 0, null,
  case when spec.commodity = 'luce' then array[
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
  true, 'both', false, true, true
from spec
join public.suppliers s on s.slug = 'onda-piu';

-- Check: 4 Onda Più offers, each strictly the cheapest active offer of its commodity/customer type.
do $$
declare v_count int; v_bad int;
begin
  select count(*) into v_count
    from public.offers o join public.suppliers s on s.id = o.supplier_id
   where s.slug = 'onda-piu' and o.active and o.featured_audience = 'both';
  select count(*) into v_bad
    from public.offers o join public.suppliers s on s.id = o.supplier_id
   where s.slug <> 'onda-piu' and o.active and o.price_type = 'fixed'
     and o.energy_price <= case o.commodity when 'luce' then 0.10 else 0.30 end;
  if v_count <> 4 or v_bad <> 0 then
    raise exception 'offer_onda_piu: % Onda Più offers, % other fixed offers not more expensive', v_count, v_bad;
  end if;
end $$;

commit;
