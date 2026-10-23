-- =====================================================================================
-- Phase 12 (E2, E3, E4; T12.1)  Activation data (IBAN, identity document), callback number,
-- identity-document uploads.
--
-- ADDITIVE and backward compatible with the app currently in production (same Supabase
-- project for preview and production): no DROP of any object, no data change, existing
-- RPC signatures unchanged and their results only gain keys. Idempotent (if not exists /
-- create or replace / policies created only when missing).
--   * the production app never sends the new lead keys -> lead functions behave as before;
--   * complete_lead keeps (p_secret, p_token, p_data) and returns {id, token,
--     notification_email, callback_phone} (one extra key, ignored by the old app);
--   * settings.callback_phone is NOT NULL with a constant default: the old upsert
--     {id, notification_email} keeps working.
--
-- 1. public.leads, new nullable columns (written by the customer flow through the existing
--    lead functions; added to private.lead_writable_fields()):
--      iban                    text   normalized: spaces removed, upper case;
--                                     ^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$ (mod-97 in the app)
--      iban_holder_different   bool   account holder differs from the lead holder
--      iban_holder_first_name  text   1..100
--      iban_holder_last_name   text   1..100
--      iban_holder_tax_code    text   upper case, personal codice fiscale format
--                                     (check char + name consistency in the app)
--      document_type           text   carta_identita | patente | passaporto
--      document_number         text   spaces removed, upper case, ^[A-Z0-9/-]{4,30}$
--      document_expiry         date   2000-01-01..2100-12-31 ("not in the past" in the app)
--      document_issuer         text   2..120
-- 2. public.settings.callback_phone (default '+39 095 0000000', digits / spaces / leading +,
--    6..20 chars). settings stays admin-only. Public exposure of THIS value only:
--      - public.get_callback_phone() -> text  (anon, no secret: the number is shown to every
--        customer on the thank-you page anyway; SECURITY DEFINER, returns one column only);
--      - complete_lead(...) also returns it as "callback_phone".
-- 3. Identity documents: private Storage bucket "lead-documents" (public = false, 5 MiB,
--    image/jpeg + application/pdf) + table public.lead_documents (one row per issued upload
--    slot). Upload flow WITHOUT a service-role key (server route, publishable key, anon role):
--      a. register_lead_document(p_secret, p_token, p_mime_type, p_size_bytes)
--           -> {id, lead_id, path, bucket, expires_at}
--         checks the server secret, the IN-PROGRESS lead owning the token, type and size,
--         max 2 documents per lead (uploaded + still-valid pending slots) and max 20 slots
--         per lead in total (abuse cap); issues a one-time unguessable object name
--         "<lead_id>/<32 random hex>.(jpg|pdf)" valid for 5 minutes;
--      b. the server uploads the bytes to exactly that name with the anon client
--         (upsert = false). The ONLY anon policy on storage.objects is an INSERT policy that
--         accepts a name only while its slot is pending, not expired and its lead is in
--         progress (private.lead_document_upload_allowed). The unique (bucket_id, name)
--         key makes every name single-use; anon has no SELECT / UPDATE / DELETE;
--      c. confirm_lead_document(p_secret, p_token, p_document_id) marks the slot "uploaded"
--         (after which the INSERT policy refuses the name as well).
--    Admin (is_admin + MFA rule): SELECT on lead_documents and on the bucket objects
--    (signed URLs, listing) and DELETE on the bucket objects. Lead rows cascade to
--    lead_documents; the files are removed by the app (Storage API, admin session) because
--    Supabase forbids direct SQL deletes on storage.objects.
-- =====================================================================================

create schema if not exists private;
revoke all on schema private from public;

