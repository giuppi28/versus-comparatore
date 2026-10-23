-- =====================================================================================
-- T1.2  RLS / lead-function security test.
-- Run as `postgres` (Supabase SQL editor, or app/supabase/tests/run_local.mjs).
-- Everything runs in ONE transaction that is ROLLED BACK: no data is left behind.
-- Any failed assertion raises 'FAIL: ...' and aborts. Success ends with NOTICE 'ALL RLS TESTS PASSED'.
-- Roles are simulated the way PostgREST does it: SET LOCAL ROLE + request.jwt.claims.
-- =====================================================================================
begin;

-- ---------------------------------------------------------------- fixtures (as postgres)
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'rls-admin@test.invalid'),
  ('00000000-0000-4000-8000-0000000000a2', 'rls-user@test.invalid');
insert into public.admins (user_id) values ('00000000-0000-4000-8000-0000000000a1');

insert into public.comuni (istat_code, name, province_code, province_name, region, caps, climate_zone, climate_zone_source)
values ('999999', 'Comune di Prova RLS', 'ZZ', 'Prova', 'Prova', '{99999}', 'E', 'dpr412')
on conflict (istat_code) do nothing;

insert into public.suppliers (id, name, slug, sells_luce, sells_gas, active) values
  ('00000000-0000-4000-8000-00000000b001', 'RLS Active Supplier',   'zz-rls-active',   true, true, true),
  ('00000000-0000-4000-8000-00000000b002', 'RLS Inactive Supplier', 'zz-rls-inactive', true, true, false);

insert into public.offers (id, supplier_id, name, commodity, energy_price, locked_months, active) values
  -- visible: active offer of an active supplier
  ('00000000-0000-4000-8000-00000000c001', '00000000-0000-4000-8000-00000000b001', 'RLS Luce Active', 'luce', 0.1, 12, true),
  -- hidden: inactive offer
  ('00000000-0000-4000-8000-00000000c002', '00000000-0000-4000-8000-00000000b001', 'RLS Luce Inactive', 'luce', 0.1, 12, false),
  -- hidden: active offer of an inactive supplier
  ('00000000-0000-4000-8000-00000000c003', '00000000-0000-4000-8000-00000000b002', 'RLS Luce Of Inactive Supplier', 'luce', 0.1, 12, true),
  -- visible gas offer (used to test commodity mismatch)
  ('00000000-0000-4000-8000-00000000c004', '00000000-0000-4000-8000-00000000b001', 'RLS Gas Active', 'gas', 0.5, 12, true);

-- Q6: the lead functions check sha256(p_secret) against private.app_secrets. Inside this
-- rolled-back transaction the stored hash is replaced by the hash of a TEST secret, so the
-- test never needs the real LEAD_API_SECRET.
update private.app_secrets set sha256 = encode(extensions.digest('rls-test-secret-not-the-real-one', 'sha256'), 'hex')
 where name = 'lead_api_secret';
do $$ begin
  if (select count(*) from private.app_secrets where name = 'lead_api_secret') <> 1 then
    raise exception 'FAIL: private.app_secrets has no lead_api_secret row';
  end if;
end $$;
-- Q7: notification recipient returned by complete_lead
update public.settings set notification_email = 'rls-notify@test.invalid' where id;

-- storage bucket config + one pre-existing logo object (as postgres)
do $$
declare b storage.buckets;
begin
  select * into b from storage.buckets where id = 'supplier-logos';
  if b.id is null or not b.public or b.file_size_limit <> 204800 or b.allowed_mime_types <> array['image/svg+xml'] then
    raise exception 'FAIL: supplier-logos bucket config (%)', row_to_json(b);
  end if;
end $$;
insert into storage.objects (bucket_id, name) values ('supplier-logos', '00000000-0000-4000-8000-00000000b001/1.svg');

-- ================================================================ ANON
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

do $$
declare
  ok  boolean;
  err text;
  n   integer;
  v   jsonb;
  w   jsonb;
