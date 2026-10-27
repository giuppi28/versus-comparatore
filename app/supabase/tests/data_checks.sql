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

  -- ---------------------------------------------------------------- supplier logos (T5.1)
  select count(*) into n from public.suppliers
   where slug in ('enel-energia','eni-plenitude','edison-energia','a2a-energia','hera-comm','iren',
                  'acea-energia','sorgenia','engie','eon-energia','iberdrola')
     and not is_placeholder and logo_path = '/logos/' || slug || '.svg';
  if n <> 11 then raise exception 'FAIL: % of 11 real suppliers have /logos/<slug>.svg', n; end if;
  select count(*) into n from public.suppliers
   where slug in ('tutela','altro-fornitore','non-lo-so') and is_placeholder and logo_path is null;
  if n <> 3 then raise exception 'FAIL: % of 3 placeholder suppliers have null logo_path', n; end if;

  -- ---------------------------------------------------------------- lead snapshots on delete (Phase 11, D1)
  select count(*) into n from information_schema.columns
   where table_schema = 'public' and table_name = 'leads' and is_nullable = 'YES' and column_default is null
     and ((column_name in ('chosen_offer_luce_snapshot', 'chosen_offer_gas_snapshot') and data_type = 'jsonb')
       or (column_name in ('current_supplier_luce_name', 'current_supplier_gas_name') and data_type = 'text'));
  if n <> 4 then raise exception 'FAIL: % of 4 lead snapshot columns (nullable, no default, right type)', n; end if;
  -- the customer flow can never write them
  select count(*) into n from unnest(private.lead_writable_fields()) f
   where f in ('chosen_offer_luce_snapshot', 'chosen_offer_gas_snapshot', 'current_supplier_luce_name', 'current_supplier_gas_name');
  if n <> 0 then raise exception 'FAIL: snapshot columns are writable by the lead functions'; end if;

  -- BEFORE DELETE, FOR EACH ROW, enabled, and only on DELETE (tgtype bits: ROW 1, BEFORE 2, INSERT 4, DELETE 8, UPDATE 16)
  select count(*) into n from pg_trigger t
   where not t.tgisinternal and t.tgenabled = 'O' and (t.tgtype & 31) = 11
     and ((t.tgrelid = 'public.offers'::regclass and t.tgname = 'offers_snapshot_before_delete'
           and t.tgfoid = 'private.offers_snapshot_before_delete()'::regprocedure)
       or (t.tgrelid = 'public.suppliers'::regclass and t.tgname = 'suppliers_guard_before_delete'
           and t.tgfoid = 'private.suppliers_guard_before_delete()'::regprocedure));
  if n <> 2 then raise exception 'FAIL: % of 2 BEFORE DELETE triggers on offers/suppliers', n; end if;

  -- trigger functions: SECURITY DEFINER, search_path = '', owned by postgres, not executable by API roles
  select count(*) into n from pg_proc p
   where p.oid in ('private.offers_snapshot_before_delete()'::regprocedure,
                   'private.suppliers_guard_before_delete()'::regprocedure)
     and p.prosecdef
     and 'search_path=""' = any (p.proconfig)
     and pg_get_userbyid(p.proowner) = 'postgres'
     and not has_function_privilege('anon', p.oid, 'execute')
     and not has_function_privilege('authenticated', p.oid, 'execute')
     and not exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where a.grantee = 0);
  if n <> 2 then raise exception 'FAIL: % of 2 trigger functions are security definer / search_path '''' / postgres-owned / not executable', n; end if;

  -- offers.supplier_id stays ON DELETE RESTRICT; leads FKs to offers/suppliers stay ON DELETE SET NULL
  select count(*) into n from pg_constraint c
   where c.contype = 'f' and c.conrelid = 'public.offers'::regclass
     and c.confrelid = 'public.suppliers'::regclass and c.confdeltype = 'r';
  if n <> 1 then raise exception 'FAIL: offers.supplier_id is not ON DELETE RESTRICT'; end if;
  select count(*) into n from pg_constraint c
   where c.contype = 'f' and c.conrelid = 'public.leads'::regclass
     and c.confrelid in ('public.offers'::regclass, 'public.suppliers'::regclass) and c.confdeltype = 'n';
  if n <> 4 then raise exception 'FAIL: % of 4 lead FKs to offers/suppliers are ON DELETE SET NULL', n; end if;

  -- ---------------------------------------------------------------- settings
  select count(*) into n from public.settings;
  if n <> 1 then raise exception 'FAIL: settings must have exactly 1 row, got %', n; end if;

  -- ---------------------------------------------------------------- Phase 12 (T12.1)
  -- new lead columns: nullable, no default, right type, writable by the lead functions
  select count(*) into n from information_schema.columns
   where table_schema = 'public' and table_name = 'leads' and is_nullable = 'YES' and column_default is null
     and ((column_name in ('iban', 'iban_holder_first_name', 'iban_holder_last_name', 'iban_holder_tax_code',
                           'document_type', 'document_number', 'document_issuer') and data_type = 'text')
       or (column_name = 'iban_holder_different' and data_type = 'boolean')
       or (column_name = 'document_expiry' and data_type = 'date'));
  if n <> 9 then raise exception 'FAIL: % of 9 Phase 12 lead columns (nullable, no default, right type)', n; end if;
  select count(*) into n from unnest(private.lead_writable_fields()) f
   where f in ('iban', 'iban_holder_different', 'iban_holder_first_name', 'iban_holder_last_name', 'iban_holder_tax_code',
               'document_type', 'document_number', 'document_expiry', 'document_issuer');
  if n <> 9 then raise exception 'FAIL: % of 9 Phase 12 lead columns are writable by the lead functions', n; end if;

  -- settings.callback_phone: not null, default number
  select count(*) into n from public.settings where callback_phone = '+39 095 0000000';
  if n <> 1 then raise exception 'FAIL: settings.callback_phone default'; end if;

  -- lead_documents: RLS on; anon has no privilege; authenticated only SELECT
  if not (select c.relrowsecurity from pg_class c where c.oid = 'public.lead_documents'::regclass) then
    raise exception 'FAIL: RLS disabled on lead_documents';
  end if;
  if has_table_privilege('anon', 'public.lead_documents', 'select, insert, update, delete') then
    raise exception 'FAIL: anon has a privilege on lead_documents';
  end if;
  if has_table_privilege('authenticated', 'public.lead_documents', 'insert, update, delete')
     or not has_table_privilege('authenticated', 'public.lead_documents', 'select') then
    raise exception 'FAIL: authenticated privileges on lead_documents (select only expected)';
  end if;

  -- new functions: SECURITY DEFINER, search_path '', never executable by PUBLIC
  select count(*) into n from pg_proc p
   where p.oid in ('public.get_callback_phone()'::regprocedure,
                   'public.register_lead_document(text, text, text, integer)'::regprocedure,
                   'public.confirm_lead_document(text, text, uuid)'::regprocedure,
                   'public.complete_lead(text, text, jsonb)'::regprocedure,
                   'private.lead_document_upload_allowed(text)'::regprocedure)
     and p.prosecdef
     and 'search_path=""' = any (p.proconfig)
     and has_function_privilege('anon', p.oid, 'execute')
     and not exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where a.grantee = 0);
  if n <> 5 then raise exception 'FAIL: % of 5 Phase 12 functions are security definer / search_path '''' / anon-only-by-grant', n; end if;
  -- `private` is usable by anon only for the upload / removal policy helpers: no other private function or table
  select count(*) into n from pg_proc p join pg_namespace s on s.oid = p.pronamespace
   where s.nspname = 'private' and has_function_privilege('anon', p.oid, 'execute')
     and p.oid not in ('private.lead_document_upload_allowed(text)'::regprocedure,
                       'private.lead_document_removal_allowed(text)'::regprocedure);
  if n <> 0 then raise exception 'FAIL: % other private functions executable by anon', n; end if;
  select count(*) into n from pg_class c join pg_namespace s on s.oid = c.relnamespace
   where s.nspname = 'private' and c.relkind in ('r', 'v', 'm', 'p')
     and has_table_privilege('anon', c.oid, 'select, insert, update, delete');
  if n <> 0 then raise exception 'FAIL: anon has privileges on % private tables', n; end if;

  -- storage: bucket private, policies present (anon: INSERT + removal-window SELECT/DELETE)
  select count(*) into n from storage.buckets
   where id = 'lead-documents' and not public and file_size_limit = 5242880
     and allowed_mime_types = array['image/jpeg', 'application/pdf'];
  if n <> 1 then raise exception 'FAIL: lead-documents bucket config'; end if;
  select count(*) into n from pg_policies
   where schemaname = 'storage' and tablename = 'objects' and policyname like 'lead_documents_%';
  if n <> 6 then raise exception 'FAIL: % of 6 lead-documents storage policies', n; end if;
  -- anon: INSERT (upload helper) + SELECT/DELETE only through the removal helper (Phase 12b)
  select count(*) into n from pg_policies
   where schemaname = 'storage' and tablename = 'objects' and 'anon' = any (roles) and cmd <> 'INSERT'
     and coalesce(qual, '') || coalesce(with_check, '') like '%lead-documents%'
     and not (cmd in ('SELECT', 'DELETE') and qual like '%lead_document_removal_allowed(name)%'
              and with_check is null);
  if n <> 0 then raise exception 'FAIL: anon has a non-INSERT policy on lead-documents objects outside the removal helper'; end if;
  select count(*) into n from pg_policies
   where schemaname = 'storage' and tablename = 'objects' and roles = array['anon']::name[]
     and policyname in ('lead_documents_anon_remove_select', 'lead_documents_anon_remove_delete')
     and qual like '%lead-documents%' and qual like '%lead_document_removal_allowed(name)%';
  if n <> 2 then raise exception 'FAIL: % of 2 anon removal policies (SELECT, DELETE) on lead-documents', n; end if;

  -- ---------------------------------------------------------------- Phase 12b (T12b.1)
  -- removal columns: lead counter (not null, default 0, not writable), removal window (nullable)
  select count(*) into n from information_schema.columns
   where table_schema = 'public'
     and ((table_name = 'leads' and column_name = 'document_removed_count' and data_type = 'integer'
           and is_nullable = 'NO' and column_default = '0')
       or (table_name = 'lead_documents' and column_name = 'removal_expires_at'
           and data_type = 'timestamp with time zone' and is_nullable = 'YES' and column_default is null));
  if n <> 2 then raise exception 'FAIL: % of 2 Phase 12b columns', n; end if;
  if 'document_removed_count' = any (private.lead_writable_fields()) then
    raise exception 'FAIL: document_removed_count is writable by the lead functions';
  end if;
  select count(*) into n from pg_proc p
   where p.oid in ('public.request_lead_document_removal(text, text, uuid)'::regprocedure,
                   'public.finish_lead_document_removal(text, text, uuid)'::regprocedure,
                   'public.register_lead_document(text, text, text, integer)'::regprocedure,
                   'private.lead_document_removal_allowed(text)'::regprocedure)
     and p.prosecdef
     and 'search_path=""' = any (p.proconfig)
     and has_function_privilege('anon', p.oid, 'execute')
     and not exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where a.grantee = 0);
  if n <> 4 then raise exception 'FAIL: % of 4 Phase 12b functions are security definer / search_path '''' / anon-only-by-grant', n; end if;

  -- ---------------------------------------------------------------- Phase 14 offers schema (T14.2)
  select count(*) into n from public.offers where featured is distinct from (featured_audience is not null);
  if n <> 0 then raise exception 'FAIL: % offers with featured out of sync with featured_audience', n; end if;
  select count(*) into n from public.offers where featured and featured_audience <> 'both' and name in ('Edison Luce Fissa 12', 'Plenitude Gas Fisso 12');
  if n <> 0 then raise exception 'FAIL: seed featured offers must be audience both'; end if;
  select count(*) into n from public.offers where iban_required;
  if n <> 0 then raise exception 'FAIL: iban_required must default to false'; end if;
  select count(*) into n from pg_attribute where attrelid = 'public.offers'::regclass and attname = 'locked_months' and not attnotnull;
  if n <> 1 then raise exception 'FAIL: locked_months must be nullable'; end if;
  declare
    v_sup uuid := (select supplier_id from public.offers limit 1);
    ok boolean;
    r  public.offers;
  begin
    -- valid variable luce offer
    insert into public.offers (supplier_id, name, commodity, price_type, energy_price, locked_months, iban_required, featured_audience)
      values (v_sup, 'T14.2 variabile', 'luce', 'variable', 0.01, null, true, 'casa') returning * into r;
    if not r.featured or not r.iban_required then raise exception 'FAIL: variable offer insert / featured sync'; end if;
    update public.offers set featured = false where id = r.id returning * into r;
    if r.featured_audience is not null then raise exception 'FAIL: featured=false must clear the audience'; end if;
    update public.offers set featured = true where id = r.id returning * into r;
    if r.featured_audience <> 'both' then raise exception 'FAIL: featured=true must set audience both'; end if;
    update public.offers set featured_audience = 'business' where id = r.id returning * into r;
    if not r.featured then raise exception 'FAIL: audience set must set featured'; end if;
    delete from public.offers where id = r.id;
    -- old-app style insert: fixed + featured only
    insert into public.offers (supplier_id, name, commodity, energy_price, locked_months, featured)
      values (v_sup, 'T14.2 old app', 'gas', 0.5, 12, true) returning * into r;
    if r.featured_audience <> 'both' or r.price_type <> 'fixed' or r.iban_required then raise exception 'FAIL: old-app insert'; end if;
    delete from public.offers where id = r.id;
    -- rejected combinations
    ok := false; begin insert into public.offers (supplier_id, name, commodity, price_type, energy_price, locked_months) values (v_sup, 'x', 'gas', 'variable', 0.01, null); exception when check_violation then ok := true; end;
    if not ok then raise exception 'FAIL: variable gas must be rejected'; end if;
    ok := false; begin insert into public.offers (supplier_id, name, commodity, price_type, energy_price, locked_months) values (v_sup, 'x', 'luce', 'variable', 0.01, 12); exception when check_violation then ok := true; end;
    if not ok then raise exception 'FAIL: variable with locked_months must be rejected'; end if;
    ok := false; begin insert into public.offers (supplier_id, name, commodity, energy_price, locked_months) values (v_sup, 'x', 'luce', 0.1, null); exception when check_violation then ok := true; end;
    if not ok then raise exception 'FAIL: fixed without locked_months must be rejected'; end if;
    ok := false; begin insert into public.offers (supplier_id, name, commodity, energy_price, locked_months) values (v_sup, 'x', 'luce', 0.1, 121); exception when check_violation then ok := true; end;
    if not ok then raise exception 'FAIL: fixed locked_months 121 must be rejected'; end if;
    ok := false; begin insert into public.offers (supplier_id, name, commodity, price_type, energy_price, locked_months) values (v_sup, 'x', 'luce', 'other', 0.1, 12); exception when check_violation then ok := true; end;
    if not ok then raise exception 'FAIL: unknown price_type must be rejected'; end if;
    ok := false; begin insert into public.offers (supplier_id, name, commodity, energy_price, locked_months, featured_audience) values (v_sup, 'x', 'luce', 0.1, 12, 'all'); exception when check_violation then ok := true; end;
    if not ok then raise exception 'FAIL: unknown featured_audience must be rejected'; end if;
  end;

  raise notice 'ALL DATA CHECKS PASSED';
end $$;
