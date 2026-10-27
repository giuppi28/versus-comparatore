-- T14.4: checks after migration 20261027120000_offers_aldo_2026_10_27.sql (applied twice).
do $$
declare
  n int;
begin
  select count(*) into n from public.offers;
  if n <> 42 then raise exception 'FAIL: expected 42 offers, got %', n; end if;
  if (select count(*) from public.offers where commodity = 'luce' and customer_type = 'casa') <> 13
     or (select count(*) from public.offers where commodity = 'luce' and customer_type = 'business') <> 9
     or (select count(*) from public.offers where commodity = 'gas' and customer_type = 'casa') <> 11
     or (select count(*) from public.offers where commodity = 'gas' and customer_type = 'business') <> 9 then
    raise exception 'FAIL: counts per commodity / customer_type';
  end if;
  select count(*) into n from public.offers
   where not (active and price_verified and activation_cost = 0 and fixed_fee_monthly = 0
              and other_fixed_costs_monthly = 0 and other_variable_costs = 0 and promo_text is null and details is null);
  if n <> 0 then raise exception 'FAIL: % offers with unexpected flags/costs', n; end if;

  -- old seed offers are gone
  select count(*) into n from public.offers where name in ('Edison Luce Fissa 12', 'Hera Gas Sereno');
  if n <> 0 then raise exception 'FAIL: old seed offers still present'; end if;

  -- variable: only the two luce casa offers, no lock-in
  select count(*) into n from public.offers
   where price_type = 'variable' and commodity = 'luce' and customer_type = 'casa' and locked_months is null
     and ((name = 'Prezzo Variabile Revolution' and energy_price = 0.01 and not iban_required)
       or (name = 'Trend' and energy_price = 0.02 and iban_required));
  if n <> 2 then raise exception 'FAIL: variable offers (%)', n; end if;
  select count(*) into n from public.offers where price_type = 'fixed' and locked_months = 12;
  if n <> 40 then raise exception 'FAIL: fixed offers with 12 months: %', n; end if;

  select count(*) into n from public.offers where iban_required;
  if n <> 4 then raise exception 'FAIL: iban_required offers: %', n; end if;

  -- forced featured: 4 business offers, featured in sync
  select count(*) into n from public.offers where featured_audience = 'business' and featured and customer_type = 'business';
  if n <> 4 then raise exception 'FAIL: featured offers: %', n; end if;
  select count(*) into n from public.offers where featured is distinct from (featured_audience is not null);
  if n <> 0 then raise exception 'FAIL: featured out of sync'; end if;
  select count(*) into n from public.offers o join public.suppliers s on s.id = o.supplier_id
   where o.featured and ((o.commodity = 'luce' and s.slug not in ('sentra-energia', 'enel-energia'))
                      or (o.commodity = 'gas' and s.slug not in ('sentra-energia', 'enegan')));
  if n <> 0 then raise exception 'FAIL: wrong featured suppliers'; end if;

  -- advantages
  select count(*) into n from public.offers
   where (price_type = 'variable' and advantages = array['Attivala online con noi, gratis e in 1 minuto', 'Puoi revocare il contratto entro 14 giorni'])
      or (price_type = 'fixed' and commodity = 'luce' and advantages = array['Prezzo bloccato per **12 mesi**', 'Tariffa **monoraria**', 'Attivala online con noi, gratis e in 1 minuto', 'Puoi revocare il contratto entro 14 giorni'])
      or (price_type = 'fixed' and commodity = 'gas' and advantages = array['Prezzo bloccato per **12 mesi**', 'Attivala online con noi, gratis e in 1 minuto', 'Puoi revocare il contratto entro 14 giorni']);
  if n <> 42 then raise exception 'FAIL: advantages on % of 42 offers', n; end if;

  -- spot checks against the CSV
  select count(*) into n from public.offers o join public.suppliers s on s.id = o.supplier_id
   where (s.slug = 'edison-energia' and o.commodity = 'luce' and o.customer_type = 'casa' and o.energy_price = 0.20)
      or (s.slug = 'sentra-energia' and o.commodity = 'gas' and o.customer_type = 'business' and o.energy_price = 0.39)
      or (s.slug = 'estra-energia' and o.commodity = 'gas' and o.customer_type = 'casa' and o.energy_price = 0.76)
      or (s.slug = 'asti-energia' and o.commodity = 'luce' and o.customer_type = 'casa' and o.energy_price = 0.14);
  if n <> 4 then raise exception 'FAIL: CSV spot checks (%)', n; end if;

  -- suppliers
  select count(*) into n from public.suppliers
   where slug in ('sentra-energia', 'estra-energia', 'enegan', 'asti-energia')
     and active and show_in_dropdown and sells_luce and sells_gas and not is_placeholder
     and logo_path = '/logos/' || slug || '.svg';
  if n <> 4 then raise exception 'FAIL: new suppliers: %', n; end if;
  select count(*) into n from public.suppliers where name = 'Asti Energy' and slug = 'asti-energia';
  if n <> 1 then raise exception 'FAIL: Asti Energy name'; end if;
  select count(*) into n from public.suppliers where is_placeholder;
  if n <> 3 then raise exception 'FAIL: placeholders changed'; end if;
  select count(*) into n from public.suppliers where slug in ('tutela', 'altro-fornitore', 'non-lo-so') and (logo_path is not null);
  if n <> 0 then raise exception 'FAIL: placeholder logos'; end if;
  select count(*) into n from public.suppliers where slug in ('hera-comm', 'engie', 'sorgenia', 'eon-energia', 'iberdrola', 'acea-energia') and active;
  if n <> 6 then raise exception 'FAIL: suppliers without offers changed'; end if;
  select count(*) into n from public.suppliers s where exists (select 1 from public.offers o where o.supplier_id = s.id)
     and not (s.sells_luce and s.sells_gas);
  if n <> 0 then raise exception 'FAIL: supplier with offers not selling both'; end if;

  raise notice 'ALL OFFERS ALDO CHECKS PASSED';
end $$;
