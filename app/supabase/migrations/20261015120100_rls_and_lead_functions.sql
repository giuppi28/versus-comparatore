-- =====================================================================================
-- T1.2  Row Level Security, admin helper, lead functions, grants (PRD §4, CLAUDE.md)
--
-- Access model (no service role key exists for the app):
--   anon           read active suppliers, active offers of active suppliers, comuni.
--                  Leads only through create_lead / update_lead / complete_lead
--                  (SECURITY DEFINER, token-scoped). No direct privilege on leads.
--   authenticated  admin (row in public.admins) -> full access via RLS.
--                  A non-admin authenticated user gets the same visibility as anon.
-- Public sign-up must be DISABLED in Supabase Auth settings (dashboard).
-- =====================================================================================

-- Internal helpers live in a schema that PostgREST does not expose.
create schema if not exists private;
revoke all on schema private from public;

-- -------------------------------------------------------------------------------------
-- is_admin(): true when the caller's auth.uid() is in public.admins
-- -------------------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()));
$$;
comment on function public.is_admin() is 'True when the current Supabase Auth user is an admin (public.admins).';

-- -------------------------------------------------------------------------------------
-- MFA enforcement (Supabase documented pattern): a user who has a VERIFIED TOTP factor
-- must use an aal2 session. Users without a verified factor are unaffected (MFA optional).
-- SECURITY DEFINER because `authenticated` cannot read auth.mfa_factors directly.
-- -------------------------------------------------------------------------------------
create or replace function private.mfa_satisfied()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
      or not exists (
           select 1 from auth.mfa_factors f
            where f.user_id = (select auth.uid()) and f.status = 'verified');
$$;
grant usage on schema private to authenticated;

-- -------------------------------------------------------------------------------------
-- Enable RLS everywhere
-- -------------------------------------------------------------------------------------
alter table public.suppliers enable row level security;
alter table public.offers    enable row level security;
alter table public.comuni    enable row level security;
alter table public.leads     enable row level security;
alter table public.settings  enable row level security;
alter table public.admins    enable row level security;

-- suppliers -------------------------------------------------------------------------
create policy suppliers_public_read on public.suppliers
  for select to anon, authenticated
  using (active);
create policy suppliers_admin_all on public.suppliers
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- offers ----------------------------------------------------------------------------
create policy offers_public_read on public.offers
  for select to anon, authenticated
  using (
    active
    and exists (select 1 from public.suppliers s where s.id = offers.supplier_id and s.active)
  );
create policy offers_admin_all on public.offers
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- comuni ----------------------------------------------------------------------------
create policy comuni_public_read on public.comuni
  for select to anon, authenticated
  using (true);
create policy comuni_admin_all on public.comuni
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- leads: admin only (anon has no privilege at all) -----------------------------------
create policy leads_admin_all on public.leads
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- settings: admin only --------------------------------------------------------------
create policy settings_admin_all on public.settings
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- admins: a signed-in user can see only their own row; no API writes ------------------
create policy admins_read_own on public.admins
  for select to authenticated
  using (user_id = (select auth.uid()));

-- MFA: RESTRICTIVE policies (AND-ed with the permissive ones above) for signed-in users.
create policy suppliers_require_mfa on public.suppliers as restrictive for all to authenticated
  using ((select private.mfa_satisfied())) with check ((select private.mfa_satisfied()));
create policy offers_require_mfa on public.offers as restrictive for all to authenticated
  using ((select private.mfa_satisfied())) with check ((select private.mfa_satisfied()));
create policy comuni_require_mfa on public.comuni as restrictive for all to authenticated
  using ((select private.mfa_satisfied())) with check ((select private.mfa_satisfied()));
create policy leads_require_mfa on public.leads as restrictive for all to authenticated
  using ((select private.mfa_satisfied())) with check ((select private.mfa_satisfied()));
