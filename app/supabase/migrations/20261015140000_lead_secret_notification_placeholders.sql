-- =====================================================================================
-- T8.2  Reviewer follow-ups Q6 + Q7 + Q8 (one migration, QUESTIONS.md)
--
-- Q6  Lead functions require a server-only shared secret (LEAD_API_SECRET, 32 random
--     bytes hex, kept in app/.env.local / hosting secrets). The DB stores ONLY its SHA-256
--     in private.app_secrets (no grants to anon/authenticated). create_lead / update_lead /
--     complete_lead get `p_secret text` as FIRST parameter and raise 'invalid_secret'
--     when sha256(p_secret) does not match. The old signatures are DROPPED: the app must be
--     updated and deployed together with this migration.
-- Q7  complete_lead returns {id, token, notification_email} (settings.notification_email,
--     may be null) — only on successful completion.
-- Q8  suppliers.is_placeholder (the special "Fornitore attuale" options: tutela,
--     altro-fornitore, non-lo-so).
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- Q8: placeholder suppliers
-- -------------------------------------------------------------------------------------
alter table public.suppliers add column if not exists is_placeholder boolean not null default false;
comment on column public.suppliers.is_placeholder is
  'Special "Fornitore attuale" dropdown option (Tutela / Altro fornitore / Non lo so): never has offers; hidden from admin offer-supplier selects and the loading orbit.';
update public.suppliers set is_placeholder = true
 where slug in ('tutela', 'altro-fornitore', 'non-lo-so') and not is_placeholder;

-- -------------------------------------------------------------------------------------
-- Q6: hashed server secret
-- -------------------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;

create table if not exists private.app_secrets (
  name   text primary key check (name ~ '^[a-z0-9_]+$'),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$')
);
comment on table private.app_secrets is 'SHA-256 (hex) of server-only secrets. Never the plaintext. No API access.';
alter table private.app_secrets enable row level security;  -- no policies: defense in depth
revoke all on private.app_secrets from public, anon, authenticated;

-- SHA-256 of LEAD_API_SECRET (the plaintext exists only in the server environment).
-- To rotate: generate a new secret, update this row with its SHA-256, redeploy the app.
insert into private.app_secrets (name, sha256)
values ('lead_api_secret', '6801e26a9d0798de4b360360b6c8d7495e028557ba3d7cc50ab12cf9037e2589')
on conflict (name) do update set sha256 = excluded.sha256;

-- Raises invalid_secret unless sha256(p_secret) matches. Fails closed when the row is missing.
-- Compares fixed-length digests, so timing reveals nothing useful about the secret.
create or replace function private.check_lead_secret(p_secret text)
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  v_expected text;
begin
  select s.sha256 into v_expected from private.app_secrets s where s.name = 'lead_api_secret';
  if v_expected is null
     or p_secret is null
     or octet_length(p_secret) > 256
     or encode(extensions.digest(p_secret, 'sha256'), 'hex') <> v_expected then
    raise exception 'invalid_secret' using errcode = '28000';
  end if;
end;
$$;
revoke all on function private.check_lead_secret(text) from public, anon, authenticated;

-- -------------------------------------------------------------------------------------
-- Lead functions: drop old signatures, recreate with p_secret first
-- -------------------------------------------------------------------------------------
drop function if exists public.create_lead(jsonb);
drop function if exists public.update_lead(text, jsonb);
drop function if exists public.complete_lead(text, jsonb);

-- create_lead(p_secret, p_data) -> {"id": uuid, "token": text}
create or replace function public.create_lead(p_secret text, p_data jsonb)
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
  perform private.check_lead_secret(p_secret);

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
comment on function public.create_lead(text, jsonb) is
  'Server only (LEAD_API_SECRET): create a lead (privacy consent required). Returns {id, token}.';

-- update_lead(p_secret, p_token, p_patch): updates only the in-progress lead owning the token.
create or replace function public.update_lead(p_secret text, p_token text, p_patch jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform private.check_lead_secret(p_secret);
  v_id := private.lock_lead_by_token(p_token);
  perform private.apply_lead_patch(v_id, p_patch);
end;
$$;
comment on function public.update_lead(text, text, jsonb) is
  'Server only (LEAD_API_SECRET): patch the in-progress lead owning the token. Raises lead_not_found.';

-- complete_lead(p_secret, p_token, p_data) -> {"id": uuid, "token": text, "notification_email": text|null}
-- Final submit: writes p_data, checks required fields (PRD §10), step_reached = completed,
-- status = new. notification_email = settings.notification_email (Q7), returned only here.
create or replace function public.complete_lead(p_secret text, p_token text, p_data jsonb)
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
  v_email text;
begin
  perform private.check_lead_secret(p_secret);
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

  select s.notification_email into v_email from public.settings s where s.id;

  return jsonb_build_object('id', v_lead.id, 'token', v_lead.token, 'notification_email', v_email);
end;
$$;
comment on function public.complete_lead(text, text, jsonb) is
  'Server only (LEAD_API_SECRET): final submit; lead becomes completed (read-only). Returns {id, token, notification_email}.';

-- -------------------------------------------------------------------------------------
-- Function privileges (Supabase default privileges grant EXECUTE on new public functions)
-- -------------------------------------------------------------------------------------
revoke all on function public.create_lead(text, jsonb) from public, anon, authenticated;
revoke all on function public.update_lead(text, text, jsonb) from public, anon, authenticated;
revoke all on function public.complete_lead(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_lead(text, jsonb) to anon, authenticated;
grant execute on function public.update_lead(text, text, jsonb) to anon, authenticated;
grant execute on function public.complete_lead(text, text, jsonb) to anon, authenticated;