begin
  -- 1. anon cannot read / write leads, settings, admins at all
  ok := false; begin perform 1 from public.leads limit 1; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: anon could select from leads'; end if;
  ok := false; begin insert into public.leads (privacy_consent) values (true); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: anon could insert into leads'; end if;
  ok := false; begin update public.leads set notes = 'x'; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: anon could update leads'; end if;
  ok := false; begin delete from public.leads; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: anon could delete leads'; end if;
  ok := false; begin perform 1 from public.settings limit 1; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: anon could select settings'; end if;
  ok := false; begin perform 1 from public.admins limit 1; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: anon could select admins'; end if;

  -- 2. anon sees only active offers of active suppliers, only active suppliers
  select count(*) into n from public.offers where id = '00000000-0000-4000-8000-00000000c001';
  if n <> 1 then raise exception 'FAIL: anon cannot see an active offer'; end if;
  select count(*) into n from public.offers where id = '00000000-0000-4000-8000-00000000c002';
  if n <> 0 then raise exception 'FAIL: anon can see an inactive offer'; end if;
  select count(*) into n from public.offers where id = '00000000-0000-4000-8000-00000000c003';
  if n <> 0 then raise exception 'FAIL: anon can see an offer of an inactive supplier'; end if;
  select count(*) into n from public.offers where not active;
  if n <> 0 then raise exception 'FAIL: anon can see % inactive offers', n; end if;
  select count(*) into n from public.suppliers where not active;
  if n <> 0 then raise exception 'FAIL: anon can see inactive suppliers'; end if;
  select count(*) into n from public.comuni where istat_code = '999999';
  if n <> 1 then raise exception 'FAIL: anon cannot read comuni'; end if;

  -- 3. anon cannot write public catalog tables
  ok := false; begin update public.offers set active = true where id = '00000000-0000-4000-8000-00000000c002'; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: anon could update offers'; end if;
  ok := false; begin insert into public.suppliers (name, slug) values ('x', 'zz-x'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: anon could insert suppliers'; end if;
  ok := false; begin delete from public.comuni where istat_code = '999999'; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: anon could delete comuni'; end if;

  -- 4. anon cannot call admin / internal helpers
  ok := false; begin perform public.is_admin(); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: anon could execute is_admin()'; end if;
  ok := false; begin perform private.lock_lead_by_token(repeat('a', 64)); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: anon could execute private helpers'; end if;

  -- 4b. Q6: the server secret is required by all three lead functions (checked first)
  ok := false; begin perform 1 from private.app_secrets; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: anon could read private.app_secrets'; end if;
  ok := false; begin perform public.create_lead('wrong-secret', '{"privacy_consent":true}'); exception when others then ok := sqlerrm = 'invalid_secret'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: create_lead with wrong secret (got %)', err; end if;
  ok := false; begin perform public.create_lead(null, '{"privacy_consent":true}'); exception when others then ok := sqlerrm = 'invalid_secret'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: create_lead with null secret (got %)', err; end if;
  ok := false; begin perform public.create_lead('', '{"privacy_consent":true}'); exception when others then ok := sqlerrm = 'invalid_secret'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: create_lead with empty secret (got %)', err; end if;
  ok := false; begin perform public.create_lead('wrong-secret', '{}'); exception when others then ok := sqlerrm = 'invalid_secret'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: secret must be checked before input (got %)', err; end if;
  ok := false; begin perform public.create_lead(encode(extensions.digest('rls-test-secret-not-the-real-one', 'sha256'), 'hex'), '{"privacy_consent":true}'); exception when others then ok := sqlerrm = 'invalid_secret'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: create_lead accepted the stored hash as secret (got %)', err; end if;
  ok := false; begin perform public.update_lead('wrong-secret', repeat('0', 64), '{"first_name":"X"}'); exception when others then ok := sqlerrm = 'invalid_secret'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: update_lead with wrong secret (got %)', err; end if;
  ok := false; begin perform public.update_lead(null, repeat('0', 64), '{"first_name":"X"}'); exception when others then ok := sqlerrm = 'invalid_secret'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: update_lead with null secret (got %)', err; end if;
  ok := false; begin perform public.complete_lead('wrong-secret', repeat('0', 64), '{}'); exception when others then ok := sqlerrm = 'invalid_secret'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: complete_lead with wrong secret (got %)', err; end if;
  ok := false; begin perform public.complete_lead(null, repeat('0', 64), '{}'); exception when others then ok := sqlerrm = 'invalid_secret'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: complete_lead with null secret (got %)', err; end if;
  -- the old secret-less signatures are gone
  ok := false; begin execute 'select public.create_lead(''{"privacy_consent":true}''::jsonb)'; exception when undefined_function then ok := true; end;
  if not ok then raise exception 'FAIL: old create_lead(jsonb) still exists'; end if;
  ok := false; begin execute 'select public.update_lead(repeat(''0'', 64), ''{}''::jsonb)'; exception when undefined_function then ok := true; end;
  if not ok then raise exception 'FAIL: old update_lead(text, jsonb) still exists'; end if;
  ok := false; begin execute 'select public.complete_lead(repeat(''0'', 64), ''{}''::jsonb)'; exception when undefined_function then ok := true; end;
  if not ok then raise exception 'FAIL: old complete_lead(text, jsonb) still exists'; end if;

  -- 5. create_lead requires privacy consent
  ok := false; begin perform public.create_lead('rls-test-secret-not-the-real-one', '{"first_name":"Mario"}'); exception when others then ok := sqlerrm like '%privacy_consent_required%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: create_lead without consent (got %)', err; end if;
  ok := false; begin perform public.create_lead('rls-test-secret-not-the-real-one', '{"privacy_consent":false}'); exception when others then ok := sqlerrm like '%privacy_consent_required%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: create_lead with consent=false (got %)', err; end if;
  ok := false; begin perform public.create_lead('rls-test-secret-not-the-real-one', '{"privacy_consent":"true"}'); exception when others then ok := sqlerrm like '%privacy_consent_required%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: create_lead with consent="true" string (got %)', err; end if;

  -- 6. create two leads
  v := public.create_lead('rls-test-secret-not-the-real-one', '{"privacy_consent":true,"commodity":"dual","customer_type":"casa","first_name":"Mario","last_name":"Rossi","phone":"3331234567","comune_istat":"999999","service_type":"cambio_fornitore","appliances":["frigorifero","forno"],"gas_uses":["cucina"],"people":3,"has_gas":true}');
  if v ->> 'token' !~ '^[0-9a-f]{64}$' or (v ->> 'id') is null then raise exception 'FAIL: create_lead returned %', v; end if;
  if v ? 'notification_email' then raise exception 'FAIL: create_lead leaks notification_email'; end if;
  w := public.create_lead('rls-test-secret-not-the-real-one', '{"privacy_consent":true,"first_name":"Lucia"}');
  if (w ->> 'token') = (v ->> 'token') then raise exception 'FAIL: duplicate tokens'; end if;
  perform set_config('rls.a_id', v ->> 'id', true);
  perform set_config('rls.a_token', v ->> 'token', true);
  perform set_config('rls.b_id', w ->> 'id', true);
  perform set_config('rls.b_token', w ->> 'token', true);

  -- create_lead rejects non-whitelisted fields (status, notes, token, id, step completed)
  ok := false; begin perform public.create_lead('rls-test-secret-not-the-real-one', '{"privacy_consent":true,"status":"closed"}'); exception when others then ok := sqlerrm like '%invalid_field%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: create_lead accepted status (got %)', err; end if;
  ok := false; begin perform public.create_lead('rls-test-secret-not-the-real-one', '{"privacy_consent":true,"step_reached":"completed"}'); exception when others then ok := sqlerrm like '%invalid_step_reached%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: create_lead accepted step completed (got %)', err; end if;

  -- 7. update_lead: own token only
  perform public.update_lead('rls-test-secret-not-the-real-one', v ->> 'token', '{"last_name":"Bianchi","step_reached":"results","final_kwh_month":150}');
  ok := false; begin perform public.update_lead('rls-test-secret-not-the-real-one', repeat('0', 64), '{"first_name":"Hacker"}'); exception when others then ok := sqlerrm like '%lead_not_found%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: update_lead with unknown token (got %)', err; end if;
  ok := false; begin perform public.update_lead('rls-test-secret-not-the-real-one', 'not-a-token', '{"first_name":"Hacker"}'); exception when others then ok := sqlerrm like '%lead_not_found%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: update_lead with malformed token (got %)', err; end if;
  ok := false; begin perform public.update_lead('rls-test-secret-not-the-real-one', null, '{"first_name":"Hacker"}'); exception when others then ok := sqlerrm like '%lead_not_found%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: update_lead with null token (got %)', err; end if;

  -- 8. update_lead cannot touch server-managed columns
  ok := false; begin perform public.update_lead('rls-test-secret-not-the-real-one', v ->> 'token', '{"status":"closed"}'); exception when others then ok := sqlerrm like '%invalid_field%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: update_lead changed status (got %)', err; end if;
  ok := false; begin perform public.update_lead('rls-test-secret-not-the-real-one', v ->> 'token', '{"notes":"x"}'); exception when others then ok := sqlerrm like '%invalid_field%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: update_lead changed notes (got %)', err; end if;
  ok := false; begin perform public.update_lead('rls-test-secret-not-the-real-one', v ->> 'token', jsonb_build_object('token', w ->> 'token')); exception when others then ok := sqlerrm like '%invalid_field%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: update_lead changed token (got %)', err; end if;
  ok := false; begin perform public.update_lead('rls-test-secret-not-the-real-one', v ->> 'token', jsonb_build_object('id', w ->> 'id')); exception when others then ok := sqlerrm like '%invalid_field%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: update_lead changed id (got %)', err; end if;
  ok := false; begin perform public.update_lead('rls-test-secret-not-the-real-one', v ->> 'token', '{"step_reached":"completed"}'); exception when others then ok := sqlerrm like '%invalid_step_reached%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: update_lead set step completed (got %)', err; end if;
  ok := false; begin perform public.update_lead('rls-test-secret-not-the-real-one', v ->> 'token', '{"privacy_consent":false}'); exception when others then ok := sqlerrm like '%privacy_consent_required%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: update_lead revoked privacy consent (got %)', err; end if;
  ok := false; begin perform public.update_lead('rls-test-secret-not-the-real-one', v ->> 'token', '"just a string"'); exception when others then ok := sqlerrm like '%invalid_input%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: update_lead accepted a non-object patch (got %)', err; end if;
  ok := false; begin perform public.update_lead('rls-test-secret-not-the-real-one', v ->> 'token', jsonb_build_object('address', repeat('x', 30000))); exception when others then ok := sqlerrm like '%payload_too_large%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: update_lead accepted an oversized patch (got %)', err; end if;

  -- 9. chosen offer must match the commodity
  ok := false; begin perform public.update_lead('rls-test-secret-not-the-real-one', v ->> 'token', '{"chosen_offer_luce":"00000000-0000-4000-8000-00000000c004"}'); exception when others then ok := sqlerrm like '%invalid_offer%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: gas offer accepted as chosen_offer_luce (got %)', err; end if;

  -- 10. step only moves forward
  perform public.update_lead('rls-test-secret-not-the-real-one', v ->> 'token', '{"step_reached":"offer_chosen","chosen_offer_luce":"00000000-0000-4000-8000-00000000c001","chosen_offer_gas":"00000000-0000-4000-8000-00000000c004"}');
  perform public.update_lead('rls-test-secret-not-the-real-one', v ->> 'token', '{"step_reached":"page1"}');

  -- 10b. backward step is ignored on another lead C (verified as postgres); power_kw null = "Altro"
  w := public.create_lead('rls-test-secret-not-the-real-one', '{"privacy_consent":true,"commodity":"luce"}');
  perform set_config('rls.c_id', w ->> 'id', true);
  perform public.update_lead('rls-test-secret-not-the-real-one', w ->> 'token', '{"step_reached":"offer_chosen","power_kw":3}');
  perform public.update_lead('rls-test-secret-not-the-real-one', w ->> 'token', '{"step_reached":"results","power_kw":null}');
  ok := false; begin perform public.update_lead('rls-test-secret-not-the-real-one', w ->> 'token', '{"power_kw":7}'); exception when check_violation then ok := true; end;
  if not ok then raise exception 'FAIL: power_kw 7 accepted'; end if;
  ok := false; begin perform public.update_lead('rls-test-secret-not-the-real-one', w ->> 'token', '{"appliances":["lavatrice","jacuzzi"]}'); exception when check_violation then ok := true; end;
  if not ok then raise exception 'FAIL: unknown appliance accepted'; end if;
  ok := false; begin perform public.update_lead('rls-test-secret-not-the-real-one', w ->> 'token', '{"people":6}'); exception when check_violation then ok := true; end;
  if not ok then raise exception 'FAIL: people 6 accepted'; end if;

  -- 11. complete_lead validates required fields (nothing is written on failure)
  ok := false; begin perform public.complete_lead('rls-test-secret-not-the-real-one', v ->> 'token', '{"tax_code":"RSSMRA80A01H501U"}'); exception when others then ok := sqlerrm like '%missing_field%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: complete_lead with missing fields (got %)', err; end if;

  -- 11b. wrong secret with a VALID token: rejected, nothing written, lead stays in progress
  ok := false; begin perform public.complete_lead('wrong-secret', v ->> 'token', '{"tax_code":"RSSMRA80A01H501U","housing_title":"proprietario","cap":"99999","address":"Via Roma","street_number":"1","is_resident":true}'); exception when others then ok := sqlerrm = 'invalid_secret'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: complete_lead wrong secret + valid token (got %)', err; end if;
  ok := false; begin perform public.update_lead('wrong-secret', v ->> 'token', '{"first_name":"Hacker"}'); exception when others then ok := sqlerrm = 'invalid_secret'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: update_lead wrong secret + valid token (got %)', err; end if;

  -- 12. complete_lead with full data
  w := public.complete_lead('rls-test-secret-not-the-real-one', v ->> 'token', '{"tax_code":"rssmra80a01h501u","housing_title":"proprietario","cap":"99999","address":"Via Roma","street_number":"1","is_resident":true,"pod":"it001e12345678","power_kw":3,"voltage":220,"pdr":"12345678901234","monthly_cost_shown":95.5}');
  if (w ->> 'id') <> (v ->> 'id') or (w ->> 'token') <> (v ->> 'token') then raise exception 'FAIL: complete_lead returned %', w; end if;
  -- Q7: the notification recipient (settings) is returned on successful completion
  if (w ->> 'notification_email') is distinct from 'rls-notify@test.invalid' then
    raise exception 'FAIL: complete_lead notification_email = %', w -> 'notification_email';
  end if;

  -- 13. a completed lead is read-only for anon
  ok := false; begin perform public.update_lead('rls-test-secret-not-the-real-one', v ->> 'token', '{"first_name":"Again"}'); exception when others then ok := sqlerrm like '%lead_not_found%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: update_lead on completed lead (got %)', err; end if;
  ok := false; begin perform public.complete_lead('rls-test-secret-not-the-real-one', v ->> 'token', '{}'); exception when others then ok := sqlerrm like '%lead_not_found%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: complete_lead twice (got %)', err; end if;

  -- 14. storage: anon cannot write or list supplier logos
  ok := false; begin insert into storage.objects (bucket_id, name) values ('supplier-logos', 'anon/evil.svg'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: anon could upload a supplier logo'; end if;
  update storage.objects set name = 'x.svg' where bucket_id = 'supplier-logos';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: anon updated a supplier logo'; end if;
  delete from storage.objects where bucket_id = 'supplier-logos';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: anon deleted a supplier logo'; end if;
  select count(*) into n from storage.objects where bucket_id = 'supplier-logos';
  if n <> 0 then raise exception 'FAIL: anon can list supplier logos'; end if;

  raise notice 'ok: anon checks';
end $$;

-- ================================================================ verify as postgres
reset role;
do $$
declare
  a public.leads;
  b public.leads;
begin
  select * into a from public.leads where id = current_setting('rls.a_id')::uuid;
  select * into b from public.leads where id = current_setting('rls.b_id')::uuid;
  if a.step_reached <> 'completed' or a.status <> 'new' then raise exception 'FAIL: lead A not completed (% / %)', a.step_reached, a.status; end if;
  if a.last_name <> 'Bianchi' or a.first_name <> 'Mario' then raise exception 'FAIL: lead A data wrong'; end if;
  if a.tax_code <> 'RSSMRA80A01H501U' or a.pod <> 'IT001E12345678' then raise exception 'FAIL: lead A normalization (% / %)', a.tax_code, a.pod; end if;
  if a.appliances <> '{frigorifero,forno}' or a.gas_uses <> '{cucina}' or a.people <> 3 then raise exception 'FAIL: lead A arrays/people'; end if;
  if a.final_kwh_month <> 150 or a.voltage <> 220 or a.power_kw <> 3 then raise exception 'FAIL: lead A numbers'; end if;
  if a.chosen_offer_luce <> '00000000-0000-4000-8000-00000000c001' then raise exception 'FAIL: lead A chosen offer'; end if;
  if b.first_name <> 'Lucia' or b.last_name is not null or b.step_reached <> 'page1' then
    raise exception 'FAIL: lead B was modified (first_name %, last_name %, step %)', b.first_name, b.last_name, b.step_reached;
  end if;
  if b.token = a.token then raise exception 'FAIL: tokens collide'; end if;
  select * into b from public.leads where id = current_setting('rls.c_id')::uuid;
  if b.step_reached <> 'offer_chosen' or b.power_kw is not null then
    raise exception 'FAIL: lead C step % / power %', b.step_reached, b.power_kw;
  end if;
  raise notice 'ok: postgres verification';
end $$;

-- ================================================================ AUTHENTICATED, NOT ADMIN
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}';
do $$
declare
  ok boolean;
  n  integer;
begin
  select count(*) into n from public.leads;
  if n <> 0 then raise exception 'FAIL: non-admin sees % leads', n; end if;
  select count(*) into n from public.settings;
  if n <> 0 then raise exception 'FAIL: non-admin sees settings'; end if;
  select count(*) into n from public.offers where not active;
  if n <> 0 then raise exception 'FAIL: non-admin sees inactive offers'; end if;
  if public.is_admin() then raise exception 'FAIL: non-admin is_admin() = true'; end if;
  update public.offers set featured = true where id = '00000000-0000-4000-8000-00000000c001';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: non-admin updated an offer'; end if;
  ok := false; begin insert into public.offers (supplier_id, name, commodity, energy_price, locked_months) values ('00000000-0000-4000-8000-00000000b001', 'x', 'luce', 0.1, 12); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: non-admin inserted an offer'; end if;
  ok := false; begin insert into public.admins (user_id) values ('00000000-0000-4000-8000-0000000000a2'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: non-admin made itself admin'; end if;
  update public.leads set status = 'closed';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: non-admin updated leads'; end if;
  ok := false; begin insert into storage.objects (bucket_id, name) values ('supplier-logos', 'user/evil.svg'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: non-admin uploaded a supplier logo'; end if;
  delete from storage.objects where bucket_id = 'supplier-logos';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: non-admin deleted a supplier logo'; end if;
  ok := false; begin perform 1 from private.app_secrets; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: non-admin could read private.app_secrets'; end if;
  raise notice 'ok: authenticated non-admin checks';
end $$;

-- ================================================================ ADMIN
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}';
do $$
declare
  ok boolean;
  n  integer;
begin
  if not public.is_admin() then raise exception 'FAIL: admin is_admin() = false'; end if;
  select count(*) into n from public.leads where id in (current_setting('rls.a_id')::uuid, current_setting('rls.b_id')::uuid);
  if n <> 2 then raise exception 'FAIL: admin sees % of 2 test leads', n; end if;
  update public.leads set status = 'contacted', notes = 'Chiamato' where id = current_setting('rls.a_id')::uuid;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: admin could not update lead status/notes'; end if;
  select count(*) into n from public.offers where id in ('00000000-0000-4000-8000-00000000c002', '00000000-0000-4000-8000-00000000c003');
  if n <> 2 then raise exception 'FAIL: admin does not see inactive offers'; end if;
  update public.offers set active = true where id = '00000000-0000-4000-8000-00000000c002';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: admin could not update an offer'; end if;
  insert into public.offers (supplier_id, name, commodity, energy_price, locked_months)
    values ('00000000-0000-4000-8000-00000000b001', 'RLS Admin Offer', 'gas', 0.4, 6);
  insert into public.suppliers (name, slug) values ('RLS Admin Supplier', 'zz-rls-admin');
  update public.settings set notification_email = 'aldo@example.com' where id;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: admin could not update settings'; end if;
  select count(*) into n from public.admins;
  if n <> 1 then raise exception 'FAIL: admin should see exactly its own admins row (got %)', n; end if;
  ok := false; begin insert into public.admins (user_id) values ('00000000-0000-4000-8000-0000000000a2'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: admins table writable through the API'; end if;
  -- storage: admin can upload, list, update, delete supplier logos (only in this bucket)
  insert into storage.objects (bucket_id, name) values ('supplier-logos', '00000000-0000-4000-8000-00000000b001/2.svg');
  select count(*) into n from storage.objects where bucket_id = 'supplier-logos';
  if n <> 2 then raise exception 'FAIL: admin lists % of 2 supplier logos', n; end if;
  update storage.objects set metadata = '{"x":1}' where bucket_id = 'supplier-logos' and name like '%/2.svg';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: admin could not update a supplier logo'; end if;
  delete from storage.objects where bucket_id = 'supplier-logos' and name like '%/2.svg';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: admin could not delete a supplier logo'; end if;
  ok := false; begin perform 1 from private.app_secrets; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: admin could read private.app_secrets through the API'; end if;
  raise notice 'ok: admin checks';
end $$;

-- ================================================================ ADMIN + MFA (restrictive policies)
-- Once the admin has a verified TOTP factor, an aal1 session sees nothing; aal2 has full access.
reset role;
insert into auth.mfa_factors (user_id, status) values ('00000000-0000-4000-8000-0000000000a1', 'verified');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated","aal":"aal1"}';
do $$
declare n integer; ok boolean;
begin
  if not public.is_admin() then raise exception 'FAIL: is_admin() must not depend on aal'; end if;
  select count(*) into n from public.leads;
  if n <> 0 then raise exception 'FAIL: admin with verified factor on aal1 sees % leads', n; end if;
  update public.settings set notification_email = 'x@example.com' where id;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: admin on aal1 updated settings'; end if;
  ok := false; begin insert into storage.objects (bucket_id, name) values ('supplier-logos', 'aal1/x.svg'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: admin on aal1 uploaded a supplier logo'; end if;
  delete from storage.objects where bucket_id = 'supplier-logos';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: admin on aal1 deleted a supplier logo'; end if;
  raise notice 'ok: MFA aal1 blocked';
end $$;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated","aal":"aal2"}';
do $$
declare n integer;
begin
  select count(*) into n from public.leads where id in (current_setting('rls.a_id')::uuid, current_setting('rls.b_id')::uuid);
  if n <> 2 then raise exception 'FAIL: admin on aal2 sees % of 2 leads', n; end if;
  insert into storage.objects (bucket_id, name) values ('supplier-logos', '00000000-0000-4000-8000-00000000b001/3.svg');
  raise notice 'ok: MFA aal2 allowed';
end $$;

-- the re-activated offer is now public and the inactive-supplier offer is still hidden.
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$
declare n integer;
begin
  select count(*) into n from public.offers where id = '00000000-0000-4000-8000-00000000c002';
  if n <> 1 then raise exception 'FAIL: re-activated offer not visible to anon'; end if;
  select count(*) into n from public.offers where id = '00000000-0000-4000-8000-00000000c003';
  if n <> 0 then raise exception 'FAIL: offer of inactive supplier visible to anon'; end if;
  raise notice 'ok: anon visibility after admin changes';
end $$;

-- ================================================================ DELETIONS (Phase 11, D1)
-- Lead snapshots written by the BEFORE DELETE triggers on offers / suppliers, placeholder
-- suppliers protected, only an admin (aal2 here, MFA factor verified above) can delete.
reset role;
insert into public.suppliers (id, name, slug, logo_path, sells_luce, sells_gas, active) values
  ('00000000-0000-4000-8000-00000000b101', 'RLS Delete Supplier',   'zz-rls-del',   '00000000-0000-4000-8000-00000000b101/1.svg', true, true, true),
  ('00000000-0000-4000-8000-00000000b102', 'RLS Delete Supplier 2', 'zz-rls-del-2', null, true, true, true);
insert into public.offers (id, supplier_id, name, commodity, energy_price, other_variable_costs,
                           fixed_fee_monthly, other_fixed_costs_monthly, locked_months) values
  ('00000000-0000-4000-8000-00000000d101', '00000000-0000-4000-8000-00000000b101', 'RLS Del Luce', 'luce', 0.123456, 0.01, 9.5, 1.25, 24),
  ('00000000-0000-4000-8000-00000000d102', '00000000-0000-4000-8000-00000000b101', 'RLS Del Gas',  'gas',  0.48,     0.2,  8,   0,    12),
  ('00000000-0000-4000-8000-00000000d103', '00000000-0000-4000-8000-00000000b101', 'RLS Del Luce 2', 'luce', 0.15,   0.02, 7,   0,    12);
insert into public.leads (id, privacy_consent, commodity, chosen_offer_luce, chosen_offer_gas,
                          current_supplier_luce, current_supplier_gas,
                          chosen_offer_luce_snapshot) values
  -- e1: references the luce + gas offer of supplier b101 and both suppliers
  ('00000000-0000-4000-8000-00000000e001', true, 'dual', '00000000-0000-4000-8000-00000000d101', '00000000-0000-4000-8000-00000000d102',
   '00000000-0000-4000-8000-00000000b101', '00000000-0000-4000-8000-00000000b102', null),
  -- e2: already holds a snapshot of the SAME offer -> kept
  ('00000000-0000-4000-8000-00000000e002', true, 'luce', '00000000-0000-4000-8000-00000000d103', null, null, null,
   '{"offer_id":"00000000-0000-4000-8000-00000000d103","offer_name":"Kept"}'),
  -- e3: holds a stale snapshot of ANOTHER (earlier deleted) offer -> replaced
  ('00000000-0000-4000-8000-00000000e003', true, 'luce', '00000000-0000-4000-8000-00000000d103', null, null, null,
   '{"offer_id":"00000000-0000-4000-8000-00000000dfff","offer_name":"Stale"}'),
  -- e4: current supplier = placeholder "Servizio di Tutela"
  ('00000000-0000-4000-8000-00000000e004', true, 'luce', null, null,
   (select id from public.suppliers where slug = 'tutela'), null, null);

-- anon: no delete privilege on leads / offers / suppliers at all
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$
declare ok boolean;
begin
  ok := false; begin delete from public.leads where id = '00000000-0000-4000-8000-00000000e001'; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: anon could delete leads'; end if;
  ok := false; begin delete from public.offers where id = '00000000-0000-4000-8000-00000000d101'; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: anon could delete offers'; end if;
  ok := false; begin delete from public.suppliers where id = '00000000-0000-4000-8000-00000000b102'; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: anon could delete suppliers'; end if;
  ok := false; begin perform private.offers_snapshot_before_delete(); exception when insufficient_privilege or feature_not_supported then ok := true; end;
  if not ok then raise exception 'FAIL: anon could call the offer delete trigger function'; end if;
  raise notice 'ok: anon cannot delete leads / offers / suppliers';
end $$;

-- authenticated non-admin: RLS hides every row, nothing is deleted
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}';
do $$
declare n integer;
begin
  delete from public.leads;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: non-admin deleted % leads', n; end if;
  delete from public.offers where id = '00000000-0000-4000-8000-00000000d101';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: non-admin deleted an offer'; end if;
  delete from public.suppliers where id = '00000000-0000-4000-8000-00000000b102';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: non-admin deleted a supplier'; end if;
  raise notice 'ok: non-admin cannot delete';
end $$;

-- admin with a verified factor on aal1: blocked by the MFA restrictive policies
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated","aal":"aal1"}';
do $$
declare n integer;
begin
  delete from public.leads where id = '00000000-0000-4000-8000-00000000e001';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: admin on aal1 deleted a lead'; end if;
  delete from public.offers where id = '00000000-0000-4000-8000-00000000d101';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: admin on aal1 deleted an offer'; end if;
  raise notice 'ok: admin on aal1 cannot delete';
end $$;

-- admin (aal2): deletes, triggers write the history
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated","aal":"aal2"}';
do $$
declare
  ok    boolean;
  n     integer;
  err   text;
  state text;
  l     public.leads;
  snap  jsonb;
begin
  -- placeholder suppliers cannot be deleted (clear error, nothing changed)
  ok := false;
  begin
    delete from public.suppliers where slug = 'tutela';
  exception when others then
    err := sqlerrm; state := sqlstate;
    ok := err like 'placeholder_supplier:%' and state = 'P0001';
  end;
  if not ok then raise exception 'FAIL: placeholder supplier delete not rejected (% / %)', state, err; end if;
  select count(*) into n from public.suppliers where is_placeholder;
  if n <> 3 then raise exception 'FAIL: % of 3 placeholder suppliers left', n; end if;

  -- supplier with offers: still ON DELETE RESTRICT, and the failed delete leaves no trace
  ok := false;
  begin
    delete from public.suppliers where id = '00000000-0000-4000-8000-00000000b101';
  exception when restrict_violation then ok := true;  -- SQLSTATE 23001
  end;
  if not ok then raise exception 'FAIL: supplier with offers was deleted (RESTRICT expected)'; end if;
  select * into l from public.leads where id = '00000000-0000-4000-8000-00000000e001';
  if l.current_supplier_luce_name is not null or l.current_supplier_luce is null then
    raise exception 'FAIL: rejected supplier delete changed lead e1 (%, %)', l.current_supplier_luce, l.current_supplier_luce_name;
  end if;

  -- single offer delete: snapshot written / kept / replaced, FK cleared
  delete from public.offers where id = '00000000-0000-4000-8000-00000000d103';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: admin could not delete an offer'; end if;
  select * into l from public.leads where id = '00000000-0000-4000-8000-00000000e002';
  if l.chosen_offer_luce is not null or l.chosen_offer_luce_snapshot ->> 'offer_name' <> 'Kept' then
    raise exception 'FAIL: existing snapshot of the same offer overwritten (%)', l.chosen_offer_luce_snapshot;
  end if;
  select * into l from public.leads where id = '00000000-0000-4000-8000-00000000e003';
  if l.chosen_offer_luce is not null
     or l.chosen_offer_luce_snapshot ->> 'offer_name' <> 'RLS Del Luce 2'
     or l.chosen_offer_luce_snapshot ->> 'offer_id' <> '00000000-0000-4000-8000-00000000d103' then
    raise exception 'FAIL: stale snapshot of another offer not replaced (%)', l.chosen_offer_luce_snapshot;
  end if;
  select * into l from public.leads where id = '00000000-0000-4000-8000-00000000e001';
  if l.chosen_offer_luce_snapshot is not null or l.chosen_offer_gas_snapshot is not null
     or l.chosen_offer_luce is null or l.chosen_offer_gas is null then
    raise exception 'FAIL: lead e1 touched by the delete of an offer it does not reference';
  end if;

  -- supplier delete flow used by the app: ALL its offers in one statement (lead e1 references
  -- both the luce and the gas offer), then the supplier
  delete from public.offers where supplier_id = '00000000-0000-4000-8000-00000000b101';
  get diagnostics n = row_count;
  if n <> 2 then raise exception 'FAIL: admin deleted % of 2 remaining offers of the supplier', n; end if;
  select * into l from public.leads where id = '00000000-0000-4000-8000-00000000e001';
  snap := l.chosen_offer_luce_snapshot;
  if l.chosen_offer_luce is not null or l.chosen_offer_gas is not null then raise exception 'FAIL: chosen offers not cleared'; end if;
  if snap is null then raise exception 'FAIL: no luce snapshot on lead e1'; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(snap) k) <> array[
       'commodity', 'deleted_at', 'energy_price', 'fixed_fee_monthly', 'locked_months', 'offer_id',
       'offer_name', 'other_fixed_costs_monthly', 'other_variable_costs', 'supplier_name'] then
    raise exception 'FAIL: snapshot keys %', snap;
  end if;
  if snap ->> 'offer_id' <> '00000000-0000-4000-8000-00000000d101'
     or snap ->> 'supplier_name' <> 'RLS Delete Supplier'
     or snap ->> 'offer_name' <> 'RLS Del Luce'
     or snap ->> 'commodity' <> 'luce'
     or jsonb_typeof(snap -> 'energy_price') <> 'number'
     or (snap ->> 'energy_price')::numeric <> 0.123456
     or (snap ->> 'other_variable_costs')::numeric <> 0.01
     or (snap ->> 'fixed_fee_monthly')::numeric <> 9.5
     or (snap ->> 'other_fixed_costs_monthly')::numeric <> 1.25
     or (snap -> 'locked_months') <> '24'::jsonb
     or (snap ->> 'deleted_at')::timestamptz is null then
    raise exception 'FAIL: luce snapshot values %', snap;
  end if;
  if l.chosen_offer_gas_snapshot ->> 'offer_name' <> 'RLS Del Gas'
     or l.chosen_offer_gas_snapshot ->> 'offer_id' <> '00000000-0000-4000-8000-00000000d102'
     or l.chosen_offer_gas_snapshot ->> 'commodity' <> 'gas'
     or l.chosen_offer_gas_snapshot ->> 'supplier_name' <> 'RLS Delete Supplier' then
    raise exception 'FAIL: gas snapshot %', l.chosen_offer_gas_snapshot;
  end if;
  -- both suppliers referenced by lead e1 in ONE statement
  delete from public.suppliers where id in ('00000000-0000-4000-8000-00000000b101', '00000000-0000-4000-8000-00000000b102');
  get diagnostics n = row_count;
  if n <> 2 then raise exception 'FAIL: admin deleted % of 2 suppliers', n; end if;
  select * into l from public.leads where id = '00000000-0000-4000-8000-00000000e001';
  if l.current_supplier_luce is not null or l.current_supplier_gas is not null
     or l.current_supplier_luce_name is distinct from 'RLS Delete Supplier'
     or l.current_supplier_gas_name is distinct from 'RLS Delete Supplier 2' then
    raise exception 'FAIL: supplier names on lead e1 (% / %)', l.current_supplier_luce_name, l.current_supplier_gas_name;
  end if;
  select * into l from public.leads where id = '00000000-0000-4000-8000-00000000e004';
  if l.current_supplier_luce is null or l.current_supplier_luce_name is not null then
    raise exception 'FAIL: lead e4 (placeholder supplier) changed';
  end if;

  -- leads: bulk delete by id
  delete from public.leads where id in ('00000000-0000-4000-8000-00000000e001', '00000000-0000-4000-8000-00000000e002',
                                        '00000000-0000-4000-8000-00000000e003', '00000000-0000-4000-8000-00000000e004');
  get diagnostics n = row_count;
  if n <> 4 then raise exception 'FAIL: admin deleted % of 4 leads', n; end if;
  raise notice 'ok: admin deletions keep lead history';
end $$;

reset role;
do $$
declare n integer;
begin
  select count(*) into n from public.leads where id::text like '00000000-0000-4000-8000-00000000e00%';
  if n <> 0 then raise exception 'FAIL: % deleted test leads still exist', n; end if;
  select count(*) into n from public.suppliers where slug in ('zz-rls-del', 'zz-rls-del-2');
  if n <> 0 then raise exception 'FAIL: deleted test suppliers still exist'; end if;
  select count(*) into n from public.offers where supplier_id = '00000000-0000-4000-8000-00000000b101';
  if n <> 0 then raise exception 'FAIL: offers of the deleted supplier still exist'; end if;
  raise notice 'ok: postgres verification after deletions';
end $$;

-- ================================================================ PHASE 12 (T12.1)
-- Activation data (IBAN, identity document), callback number, identity-document uploads.
reset role;
do $$
declare b storage.buckets;
begin
  select * into b from storage.buckets where id = 'lead-documents';
  if b.id is null or b.public or b.file_size_limit <> 5242880
     or b.allowed_mime_types <> array['image/jpeg', 'application/pdf'] then
    raise exception 'FAIL: lead-documents bucket config (%)', row_to_json(b);
  end if;
end $$;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$
declare
  ok   boolean;
  err  text;
  n    integer;
  v    jsonb;
  d    jsonb;
  s    text := 'rls-test-secret-not-the-real-one';
begin
  -- callback number: the only settings value anon can read
  if public.get_callback_phone() is distinct from '+39 095 0000000' then
    raise exception 'FAIL: get_callback_phone() = %', public.get_callback_phone();
  end if;
  ok := false; begin perform callback_phone from public.settings; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: anon could read settings.callback_phone directly'; end if;

  -- lead_documents: no anon privilege at all
  ok := false; begin perform 1 from public.lead_documents limit 1; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: anon could select lead_documents'; end if;
  ok := false; begin insert into public.lead_documents (lead_id, object_path, mime_type, size_bytes, expires_at) values (gen_random_uuid(), 'x', 'image/jpeg', 1, now()); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: anon could insert into lead_documents'; end if;
  ok := false; begin update public.lead_documents set status = 'pending'; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: anon could update lead_documents'; end if;
  ok := false; begin delete from public.lead_documents; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: anon could delete lead_documents'; end if;

  -- new lead fields: normalization through create_lead / update_lead
  v := public.create_lead(s, '{"privacy_consent":true,"commodity":"luce","customer_type":"casa","first_name":"Anna","last_name":"Verdi","phone":"3331112222","comune_istat":"999999","service_type":"cambio_fornitore","iban":" it60 x054 2811 1010 0000 0123 456 "}');
  perform set_config('rls.d_id', v ->> 'id', true);
  perform set_config('rls.d_token', v ->> 'token', true);
  perform public.update_lead(s, v ->> 'token', '{"iban_holder_different":true,"iban_holder_first_name":" Mario ","iban_holder_last_name":"Rossi","iban_holder_tax_code":"rssmra80a01h501u","document_type":"carta_identita","document_number":"ca 12345 ab","document_expiry":"2031-05-31","document_issuer":" Comune di Roma "}');
  ok := false; begin perform public.update_lead(s, v ->> 'token', '{"iban":"IT60X054"}'); exception when check_violation then ok := true; end;
  if not ok then raise exception 'FAIL: short IBAN accepted'; end if;
  ok := false; begin perform public.update_lead(s, v ->> 'token', '{"iban":"6060X0542811101000000123456"}'); exception when check_violation then ok := true; end;
  if not ok then raise exception 'FAIL: IBAN without country accepted'; end if;
  ok := false; begin perform public.update_lead(s, v ->> 'token', '{"iban_holder_tax_code":"RSSMRA80A01H50"}'); exception when check_violation then ok := true; end;
  if not ok then raise exception 'FAIL: malformed holder tax code accepted'; end if;
  ok := false; begin perform public.update_lead(s, v ->> 'token', '{"iban_holder_tax_code":"12345678901"}'); exception when check_violation then ok := true; end;
  if not ok then raise exception 'FAIL: P.IVA accepted as holder tax code'; end if;
  ok := false; begin perform public.update_lead(s, v ->> 'token', '{"document_type":"tessera"}'); exception when check_violation then ok := true; end;
  if not ok then raise exception 'FAIL: unknown document type accepted'; end if;
  ok := false; begin perform public.update_lead(s, v ->> 'token', '{"document_number":"a#1"}'); exception when check_violation then ok := true; end;
  if not ok then raise exception 'FAIL: malformed document number accepted'; end if;
  ok := false; begin perform public.update_lead(s, v ->> 'token', '{"document_expiry":"1990-01-01"}'); exception when check_violation then ok := true; end;
  if not ok then raise exception 'FAIL: absurd document expiry accepted'; end if;
  ok := false; begin perform public.update_lead(s, v ->> 'token', '{"document_expiry":"31/05/2031"}'); exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: non-ISO document expiry accepted'; end if;
  ok := false; begin perform public.update_lead(s, v ->> 'token', jsonb_build_object('document_issuer', repeat('x', 121))); exception when check_violation then ok := true; end;
  if not ok then raise exception 'FAIL: overlong document issuer accepted'; end if;
  ok := false; begin perform public.update_lead(s, v ->> 'token', jsonb_build_object('iban_holder_first_name', repeat('x', 101))); exception when check_violation then ok := true; end;
  if not ok then raise exception 'FAIL: overlong holder first name accepted'; end if;

  -- register_lead_document: secret, token, type, size
  ok := false; begin perform public.register_lead_document('wrong-secret', v ->> 'token', 'image/jpeg', 1000); exception when others then ok := sqlerrm = 'invalid_secret'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: register_lead_document wrong secret (got %)', err; end if;
  ok := false; begin perform public.register_lead_document(null, v ->> 'token', 'image/jpeg', 1000); exception when others then ok := sqlerrm = 'invalid_secret'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: register_lead_document null secret (got %)', err; end if;
  ok := false; begin perform public.register_lead_document(s, repeat('0', 64), 'image/jpeg', 1000); exception when others then ok := sqlerrm = 'lead_not_found'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: register_lead_document unknown token (got %)', err; end if;
  ok := false; begin perform public.register_lead_document(s, null, 'image/jpeg', 1000); exception when others then ok := sqlerrm = 'lead_not_found'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: register_lead_document null token (got %)', err; end if;
  ok := false; begin perform public.register_lead_document(s, v ->> 'token', 'image/png', 1000); exception when others then ok := sqlerrm = 'invalid_document'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: register_lead_document png (got %)', err; end if;
  ok := false; begin perform public.register_lead_document(s, v ->> 'token', 'image/svg+xml', 1000); exception when others then ok := sqlerrm = 'invalid_document'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: register_lead_document svg (got %)', err; end if;
  ok := false; begin perform public.register_lead_document(s, v ->> 'token', 'application/pdf', 0); exception when others then ok := sqlerrm = 'invalid_document'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: register_lead_document empty file (got %)', err; end if;
  ok := false; begin perform public.register_lead_document(s, v ->> 'token', 'application/pdf', 5242881); exception when others then ok := sqlerrm = 'invalid_document'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: register_lead_document > 5 MiB (got %)', err; end if;
  ok := false; begin perform public.register_lead_document(s, v ->> 'token', 'application/pdf', null); exception when others then ok := sqlerrm = 'invalid_document'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: register_lead_document null size (got %)', err; end if;

  -- slot 1: JPEG, one-time unguessable name in the lead's folder
  d := public.register_lead_document(s, v ->> 'token', 'image/jpeg', 5242880);
  if d ->> 'path' !~ ('^' || (v ->> 'id') || '/[0-9a-f]{32}\.jpg$') or d ->> 'bucket' <> 'lead-documents'
     or (d ->> 'lead_id') <> (v ->> 'id') or (d ->> 'expires_at')::timestamptz <= now() then
    raise exception 'FAIL: register_lead_document returned %', d;
  end if;
  perform set_config('rls.d_doc1', d ->> 'id', true);
  perform set_config('rls.d_path1', d ->> 'path', true);

  -- anon upload: arbitrary names refused, the issued name accepted exactly once
  ok := false; begin insert into storage.objects (bucket_id, name) values ('lead-documents', (v ->> 'id') || '/' || repeat('a', 32) || '.jpg'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: anon uploaded to an unregistered path'; end if;
  ok := false; begin insert into storage.objects (bucket_id, name) values ('lead-documents', 'evil.pdf'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: anon uploaded to an arbitrary path'; end if;
  ok := false; begin insert into storage.objects (bucket_id, name) values ('supplier-logos', d ->> 'path'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: anon used a document slot in another bucket'; end if;
  insert into storage.objects (bucket_id, name) values ('lead-documents', d ->> 'path');
  ok := false; begin insert into storage.objects (bucket_id, name) values ('lead-documents', d ->> 'path'); exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: anon reused an upload path'; end if;

  -- anon cannot list / read / overwrite / delete document objects
  select count(*) into n from storage.objects where bucket_id = 'lead-documents';
  if n <> 0 then raise exception 'FAIL: anon can list % lead documents', n; end if;
  update storage.objects set name = name || '.x' where bucket_id = 'lead-documents';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: anon updated a lead document'; end if;
  delete from storage.objects where bucket_id = 'lead-documents';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: anon deleted a lead document'; end if;

  -- confirm: wrong secret / wrong id refused; then the slot is closed
  ok := false; begin perform public.confirm_lead_document('wrong-secret', v ->> 'token', (d ->> 'id')::uuid); exception when others then ok := sqlerrm = 'invalid_secret'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: confirm_lead_document wrong secret (got %)', err; end if;
  ok := false; begin perform public.confirm_lead_document(s, v ->> 'token', gen_random_uuid()); exception when others then ok := sqlerrm = 'document_not_found'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: confirm_lead_document unknown id (got %)', err; end if;
  d := public.confirm_lead_document(s, v ->> 'token', (d ->> 'id')::uuid);
  if d ->> 'mime_type' <> 'image/jpeg' or (d ->> 'size_bytes')::int <> 5242880 or (d ->> 'lead_id') <> (v ->> 'id') then
    raise exception 'FAIL: confirm_lead_document returned %', d;
  end if;
  ok := false; begin perform public.confirm_lead_document(s, v ->> 'token', (d ->> 'id')::uuid); exception when others then ok := sqlerrm = 'document_not_found'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: confirm_lead_document twice (got %)', err; end if;

  -- slot 2: PDF registered + confirmed WITHOUT an upload: the name is closed after confirm
  d := public.register_lead_document(s, v ->> 'token', 'application/pdf', 1234);
  if d ->> 'path' !~ '\.pdf$' then raise exception 'FAIL: pdf slot path %', d ->> 'path'; end if;
  perform set_config('rls.d_path2', d ->> 'path', true);
  perform public.confirm_lead_document(s, v ->> 'token', (d ->> 'id')::uuid);
  ok := false; begin insert into storage.objects (bucket_id, name) values ('lead-documents', d ->> 'path'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: anon uploaded to a confirmed (closed) slot'; end if;

  -- max 2 documents per lead
  ok := false; begin perform public.register_lead_document(s, v ->> 'token', 'image/jpeg', 10); exception when others then ok := sqlerrm = 'document_limit_reached'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: third document accepted (got %)', err; end if;

  -- lead E: expired and completed-lead slots
  v := public.create_lead(s, '{"privacy_consent":true,"commodity":"luce","customer_type":"casa","first_name":"Elena","last_name":"Neri","phone":"3334445555","comune_istat":"999999","service_type":"subentro","tax_code":"NRELNE80A41H501X","housing_title":"inquilino","cap":"99999","address":"Via Po","street_number":"2","is_resident":true,"chosen_offer_luce":"00000000-0000-4000-8000-00000000c001"}');
  perform set_config('rls.e_id', v ->> 'id', true);
  perform set_config('rls.e_token', v ->> 'token', true);
  d := public.register_lead_document(s, v ->> 'token', 'image/jpeg', 100);
  perform set_config('rls.e_doc_expired', d ->> 'id', true);
  perform set_config('rls.e_path_expired', d ->> 'path', true);
  d := public.register_lead_document(s, v ->> 'token', 'application/pdf', 100);
  perform set_config('rls.e_path_pending', d ->> 'path', true);
  -- a slot of lead E cannot be confirmed with lead D's token
  ok := false; begin perform public.confirm_lead_document(s, current_setting('rls.d_token'), (d ->> 'id')::uuid); exception when others then ok := sqlerrm = 'document_not_found'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: confirm with another lead''s token (got %)', err; end if;
  raise notice 'ok: phase 12 anon checks (part 1)';
end $$;

-- expire one slot of lead E (as postgres)
reset role;
update public.lead_documents set expires_at = now() - interval '1 second'
 where id = current_setting('rls.e_doc_expired')::uuid;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$
declare
  ok  boolean;
  err text;
  w   jsonb;
  s   text := 'rls-test-secret-not-the-real-one';
begin
  ok := false; begin insert into storage.objects (bucket_id, name) values ('lead-documents', current_setting('rls.e_path_expired')); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: anon uploaded to an expired slot'; end if;
  -- the expired slot no longer counts toward the limit
  perform public.register_lead_document(s, current_setting('rls.e_token'), 'image/jpeg', 100);
  ok := false; begin perform public.register_lead_document(s, current_setting('rls.e_token'), 'image/jpeg', 100); exception when others then ok := sqlerrm = 'document_limit_reached'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: limit with one expired slot (got %)', err; end if;

  -- complete lead E: returns the callback number; its pending slot is closed
  w := public.complete_lead(s, current_setting('rls.e_token'), '{}');
  if (w ->> 'callback_phone') is distinct from '+39 095 0000000' or not (w ? 'notification_email') then
    raise exception 'FAIL: complete_lead result %', w;
  end if;
  ok := false; begin insert into storage.objects (bucket_id, name) values ('lead-documents', current_setting('rls.e_path_pending')); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: anon uploaded to a slot of a completed lead'; end if;
  ok := false; begin perform public.register_lead_document(s, current_setting('rls.e_token'), 'image/jpeg', 100); exception when others then ok := sqlerrm = 'lead_not_found'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: register on a completed lead (got %)', err; end if;
  raise notice 'ok: phase 12 anon checks (part 2)';
end $$;

-- verify as postgres: normalization, slots, objects
reset role;
do $$
declare
  l public.leads;
  n integer;
begin
  select * into l from public.leads where id = current_setting('rls.d_id')::uuid;
  if l.iban is distinct from 'IT60X0542811101000000123456' then raise exception 'FAIL: IBAN normalization (%)', l.iban; end if;
  if l.iban_holder_different is not true or l.iban_holder_first_name <> 'Mario' or l.iban_holder_last_name <> 'Rossi'
     or l.iban_holder_tax_code <> 'RSSMRA80A01H501U' then
    raise exception 'FAIL: IBAN holder fields (%, %, %, %)', l.iban_holder_different, l.iban_holder_first_name, l.iban_holder_last_name, l.iban_holder_tax_code;
  end if;
  if l.document_type <> 'carta_identita' or l.document_number <> 'CA12345AB' or l.document_expiry <> date '2031-05-31'
     or l.document_issuer <> 'Comune di Roma' then
    raise exception 'FAIL: document fields (%, %, %, %)', l.document_type, l.document_number, l.document_expiry, l.document_issuer;
  end if;
  select count(*) into n from public.lead_documents where lead_id = current_setting('rls.d_id')::uuid and status = 'uploaded' and uploaded_at is not null;
  if n <> 2 then raise exception 'FAIL: lead D has % of 2 uploaded documents', n; end if;
  select count(*) into n from storage.objects where bucket_id = 'lead-documents' and name = current_setting('rls.d_path1');
  if n <> 1 then raise exception 'FAIL: uploaded object missing'; end if;
  -- empty date string clears the expiry
  perform public.update_lead('rls-test-secret-not-the-real-one', current_setting('rls.d_token'), '{"document_expiry":""}');
  if (select document_expiry from public.leads where id = current_setting('rls.d_id')::uuid) is not null then
    raise exception 'FAIL: empty document_expiry not stored as null';
  end if;
  perform public.update_lead('rls-test-secret-not-the-real-one', current_setting('rls.d_token'), '{"document_expiry":"2031-05-31"}');
  raise notice 'ok: phase 12 postgres verification';
end $$;

-- authenticated non-admin: sees nothing, cannot upload
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}';
do $$
declare ok boolean; n integer;
begin
  select count(*) into n from public.lead_documents;
  if n <> 0 then raise exception 'FAIL: non-admin sees % lead documents', n; end if;
  select count(*) into n from storage.objects where bucket_id = 'lead-documents';
  if n <> 0 then raise exception 'FAIL: non-admin lists % document objects', n; end if;
  delete from storage.objects where bucket_id = 'lead-documents';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: non-admin deleted document objects'; end if;
  ok := false; begin insert into storage.objects (bucket_id, name) values ('lead-documents', 'user/x.pdf'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: non-admin uploaded a document'; end if;
  ok := false; begin insert into public.lead_documents (lead_id, object_path, mime_type, size_bytes, expires_at) values (current_setting('rls.d_id')::uuid, 'x', 'image/jpeg', 1, now()); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: non-admin inserted a lead document row'; end if;
  update public.settings set callback_phone = '+39 02 1111111';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: non-admin updated callback_phone'; end if;
  if public.get_callback_phone() <> '+39 095 0000000' then raise exception 'FAIL: get_callback_phone for authenticated'; end if;
  raise notice 'ok: phase 12 non-admin checks';
end $$;

-- admin on aal1 (verified factor): blocked by the MFA restrictive policies
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated","aal":"aal1"}';
do $$
declare n integer;
begin
  select count(*) into n from public.lead_documents;
  if n <> 0 then raise exception 'FAIL: admin on aal1 sees % lead documents', n; end if;
  select count(*) into n from storage.objects where bucket_id = 'lead-documents';
  if n <> 0 then raise exception 'FAIL: admin on aal1 lists document objects'; end if;
  delete from storage.objects where bucket_id = 'lead-documents';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: admin on aal1 deleted document objects'; end if;
  raise notice 'ok: phase 12 admin aal1 blocked';
end $$;

-- admin (aal2): reads documents + objects, deletes objects, edits callback_phone, deletes the lead
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated","aal":"aal2"}';
do $$
declare ok boolean; n integer;
begin
  select count(*) into n from public.lead_documents where lead_id = current_setting('rls.d_id')::uuid;
  if n <> 2 then raise exception 'FAIL: admin sees % of 2 documents of lead D', n; end if;
  select count(*) into n from storage.objects where bucket_id = 'lead-documents' and name = current_setting('rls.d_path1');
  if n <> 1 then raise exception 'FAIL: admin cannot see the document object (signed URLs need SELECT)'; end if;
  ok := false; begin insert into storage.objects (bucket_id, name) values ('lead-documents', current_setting('rls.d_id') || '/admin.pdf'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: admin uploaded into lead-documents (not needed, not allowed)'; end if;
  update storage.objects set metadata = '{"x":1}' where bucket_id = 'lead-documents';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: admin updated a document object'; end if;
  ok := false; begin insert into public.lead_documents (lead_id, object_path, mime_type, size_bytes, expires_at) values (current_setting('rls.d_id')::uuid, 'x', 'image/jpeg', 1, now()); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: admin inserted a lead document row'; end if;

  select count(*) into n from public.settings where callback_phone = '+39 095 0000000';
  if n <> 1 then raise exception 'FAIL: admin cannot read callback_phone'; end if;
  ok := false; begin update public.settings set callback_phone = '095-000' where id; exception when check_violation then ok := true; end;
  if not ok then raise exception 'FAIL: invalid callback_phone accepted'; end if;
  ok := false; begin update public.settings set callback_phone = '12345' where id; exception when check_violation then ok := true; end;
  if not ok then raise exception 'FAIL: too short callback_phone accepted'; end if;
  ok := false; begin update public.settings set callback_phone = null where id; exception when not_null_violation then ok := true; end;
  if not ok then raise exception 'FAIL: null callback_phone accepted'; end if;
  update public.settings set callback_phone = '+39 02 1234567' where id;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: admin could not update callback_phone'; end if;

  delete from storage.objects where bucket_id = 'lead-documents' and name = current_setting('rls.d_path1');
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: admin could not delete a document object'; end if;
  delete from public.leads where id = current_setting('rls.d_id')::uuid;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: admin could not delete lead D'; end if;
  raise notice 'ok: phase 12 admin checks';
end $$;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ begin
  if public.get_callback_phone() is distinct from '+39 02 1234567' then
    raise exception 'FAIL: get_callback_phone after admin edit = %', public.get_callback_phone();
  end if;
end $$;

reset role;
do $$
declare n integer;
begin
  select count(*) into n from public.lead_documents where lead_id = current_setting('rls.d_id')::uuid;
  if n <> 0 then raise exception 'FAIL: % document rows survived the lead delete', n; end if;
  raise notice 'ok: phase 12 lead delete cascades to lead_documents';
end $$;

reset role;
do $$ begin raise notice 'ALL RLS TESTS PASSED'; end $$;
rollback;