create policy settings_require_mfa on public.settings as restrictive for all to authenticated
  using ((select private.mfa_satisfied())) with check ((select private.mfa_satisfied()));
create policy admins_require_mfa on public.admins as restrictive for all to authenticated
  using ((select private.mfa_satisfied())) with check ((select private.mfa_satisfied()));

-- -------------------------------------------------------------------------------------
-- Table privileges (defense in depth on top of RLS; Supabase grants ALL by default)
-- -------------------------------------------------------------------------------------
revoke all on public.leads, public.settings, public.admins from anon;
revoke all on public.suppliers, public.offers, public.comuni from anon;
grant select on public.suppliers, public.offers, public.comuni to anon;

revoke all on public.suppliers, public.offers, public.comuni, public.leads, public.settings, public.admins
  from authenticated;
grant select, insert, update, delete on public.suppliers, public.offers, public.comuni, public.leads, public.settings
  to authenticated;
grant select on public.admins to authenticated;

-- -------------------------------------------------------------------------------------
-- Lead functions
-- -------------------------------------------------------------------------------------

-- Fields the customer flow may write. status / notes / token / id / timestamps are excluded.
create or replace function private.lead_writable_fields()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'step_reached',
    'commodity', 'customer_type', 'first_name', 'last_name', 'phone', 'tax_code',
    'company_name', 'vat_number', 'housing_title',
    'comune_istat', 'cap', 'address', 'street_number', 'is_resident',
    'service_type', 'current_supplier_luce', 'current_supplier_gas', 'has_gas',
    'people', 'appliances', 'gas_uses', 'sqm_range', 'estimated_kwh_year', 'estimated_smc_year',
    'manual_consumption', 'final_kwh_month', 'final_smc_month',
    'chosen_offer_luce', 'chosen_offer_gas', 'monthly_cost_shown',
    'pod', 'power_kw', 'voltage', 'pdr',
    'privacy_consent', 'marketing_consent'
  ]::text[];
$$;

