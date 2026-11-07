-- =====================================================================================
-- Phase 18 (T18.1)  Customer email on the lead.
--
-- Page 1 now collects the customer's email next to the phone. ADDITIVE and backward
-- compatible with the app currently in production (same Supabase project for preview and
-- production): no DROP, no data change, no RLS policy or grant change, existing RPC
-- signatures and results unchanged. Idempotent.
--   * leads.email is NULLABLE and NEVER required by any DB function (complete_lead is not
--     touched): the production app does not send it and old leads stay NULL. Required-ness
--     for new leads is enforced by the application schema only.
--   * `email` joins private.lead_writable_fields(), so create_lead / update_lead /
--     complete_lead accept it through private.apply_lead_patch (trimmed, lower-cased, blank
--     = NULL, like phone). Before this migration those functions reject the key
--     (`invalid_field: email`).
--   * No public-facing function enumerates lead columns (snapshots are offer snapshots), so
--     email is exposed nowhere; anon still has no grant on public.leads.
-- Definitions below are copied from 20261023100000 (latest apply_lead_patch /
-- lead_writable_fields; 20261102100000 does not redefine them) plus the email lines.
-- =====================================================================================

alter table public.leads add column if not exists email text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.leads'::regclass and conname = 'leads_email_format'
  ) then
    alter table public.leads
      add constraint leads_email_format
      check (email is null or (char_length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'));
  end if;
end $$;

comment on column public.leads.email is
  'Customer email (lower-case), collected on page 1 from migration 20261105100000. NULL for older leads; never required by the DB.';

create or replace function private.lead_writable_fields()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'step_reached',
    'commodity', 'customer_type', 'first_name', 'last_name', 'phone', 'email', 'tax_code',
    'company_name', 'vat_number', 'housing_title',
    'comune_istat', 'cap', 'address', 'street_number', 'is_resident',
    'service_type', 'current_supplier_luce', 'current_supplier_gas', 'has_gas',
    'people', 'appliances', 'gas_uses', 'sqm_range', 'estimated_kwh_year', 'estimated_smc_year',
    'manual_consumption', 'final_kwh_month', 'final_smc_month',
    'chosen_offer_luce', 'chosen_offer_gas', 'monthly_cost_shown',
    'pod', 'power_kw', 'voltage', 'pdr',
    'privacy_consent', 'marketing_consent',
    -- Phase 12 (E3 / E4)
    'iban', 'iban_holder_different', 'iban_holder_first_name', 'iban_holder_last_name',
    'iban_holder_tax_code',
    'document_type', 'document_number', 'document_expiry', 'document_issuer'
  ]::text[];
$$;
revoke all on function private.lead_writable_fields() from public, anon, authenticated;

create or replace function private.apply_lead_patch(p_id uuid, p_patch jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_key   text;
  v_input jsonb;
  r       public.leads;
begin
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if octet_length(p_patch::text) > 20000 then
    raise exception 'payload_too_large' using errcode = '22023';
  end if;

  for v_key in select jsonb_object_keys(p_patch) loop
    if not v_key = any (private.lead_writable_fields()) then
      raise exception 'invalid_field: %', v_key using errcode = '22023';
    end if;
  end loop;

  if p_patch ? 'privacy_consent' and (p_patch -> 'privacy_consent') is distinct from 'true'::jsonb then
    raise exception 'privacy_consent_required' using errcode = '22023';
  end if;
  if p_patch ? 'step_reached' and (
       jsonb_typeof(p_patch -> 'step_reached') <> 'string'
       or private.lead_step_rank(p_patch ->> 'step_reached') is null
       or p_patch ->> 'step_reached' = 'completed') then
    raise exception 'invalid_step_reached' using errcode = '22023';
  end if;

  -- JSON null for array columns means "empty".
  v_input := p_patch;
  if v_input -> 'appliances' = 'null'::jsonb then v_input := v_input || '{"appliances": []}'; end if;
  if v_input -> 'gas_uses' = 'null'::jsonb then v_input := v_input || '{"gas_uses": []}'; end if;
  -- Empty date string means "no date" (jsonb_populate_record would reject '').
  if v_input -> 'document_expiry' = '""'::jsonb then v_input := v_input || '{"document_expiry": null}'; end if;

  -- Typed view of the patch (raises on wrong types, e.g. a non-uuid offer id).
  r := jsonb_populate_record(null::public.leads, v_input);

  if p_patch ? 'chosen_offer_luce' and r.chosen_offer_luce is not null and not exists (
       select 1 from public.offers o where o.id = r.chosen_offer_luce and o.commodity = 'luce') then
    raise exception 'invalid_offer' using errcode = '22023';
  end if;
  if p_patch ? 'chosen_offer_gas' and r.chosen_offer_gas is not null and not exists (
       select 1 from public.offers o where o.id = r.chosen_offer_gas and o.commodity = 'gas') then
    raise exception 'invalid_offer' using errcode = '22023';
  end if;

  update public.leads l set
    step_reached          = case when p_patch ? 'step_reached'
                                  and private.lead_step_rank(r.step_reached) > private.lead_step_rank(l.step_reached)
                                 then r.step_reached else l.step_reached end,
    commodity             = case when p_patch ? 'commodity' then nullif(btrim(r.commodity), '') else l.commodity end,
    customer_type         = case when p_patch ? 'customer_type' then nullif(btrim(r.customer_type), '') else l.customer_type end,
    first_name            = case when p_patch ? 'first_name' then nullif(btrim(r.first_name), '') else l.first_name end,
    last_name             = case when p_patch ? 'last_name' then nullif(btrim(r.last_name), '') else l.last_name end,
    phone                 = case when p_patch ? 'phone' then nullif(btrim(r.phone), '') else l.phone end,
    email                 = case when p_patch ? 'email' then lower(nullif(btrim(r.email), '')) else l.email end,
    tax_code              = case when p_patch ? 'tax_code' then upper(nullif(btrim(r.tax_code), '')) else l.tax_code end,
    company_name          = case when p_patch ? 'company_name' then nullif(btrim(r.company_name), '') else l.company_name end,
    vat_number            = case when p_patch ? 'vat_number' then nullif(btrim(r.vat_number), '') else l.vat_number end,
    housing_title         = case when p_patch ? 'housing_title' then nullif(btrim(r.housing_title), '') else l.housing_title end,
    comune_istat          = case when p_patch ? 'comune_istat' then nullif(btrim(r.comune_istat), '') else l.comune_istat end,
    cap                   = case when p_patch ? 'cap' then nullif(btrim(r.cap), '') else l.cap end,
    address               = case when p_patch ? 'address' then nullif(btrim(r.address), '') else l.address end,
    street_number         = case when p_patch ? 'street_number' then nullif(btrim(r.street_number), '') else l.street_number end,
    is_resident           = case when p_patch ? 'is_resident' then r.is_resident else l.is_resident end,
    service_type          = case when p_patch ? 'service_type' then nullif(btrim(r.service_type), '') else l.service_type end,
    current_supplier_luce = case when p_patch ? 'current_supplier_luce' then r.current_supplier_luce else l.current_supplier_luce end,
    current_supplier_gas  = case when p_patch ? 'current_supplier_gas' then r.current_supplier_gas else l.current_supplier_gas end,
    has_gas               = case when p_patch ? 'has_gas' then r.has_gas else l.has_gas end,
    people                = case when p_patch ? 'people' then r.people else l.people end,
    appliances            = case when p_patch ? 'appliances' then coalesce(r.appliances, '{}') else l.appliances end,
    gas_uses              = case when p_patch ? 'gas_uses' then coalesce(r.gas_uses, '{}') else l.gas_uses end,
    sqm_range             = case when p_patch ? 'sqm_range' then nullif(btrim(r.sqm_range), '') else l.sqm_range end,
    estimated_kwh_year    = case when p_patch ? 'estimated_kwh_year' then r.estimated_kwh_year else l.estimated_kwh_year end,
    estimated_smc_year    = case when p_patch ? 'estimated_smc_year' then r.estimated_smc_year else l.estimated_smc_year end,
    manual_consumption    = case when p_patch ? 'manual_consumption' then r.manual_consumption else l.manual_consumption end,
    final_kwh_month       = case when p_patch ? 'final_kwh_month' then r.final_kwh_month else l.final_kwh_month end,
    final_smc_month       = case when p_patch ? 'final_smc_month' then r.final_smc_month else l.final_smc_month end,
    chosen_offer_luce     = case when p_patch ? 'chosen_offer_luce' then r.chosen_offer_luce else l.chosen_offer_luce end,
    chosen_offer_gas      = case when p_patch ? 'chosen_offer_gas' then r.chosen_offer_gas else l.chosen_offer_gas end,
    monthly_cost_shown    = case when p_patch ? 'monthly_cost_shown' then r.monthly_cost_shown else l.monthly_cost_shown end,
    pod                   = case when p_patch ? 'pod' then upper(nullif(btrim(r.pod), '')) else l.pod end,
    power_kw              = case when p_patch ? 'power_kw' then r.power_kw else l.power_kw end,
    voltage               = case when p_patch ? 'voltage' then r.voltage else l.voltage end,
    pdr                   = case when p_patch ? 'pdr' then nullif(btrim(r.pdr), '') else l.pdr end,
    marketing_consent     = case when p_patch ? 'marketing_consent' then r.marketing_consent else l.marketing_consent end,
    -- Phase 12 (E3 / E4)
    iban                   = case when p_patch ? 'iban'
                                  then upper(nullif(regexp_replace(r.iban, '\s+', '', 'g'), '')) else l.iban end,
    iban_holder_different  = case when p_patch ? 'iban_holder_different' then r.iban_holder_different else l.iban_holder_different end,
    iban_holder_first_name = case when p_patch ? 'iban_holder_first_name' then nullif(btrim(r.iban_holder_first_name), '') else l.iban_holder_first_name end,
    iban_holder_last_name  = case when p_patch ? 'iban_holder_last_name' then nullif(btrim(r.iban_holder_last_name), '') else l.iban_holder_last_name end,
    iban_holder_tax_code   = case when p_patch ? 'iban_holder_tax_code' then upper(nullif(btrim(r.iban_holder_tax_code), '')) else l.iban_holder_tax_code end,
    document_type          = case when p_patch ? 'document_type' then nullif(btrim(r.document_type), '') else l.document_type end,
    document_number        = case when p_patch ? 'document_number'
                                  then upper(nullif(regexp_replace(r.document_number, '\s+', '', 'g'), '')) else l.document_number end,
    document_expiry        = case when p_patch ? 'document_expiry' then r.document_expiry else l.document_expiry end,
    document_issuer        = case when p_patch ? 'document_issuer' then nullif(btrim(r.document_issuer), '') else l.document_issuer end
  where l.id = p_id;
end;
$$;
revoke all on function private.apply_lead_patch(uuid, jsonb) from public, anon, authenticated;