-- -------------------------------------------------------------------------------------
-- 1. Lead columns (nullable, no default: instant ADD COLUMN)
-- -------------------------------------------------------------------------------------
alter table public.leads
  add column if not exists iban text
    constraint leads_iban_format
    check (iban is null or iban ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$'),
  add column if not exists iban_holder_different boolean,
  add column if not exists iban_holder_first_name text
    constraint leads_iban_holder_first_name_len
    check (iban_holder_first_name is null or char_length(iban_holder_first_name) between 1 and 100),
  add column if not exists iban_holder_last_name text
    constraint leads_iban_holder_last_name_len
    check (iban_holder_last_name is null or char_length(iban_holder_last_name) between 1 and 100),
  add column if not exists iban_holder_tax_code text
    constraint leads_iban_holder_tax_code_format
    check (iban_holder_tax_code is null or iban_holder_tax_code ~
           '^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$'),
  add column if not exists document_type text
    constraint leads_document_type_values
    check (document_type is null or document_type in ('carta_identita', 'patente', 'passaporto')),
  add column if not exists document_number text
    constraint leads_document_number_format
    check (document_number is null or document_number ~ '^[A-Z0-9/-]{4,30}$'),
  add column if not exists document_expiry date
    constraint leads_document_expiry_range
    check (document_expiry is null or document_expiry between date '2000-01-01' and date '2100-12-31'),
  add column if not exists document_issuer text
    constraint leads_document_issuer_len
    check (document_issuer is null or char_length(document_issuer) between 2 and 120);

comment on column public.leads.iban is 'Optional IBAN for direct debit (step B). Upper case, no spaces. Mod-97 validated by the app.';
comment on column public.leads.iban_holder_different is 'True when the bank account holder is not the lead holder (then iban_holder_* are set).';
comment on column public.leads.iban_holder_tax_code is 'Codice fiscale of the bank account holder (format checked here, check char + name consistency by the app).';
comment on column public.leads.document_type is 'Optional identity document: carta_identita | patente | passaporto.';
comment on column public.leads.document_expiry is 'Identity document expiry date (the app rejects past dates).';

-- -------------------------------------------------------------------------------------
-- Lead functions: writable fields + patch application gain the new columns.
-- Same signatures, same behaviour for every existing key.
-- -------------------------------------------------------------------------------------
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

-- -------------------------------------------------------------------------------------
-- 2. Callback number (settings stays admin-only)
-- -------------------------------------------------------------------------------------
alter table public.settings
  add column if not exists callback_phone text not null default '+39 095 0000000'
    constraint settings_callback_phone_format
    check (char_length(callback_phone) between 6 and 20 and callback_phone ~ '^\+?[0-9][0-9 ]*$');
comment on column public.settings.callback_phone is
  'Number the consultant calls from ("Numero da cui chiamiamo"), shown on the thank-you page. Public read only through get_callback_phone() / complete_lead.';

-- get_callback_phone() -> text: the only settings value readable without an admin session.
create or replace function public.get_callback_phone()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select s.callback_phone from public.settings s where s.id;
$$;
comment on function public.get_callback_phone() is
  'Public: the callback number shown on the thank-you page (settings.callback_phone). Nothing else from settings is exposed.';
revoke all on function public.get_callback_phone() from public, anon, authenticated;
grant execute on function public.get_callback_phone() to anon, authenticated;

-- complete_lead: same signature and checks; the result also carries callback_phone.
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
  v_phone text;
begin
  perform private.check_lead_secret(p_secret);
  v_id := private.lock_lead_by_token(p_token);
  perform private.apply_lead_patch(v_id, coalesce(p_data, '{}'::jsonb));

  select * into v_lead from public.leads where id = v_id;

  -- Required on completion (PRD §6, §10). POD/PDR/power/voltage depend on the service type
  -- per commodity and are validated by the application. IBAN / document data are optional.
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

  select s.notification_email, s.callback_phone into v_email, v_phone from public.settings s where s.id;

  return jsonb_build_object('id', v_lead.id, 'token', v_lead.token,
                            'notification_email', v_email, 'callback_phone', v_phone);
end;
$$;
comment on function public.complete_lead(text, text, jsonb) is
  'Server only (LEAD_API_SECRET): final submit; lead becomes completed (read-only). Returns {id, token, notification_email, callback_phone}.';
revoke all on function public.complete_lead(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.complete_lead(text, text, jsonb) to anon, authenticated;

-- -------------------------------------------------------------------------------------
-- 3. Identity documents
-- -------------------------------------------------------------------------------------
create table if not exists public.lead_documents (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads (id) on update cascade on delete cascade,
  -- Storage object name in bucket "lead-documents": "<lead_id>/<32 random hex>.(jpg|pdf)"
  object_path text not null unique
              check (object_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{32}\.(jpg|pdf)$'),
  mime_type   text not null check (mime_type in ('image/jpeg', 'application/pdf')),
  size_bytes  integer not null check (size_bytes between 1 and 5242880),
  status      text not null default 'pending' check (status in ('pending', 'uploaded')),
  created_at  timestamptz not null default now(),
  -- End of the upload window of a pending slot.
  expires_at  timestamptz not null,
  uploaded_at timestamptz,
  constraint lead_documents_path_in_lead_folder check (split_part(object_path, '/', 1) = lead_id::text),
  constraint lead_documents_extension_matches_type check (
    (mime_type = 'image/jpeg' and object_path like '%.jpg') or (mime_type = 'application/pdf' and object_path like '%.pdf')),
  constraint lead_documents_uploaded_at_consistent check ((status = 'uploaded') = (uploaded_at is not null))
);
comment on table public.lead_documents is
  'Identity-document upload slots / files of a lead (Storage bucket lead-documents). anon: no access (register_lead_document / confirm_lead_document). Admin: read only; rows cascade with the lead, files are removed by the app.';
create index if not exists lead_documents_lead_idx on public.lead_documents (lead_id, created_at);

alter table public.lead_documents enable row level security;
revoke all on public.lead_documents from public, anon, authenticated;
grant select on public.lead_documents to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'lead_documents'
                  and policyname = 'lead_documents_admin_select') then
    create policy lead_documents_admin_select on public.lead_documents
      for select to authenticated
      using ((select public.is_admin()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'lead_documents'
                  and policyname = 'lead_documents_require_mfa') then
    create policy lead_documents_require_mfa on public.lead_documents as restrictive
      for all to authenticated
      using ((select private.mfa_satisfied())) with check ((select private.mfa_satisfied()));
  end if;
end
$$;

-- Bucket: private, 5 MiB, JPEG + PDF only (enforced by the Storage API).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lead-documents', 'lead-documents', false, 5242880, array['image/jpeg', 'application/pdf'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- True only for the object name of a PENDING, non-expired slot of an IN-PROGRESS lead.
-- Used by the anon INSERT policy on storage.objects (anon cannot read lead_documents).
create or replace function private.lead_document_upload_allowed(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.lead_documents d
      join public.leads l on l.id = d.lead_id
     where d.object_path = p_name
       and d.status = 'pending'
       and d.expires_at > now()
       and l.step_reached <> 'completed');
$$;
comment on function private.lead_document_upload_allowed(text) is
  'Storage INSERT policy helper (bucket lead-documents): the object name belongs to a pending, unexpired upload slot of an in-progress lead.';
alter function private.lead_document_upload_allowed(text) owner to postgres;
revoke all on function private.lead_document_upload_allowed(text) from public, anon, authenticated;
-- The policy runs as the caller: anon needs USAGE on `private` (not exposed by PostgREST;
-- every other private function / table has all privileges revoked from anon) + EXECUTE.
grant usage on schema private to anon;
grant execute on function private.lead_document_upload_allowed(text) to anon;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                  and policyname = 'lead_documents_anon_insert') then
    create policy lead_documents_anon_insert on storage.objects for insert to anon
      with check (bucket_id = 'lead-documents' and private.lead_document_upload_allowed(name));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                  and policyname = 'lead_documents_admin_select') then
    create policy lead_documents_admin_select on storage.objects for select to authenticated
      using (bucket_id = 'lead-documents' and (select public.is_admin()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                  and policyname = 'lead_documents_admin_delete') then
    create policy lead_documents_admin_delete on storage.objects for delete to authenticated
      using (bucket_id = 'lead-documents' and (select public.is_admin()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                  and policyname = 'lead_documents_require_mfa') then
    create policy lead_documents_require_mfa on storage.objects as restrictive for all to authenticated
      using (bucket_id <> 'lead-documents' or (select private.mfa_satisfied()))
      with check (bucket_id <> 'lead-documents' or (select private.mfa_satisfied()));
  end if;
end
$$;

-- register_lead_document(p_secret, p_token, p_mime_type, p_size_bytes)
--   -> {"id", "lead_id", "path", "bucket", "expires_at"}
-- Errors: invalid_secret (28000), lead_not_found (P0002), invalid_document (22023),
--         document_limit_reached (22023).
create or replace function public.register_lead_document(
  p_secret text, p_token text, p_mime_type text, p_size_bytes integer)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_lead    uuid;
  v_id      uuid;
  v_path    text;
  v_expires timestamptz := now() + interval '5 minutes';
  v_active  integer;
  v_total   integer;
begin
  perform private.check_lead_secret(p_secret);
  v_lead := private.lock_lead_by_token(p_token);  -- row lock: serializes slots of one lead

  if p_mime_type is null or p_mime_type not in ('image/jpeg', 'application/pdf')
     or p_size_bytes is null or p_size_bytes not between 1 and 5242880 then
    raise exception 'invalid_document' using errcode = '22023';
  end if;

  select count(*) filter (where d.status = 'uploaded' or d.expires_at > now()),
         count(*)
    into v_active, v_total
    from public.lead_documents d
   where d.lead_id = v_lead;
  -- Max 2 documents per lead; max 20 issued slots per lead (expired ones included).
  if v_active >= 2 or v_total >= 20 then
    raise exception 'document_limit_reached' using errcode = '22023';
  end if;

  v_path := v_lead::text || '/' || encode(extensions.gen_random_bytes(16), 'hex')
            || case p_mime_type when 'image/jpeg' then '.jpg' else '.pdf' end;

  insert into public.lead_documents (lead_id, object_path, mime_type, size_bytes, status, expires_at)
  values (v_lead, v_path, p_mime_type, p_size_bytes, 'pending', v_expires)
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'lead_id', v_lead, 'path', v_path,
                            'bucket', 'lead-documents', 'expires_at', v_expires);
end;
$$;
comment on function public.register_lead_document(text, text, text, integer) is
  'Server only (LEAD_API_SECRET): issue a one-time, 5-minute upload slot in bucket lead-documents for the in-progress lead owning the token (max 2 documents). Returns {id, lead_id, path, bucket, expires_at}.';

-- confirm_lead_document(p_secret, p_token, p_document_id)
--   -> {"id", "lead_id", "mime_type", "size_bytes", "created_at"}
-- Called by the server right after a successful upload. Errors: invalid_secret,
-- lead_not_found, document_not_found (P0002), document_limit_reached.
create or replace function public.confirm_lead_document(p_secret text, p_token text, p_document_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_lead uuid;
  v_doc  public.lead_documents;
begin
  perform private.check_lead_secret(p_secret);
  v_lead := private.lock_lead_by_token(p_token);

  select * into v_doc
    from public.lead_documents d
   where d.id = p_document_id and d.lead_id = v_lead and d.status = 'pending';
  if v_doc.id is null then
    raise exception 'document_not_found' using errcode = 'P0002';
  end if;
  -- A slot that expired before confirmation could otherwise exceed the limit.
  if (select count(*) from public.lead_documents d where d.lead_id = v_lead and d.status = 'uploaded') >= 2 then
    raise exception 'document_limit_reached' using errcode = '22023';
  end if;

  update public.lead_documents d
     set status = 'uploaded', uploaded_at = now()
   where d.id = v_doc.id
  returning * into v_doc;

  return jsonb_build_object('id', v_doc.id, 'lead_id', v_doc.lead_id, 'mime_type', v_doc.mime_type,
                            'size_bytes', v_doc.size_bytes, 'created_at', v_doc.created_at);
end;
$$;
comment on function public.confirm_lead_document(text, text, uuid) is
  'Server only (LEAD_API_SECRET): mark an upload slot of the in-progress lead owning the token as uploaded (the name can no longer be written).';

revoke all on function public.register_lead_document(text, text, text, integer) from public, anon, authenticated;
revoke all on function public.confirm_lead_document(text, text, uuid) from public, anon, authenticated;
grant execute on function public.register_lead_document(text, text, text, integer) to anon, authenticated;
grant execute on function public.confirm_lead_document(text, text, uuid) to anon, authenticated;