create or replace function private.lead_step_rank(p_step text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_step
    when 'page1' then 1 when 'results' then 2 when 'offer_chosen' then 3 when 'completed' then 4
  end;
$$;

-- Applies a validated JSON patch to lead p_id (caller holds the row lock).
-- Only keys present in p_patch are written. Empty strings become NULL.
-- step_reached only moves forward; 'completed' is reserved to complete_lead.
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
    marketing_consent     = case when p_patch ? 'marketing_consent' then r.marketing_consent else l.marketing_consent end
  where l.id = p_id;
end;
$$;

-- Locks and returns the id of the IN-PROGRESS lead owning p_token, or raises lead_not_found.
create or replace function private.lock_lead_by_token(p_token text)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'lead_not_found' using errcode = 'P0002';
  end if;
  select l.id into v_id
    from public.leads l
   where l.token = p_token and l.step_reached <> 'completed'
   for update;
  if v_id is null then
    raise exception 'lead_not_found' using errcode = 'P0002';
  end if;
  return v_id;
end;
$$;

-- create_lead(p_data) -> {"id": uuid, "token": text}
-- Called on Page 1 privacy consent. p_data.privacy_consent must be true.
create or replace function public.create_lead(p_data jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id    uuid;
  v_token text;
begin
  if p_data is null or jsonb_typeof(p_data) <> 'object'
     or (p_data -> 'privacy_consent') is distinct from 'true'::jsonb then
    raise exception 'privacy_consent_required' using errcode = '22023';
  end if;

  insert into public.leads (privacy_consent, step_reached, status)
  values (true, 'page1', 'new')
  returning id, token into v_id, v_token;

  perform private.apply_lead_patch(v_id, p_data);

  return jsonb_build_object('id', v_id, 'token', v_token);
end;
$$;
comment on function public.create_lead(jsonb) is 'anon: create a lead (privacy consent required). Returns {id, token}.';

-- update_lead(p_token, p_patch): updates only the in-progress lead owning the token.
create or replace function public.update_lead(p_token text, p_patch jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  v_id := private.lock_lead_by_token(p_token);
  perform private.apply_lead_patch(v_id, p_patch);
end;
$$;
comment on function public.update_lead(text, jsonb) is 'anon: patch the in-progress lead owning the token. Raises lead_not_found.';

-- complete_lead(p_token, p_data) -> {"id": uuid, "token": text}
-- Final submit: writes p_data, checks required fields (PRD §10), step_reached = completed, status = new.
create or replace function public.complete_lead(p_token text, p_data jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id    uuid;
  v_lead  public.leads;
  v_field text;
begin
  v_id := private.lock_lead_by_token(p_token);
  perform private.apply_lead_patch(v_id, coalesce(p_data, '{}'::jsonb));

  select * into v_lead from public.leads where id = v_id;

  -- Required on completion (PRD §6, §10). POD/PDR/power/voltage depend on the service type
  -- per commodity and are validated by the application.
  v_field := case
    when v_lead.commodity is null then 'commodity'
    when v_lead.customer_type is null then 'customer_type'
    when v_lead.first_name is null then 'first_name'
    when v_lead.last_name is null then 'last_name'
    when v_lead.phone is null then 'phone'
    when v_lead.tax_code is null then 'tax_code'
    when v_lead.customer_type = 'business' and v_lead.company_name is null then 'company_name'
    when v_lead.customer_type = 'business' and v_lead.vat_number is null then 'vat_number'
    when v_lead.housing_title is null then 'housing_title'
    when v_lead.comune_istat is null then 'comune_istat'
    when v_lead.cap is null then 'cap'
    when v_lead.address is null then 'address'
    when v_lead.street_number is null then 'street_number'
    when v_lead.is_resident is null then 'is_resident'
    when v_lead.service_type is null then 'service_type'
    when v_lead.commodity in ('luce', 'dual') and v_lead.chosen_offer_luce is null then 'chosen_offer_luce'
    when v_lead.commodity in ('gas', 'dual') and v_lead.chosen_offer_gas is null then 'chosen_offer_gas'
  end;
  if v_field is not null then
    raise exception 'missing_field: %', v_field using errcode = '22023';
  end if;

  update public.leads
     set step_reached = 'completed', status = 'new'
   where id = v_id;

  return jsonb_build_object('id', v_lead.id, 'token', v_lead.token);
end;
$$;
comment on function public.complete_lead(text, jsonb) is 'anon: final submit; lead becomes completed (read-only for anon). Returns {id, token}.';

-- -------------------------------------------------------------------------------------
-- Function privileges: nothing executable by default; then the explicit allow-list.
-- -------------------------------------------------------------------------------------
revoke all on function public.is_admin() from public, anon, authenticated;
revoke all on function public.create_lead(jsonb) from public, anon, authenticated;
revoke all on function public.update_lead(text, jsonb) from public, anon, authenticated;
revoke all on function public.complete_lead(text, jsonb) from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function private.lead_writable_fields() from public, anon, authenticated;
revoke all on function private.lead_step_rank(text) from public, anon, authenticated;
revoke all on function private.apply_lead_patch(uuid, jsonb) from public, anon, authenticated;
revoke all on function private.lock_lead_by_token(text) from public, anon, authenticated;
revoke all on function private.mfa_satisfied() from public, anon, authenticated;
grant execute on function private.mfa_satisfied() to authenticated;

grant execute on function public.create_lead(jsonb) to anon, authenticated;
grant execute on function public.update_lead(text, jsonb) to anon, authenticated;
grant execute on function public.complete_lead(text, jsonb) to anon, authenticated;
grant execute on function public.is_admin() to authenticated;
-- normalize_search is pure; it backs comuni.name_search (evaluated on admin writes).
grant execute on function public.normalize_search(text) to anon, authenticated;
