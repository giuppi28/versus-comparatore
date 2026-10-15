-- =====================================================================================
-- T1.3 / T1.4 data checks. Read-only. Run as postgres right after applying the
-- migrations + seed.sql (Supabase SQL editor or tests/run_local.mjs).
-- Raises 'FAIL: ...' on the first failed check; success = NOTICE 'ALL DATA CHECKS PASSED'.
-- =====================================================================================
do $$
declare
  n   integer;
  z   text;
  adv text[];
  v_offer public.offers;
begin
  -- ---------------------------------------------------------------- comuni (T1.3)
  select count(*) into n from public.comuni where istat_code <> '999999';
  if n <> 7894 then raise exception 'FAIL: expected 7894 comuni, got %', n; end if;
  select count(distinct province_code) into n from public.comuni where istat_code <> '999999';
  if n <> 110 then raise exception 'FAIL: expected 110 provinces, got %', n; end if;
  select count(distinct region) into n from public.comuni where istat_code <> '999999';
  if n <> 20 then raise exception 'FAIL: expected 20 regions, got %', n; end if;
  select count(*) into n from public.comuni where climate_zone is null;
  if n <> 21 then raise exception 'FAIL: expected 21 comuni without climate zone, got %', n; end if;
  select count(*) into n from public.comuni where cardinality(caps) = 0;
  if n <> 0 then raise exception 'FAIL: % comuni without CAP', n; end if;

  -- name_search normalization (same rules as app/src/lib/data/normalize.ts)
  select name_search into z from public.comuni where istat_code = '040012';  -- Forlì
  if z <> 'forli' then raise exception 'FAIL: name_search Forlì = %', z; end if;
  select name_search into z from public.comuni where istat_code = '066049';  -- L'Aquila
  if z <> 'l aquila' then raise exception 'FAIL: name_search L''Aquila = %', z; end if;
  select count(*) into n from public.comuni where name_search like '%' || public.normalize_search('Reggio nell''Emilia') || '%';
  if n <> 1 then raise exception 'FAIL: search Reggio nell''Emilia found %', n; end if;
  select count(*) into n from public.comuni where name_search ilike '%cortina d ampezzo%';
  if n <> 1 then raise exception 'FAIL: search Cortina d''Ampezzo found %', n; end if;

  -- climate zones of well-known comuni (DPR 412/93)
  for z, n in
    select c.climate_zone || ':' || c.name, 0 from public.comuni c
    where (c.istat_code, c.climate_zone) not in (
      values ('084020','A'),  -- Lampedusa e Linosa
             ('084028','A'),  -- Porto Empedocle
             ('082053','B'),  -- Palermo
             ('080063','B'),  -- Reggio di Calabria
             ('063049','C'),  -- Napoli
             ('072006','C'),  -- Bari
             ('058091','D'),  -- Roma
             ('048017','D'),  -- Firenze
             ('015146','E'),  -- Milano
             ('001272','E'),  -- Torino
             ('025006','F'),  -- Belluno
             ('025016','F')   -- Cortina d'Ampezzo
    )
    and c.istat_code in ('084020','084028','082053','080063','063049','072006','058091','048017','015146','001272','025006','025016')
  loop
    raise exception 'FAIL: unexpected climate zone %', z;
  end loop;
  -- derived zones: Sappada moved Veneto -> Friuli-Venezia Giulia (same territory)
  select climate_zone || '/' || climate_zone_source into z from public.comuni where istat_code = '030189';
  if z is distinct from 'F/dpr412_renamed' then raise exception 'FAIL: Sappada zone = %', z; end if;
  -- merger of comuni in different zones stays unknown: Montoro (Montoro Inferiore C + Superiore D)
  select coalesce(climate_zone, 'null') into z from public.comuni where istat_code = '064121';
  if z <> 'null' then raise exception 'FAIL: Montoro should have no zone, got %', z; end if;

  -- ---------------------------------------------------------------- suppliers (T1.4)
  select count(*) into n from public.suppliers where slug in (
    'enel-energia','eni-plenitude','edison-energia','a2a-energia','hera-comm','iren','acea-energia',
    'sorgenia','engie','eon-energia','iberdrola','tutela','altro-fornitore','non-lo-so')
    and active and show_in_dropdown;
  if n <> 14 then raise exception 'FAIL: expected 14 dropdown suppliers, got %', n; end if;
  select count(*) into n from public.offers o join public.suppliers s on s.id = o.supplier_id
   where s.slug in ('tutela','altro-fornitore','non-lo-so');
  if n <> 0 then raise exception 'FAIL: special dropdown options must have no offers'; end if;
  -- Q8: only the three special options are placeholders
  select count(*) into n from public.suppliers where is_placeholder;
  if n <> 3 then raise exception 'FAIL: expected 3 placeholder suppliers, got %', n; end if;
  select count(*) into n from public.suppliers where is_placeholder and slug in ('tutela','altro-fornitore','non-lo-so');
  if n <> 3 then raise exception 'FAIL: placeholder flag on tutela / altro-fornitore / non-lo-so'; end if;

  -- ---------------------------------------------------------------- offers (T1.4)
  select count(*) into n from public.offers
   where active and not price_verified and customer_type = 'both' and price_type = 'fixed'
     and activation_cost = 0 and other_fixed_costs_monthly = 0
     and name in ('Edison Luce Fissa 12','Sorgenia Luce Sicura 24','A2A Luce Smart','Iberdrola Luce Stabile',
                  'Plenitude Gas Fisso 12','Hera Gas Sereno','Engie Gas Facile','Iren Gas Chiaro');
  if n <> 8 then raise exception 'FAIL: expected the 8 seed offers, got %', n; end if;
  select count(*) into n from public.offers where commodity = 'luce' and other_variable_costs = 0.06
     and name in ('Edison Luce Fissa 12','Sorgenia Luce Sicura 24','A2A Luce Smart','Iberdrola Luce Stabile');
  if n <> 4 then raise exception 'FAIL: luce other variable costs'; end if;
  select count(*) into n from public.offers where commodity = 'gas' and other_variable_costs = 0.26
     and name in ('Plenitude Gas Fisso 12','Hera Gas Sereno','Engie Gas Facile','Iren Gas Chiaro');
  if n <> 4 then raise exception 'FAIL: gas other variable costs'; end if;

  select o2.* into v_offer from public.offers o2 join public.suppliers s on s.id = o2.supplier_id
   where s.slug = 'edison-energia' and o2.name = 'Edison Luce Fissa 12';
  if v_offer.energy_price <> 0.129 or v_offer.fixed_fee_monthly <> 9 or v_offer.locked_months <> 12 or not v_offer.featured
     or v_offer.promo_text <> 'Fino a 60€ di sconto il primo anno' then
    raise exception 'FAIL: Edison Luce Fissa 12 values';
  end if;
  if v_offer.advantages <> array['Prezzo **bloccato** 12 mesi', 'Tariffa **monoraria**', 'Fino a 60€ di sconto il primo anno',
                           'Attivala **online** con noi, **gratis** e in **1 minuto**',
                           'Puoi **revocare** il contratto entro 14 giorni'] then
    raise exception 'FAIL: Edison advantages = %', v_offer.advantages;
  end if;

  select o2.* into v_offer from public.offers o2 join public.suppliers s on s.id = o2.supplier_id
   where s.slug = 'hera-comm' and o2.name = 'Hera Gas Sereno';
  if v_offer.energy_price <> 0.51 or v_offer.fixed_fee_monthly <> 8 or v_offer.locked_months <> 24 or v_offer.featured or v_offer.promo_text is not null then
    raise exception 'FAIL: Hera Gas Sereno values';
  end if;
  if v_offer.advantages <> array['Prezzo **bloccato** 24 mesi', 'Prezzo **fisso** per tutta la durata del blocco',
                           'Attivala **online** con noi, **gratis** e in **1 minuto**',
                           'Puoi **revocare** il contratto entro 14 giorni'] then
    raise exception 'FAIL: Hera advantages = %', v_offer.advantages;
  end if;

  -- Q4: "Tariffa monoraria" only on luce offers; gas offers use the fixed-price wording
  select count(*) into n from public.offers where commodity = 'gas' and 'Tariffa **monoraria**' = any (advantages)
     and name in ('Plenitude Gas Fisso 12','Hera Gas Sereno','Engie Gas Facile','Iren Gas Chiaro');
  if n <> 0 then raise exception 'FAIL: % gas seed offers still show Tariffa monoraria', n; end if;
  select count(*) into n from public.offers where commodity = 'gas' and 'Prezzo **fisso** per tutta la durata del blocco' = any (advantages)
     and name in ('Plenitude Gas Fisso 12','Hera Gas Sereno','Engie Gas Facile','Iren Gas Chiaro');
  if n <> 4 then raise exception 'FAIL: gas fixed-price advantage on % of 4 gas seed offers', n; end if;
  select count(*) into n from public.offers where commodity = 'luce' and 'Tariffa **monoraria**' = any (advantages)
     and name in ('Edison Luce Fissa 12','Sorgenia Luce Sicura 24','A2A Luce Smart','Iberdrola Luce Stabile');
  if n <> 4 then raise exception 'FAIL: Tariffa monoraria on % of 4 luce seed offers', n; end if;

  select count(*) into n from public.offers where featured and name in ('Edison Luce Fissa 12', 'Plenitude Gas Fisso 12');
  if n <> 2 then raise exception 'FAIL: featured offers'; end if;
  select count(*) into n from public.offers where featured and name not in ('Edison Luce Fissa 12', 'Plenitude Gas Fisso 12')
     and name in ('Sorgenia Luce Sicura 24','A2A Luce Smart','Iberdrola Luce Stabile','Hera Gas Sereno','Engie Gas Facile','Iren Gas Chiaro');
  if n <> 0 then raise exception 'FAIL: unexpected featured offers'; end if;

  -- ---------------------------------------------------------------- settings
  select count(*) into n from public.settings;
  if n <> 1 then raise exception 'FAIL: settings must have exactly 1 row, got %', n; end if;

  raise notice 'ALL DATA CHECKS PASSED';
end $$;
