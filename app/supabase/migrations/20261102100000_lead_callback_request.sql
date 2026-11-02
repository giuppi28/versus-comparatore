-- =====================================================================================
-- Phase 15 (T15.1, SPEC decision #28)  Explicit callback request ("Richiamami").
--
-- Art. 51 c.8-bis Codice del consumo: calls about luce / gas contracts are allowed only on
-- the consumer's request, and the caller must be able to prove it. The step B submit button
-- ("Richiamami") is that request; this migration records it on the lead.
--
-- ADDITIVE and backward compatible with the app currently in production (same Supabase
-- project for preview and production): no DROP of any object, no data change, existing
-- RPC signatures, grants and results unchanged. Idempotent (if not exists / create or
-- replace, also for the trigger / constraints created only when missing).
--   * the production app never sends the new key -> complete_lead behaves exactly as before
--     and both new columns stay NULL;
--   * the key is NOT a writable lead field: create_lead / update_lead keep rejecting it
--     (`invalid_field: callback_request_text`), so it can only be set once, on completion.
--
-- 1. public.leads, new nullable columns (no default: instant ADD COLUMN):
--      callback_requested_at  timestamptz  when the customer pressed "Richiamami"
--                                          (complete_lead transaction time, server clock)
--      callback_request_text  text         the exact sentence shown above the button,
--                                          1..500 chars (sent by the server route from a
--                                          constant, never taken from the client body)
--    Both are NULL or both are set (leads_callback_request_pair). Both CHECK constraints
--    are added in one pg_constraint-guarded block (idempotent, also when the columns already
--    exist from an earlier partial run).
-- 2. complete_lead(p_secret, p_token, p_data) recreated: same signature, grants, result
--    {id, token, notification_email, callback_phone} and every existing check. New optional
--    key in p_data: "callback_request_text".
--      - present  -> must be a JSON string with a non-whitespace char, <= 500 chars, else
--                    `invalid_callback_request` (SQLSTATE 22023); on success the lead gets
--                    callback_requested_at = now() and callback_request_text = the value;
--      - missing  -> both columns stay NULL (old app).
--    The key is removed from p_data before private.apply_lead_patch (which rejects any key
--    that is not a writable lead field).
-- 3. Trigger leads_callback_request_immutable (BEFORE UPDATE on public.leads): once
--    callback_requested_at is set, neither column can change any more (error
--    `callback_request_immutable`, SQLSTATE 55000), for every role incl. the admin session.
--    Other columns (status, notes, ...) stay editable. Deleting the lead is unaffected.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. Lead columns
-- -------------------------------------------------------------------------------------
alter table public.leads
  add column if not exists callback_requested_at timestamptz,
  add column if not exists callback_request_text text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.leads'::regclass and conname = 'leads_callback_request_text_len'
  ) then
    alter table public.leads
      add constraint leads_callback_request_text_len
      check (callback_request_text is null or char_length(callback_request_text) between 1 and 500);
  end if;
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.leads'::regclass and conname = 'leads_callback_request_pair'
  ) then
    alter table public.leads
      add constraint leads_callback_request_pair
      check ((callback_requested_at is null) = (callback_request_text is null));
  end if;
end $$;

comment on column public.leads.callback_requested_at is
  'When the customer pressed "Richiamami" on activation step B (explicit callback request, art. 51 c.8-bis Codice del consumo). Set by complete_lead only.';
comment on column public.leads.callback_request_text is
  'Exact sentence shown to the customer above the "Richiamami" button (server constant). Set by complete_lead only.';

-- -------------------------------------------------------------------------------------
-- 2. complete_lead: same signature, grants and checks; records the callback request.
-- -------------------------------------------------------------------------------------
create or replace function public.complete_lead(p_secret text, p_token text, p_data jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id      uuid;
  v_lead    public.leads;
  v_field   text;
  v_email   text;
  v_phone   text;
  v_data    jsonb;
  v_has_cb  boolean := false;
  v_cb_text text;
begin
  perform private.check_lead_secret(p_secret);
  v_id := private.lock_lead_by_token(p_token);

  -- Callback request (T15.1): optional key, validated here and kept out of the lead patch.
  v_data := coalesce(p_data, '{}'::jsonb);
  if jsonb_typeof(v_data) = 'object' and v_data ? 'callback_request_text' then
    if jsonb_typeof(v_data -> 'callback_request_text') <> 'string' then
      raise exception 'invalid_callback_request' using errcode = '22023';
    end if;
    v_cb_text := v_data ->> 'callback_request_text';
    if v_cb_text !~ '\S' or char_length(v_cb_text) > 500 then
      raise exception 'invalid_callback_request' using errcode = '22023';
    end if;
    v_has_cb := true;
    v_data := v_data - 'callback_request_text';
  end if;

  perform private.apply_lead_patch(v_id, v_data);

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

  update public.leads l
     set step_reached          = 'completed',
         status                = 'new',
         callback_requested_at = case when v_has_cb then now() else l.callback_requested_at end,
         callback_request_text = case when v_has_cb then v_cb_text else l.callback_request_text end
   where l.id = v_id;

  select s.notification_email, s.callback_phone into v_email, v_phone from public.settings s where s.id;

  return jsonb_build_object('id', v_lead.id, 'token', v_lead.token,
                            'notification_email', v_email, 'callback_phone', v_phone);
end;
$$;
comment on function public.complete_lead(text, text, jsonb) is
  'Server only (LEAD_API_SECRET): final submit; lead becomes completed (read-only). Optional p_data key callback_request_text records the explicit callback request (callback_requested_at = now()). Returns {id, token, notification_email, callback_phone}.';
revoke all on function public.complete_lead(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.complete_lead(text, text, jsonb) to anon, authenticated;

-- -------------------------------------------------------------------------------------
-- 3. The recorded callback request is immutable (proof of the customer's request).
-- -------------------------------------------------------------------------------------
create or replace function private.leads_callback_request_immutable()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.callback_requested_at is not null
     and (new.callback_requested_at is distinct from old.callback_requested_at
          or new.callback_request_text is distinct from old.callback_request_text) then
    raise exception 'callback_request_immutable' using errcode = '55000';
  end if;
  return new;
end;
$$;
comment on function private.leads_callback_request_immutable() is
  'Trigger on public.leads: once callback_requested_at is set, callback_requested_at and callback_request_text cannot change (T15.1, SPEC #28).';
revoke all on function private.leads_callback_request_immutable() from public, anon, authenticated;

create or replace trigger leads_callback_request_immutable
  before update on public.leads
  for each row execute function private.leads_callback_request_immutable();
