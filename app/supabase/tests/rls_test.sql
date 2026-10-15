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

  -- 5. create_lead requires privacy consent
  ok := false; begin perform public.create_lead('{"first_name":"Mario"}'); exception when others then ok := sqlerrm like '%privacy_consent_required%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: create_lead without consent (got %)', err; end if;
  ok := false; begin perform public.create_lead('{"privacy_consent":false}'); exception when others then ok := sqlerrm like '%privacy_consent_required%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: create_lead with consent=false (got %)', err; end if;
  ok := false; begin perform public.create_lead('{"privacy_consent":"true"}'); exception when others then ok := sqlerrm like '%privacy_consent_required%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: create_lead with consent="true" string (got %)', err; end if;

  -- 6. create two leads
  v := public.create_lead('{"privacy_consent":true,"commodity":"dual","customer_type":"casa","first_name":"Mario","last_name":"Rossi","phone":"3331234567","comune_istat":"999999","service_type":"cambio_fornitore","appliances":["frigorifero","forno"],"gas_uses":["cucina"],"people":3,"has_gas":true}');
  if v ->> 'token' !~ '^[0-9a-f]{64}$' or (v ->> 'id') is null then raise exception 'FAIL: create_lead returned %', v; end if;
  w := public.create_lead('{"privacy_consent":true,"first_name":"Lucia"}');
  if (w ->> 'token') = (v ->> 'token') then raise exception 'FAIL: duplicate tokens'; end if;
  perform set_config('rls.a_id', v ->> 'id', true);
  perform set_config('rls.a_token', v ->> 'token', true);
  perform set_config('rls.b_id', w ->> 'id', true);
  perform set_config('rls.b_token', w ->> 'token', true);

  -- create_lead rejects non-whitelisted fields (status, notes, token, id, step completed)
  ok := false; begin perform public.create_lead('{"privacy_consent":true,"status":"closed"}'); exception when others then ok := sqlerrm like '%invalid_field%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: create_lead accepted status (got %)', err; end if;
  ok := false; begin perform public.create_lead('{"privacy_consent":true,"step_reached":"completed"}'); exception when others then ok := sqlerrm like '%invalid_step_reached%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: create_lead accepted step completed (got %)', err; end if;

  -- 7. update_lead: own token only
  perform public.update_lead(v ->> 'token', '{"last_name":"Bianchi","step_reached":"results","final_kwh_month":150}');
  ok := false; begin perform public.update_lead(repeat('0', 64), '{"first_name":"Hacker"}'); exception when others then ok := sqlerrm like '%lead_not_found%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: update_lead with unknown token (got %)', err; end if;
  ok := false; begin perform public.update_lead('not-a-token', '{"first_name":"Hacker"}'); exception when others then ok := sqlerrm like '%lead_not_found%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: update_lead with malformed token (got %)', err; end if;
  ok := false; begin perform public.update_lead(null, '{"first_name":"Hacker"}'); exception when others then ok := sqlerrm like '%lead_not_found%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: update_lead with null token (got %)', err; end if;

  -- 8. update_lead cannot touch server-managed columns
  ok := false; begin perform public.update_lead(v ->> 'token', '{"status":"closed"}'); exception when others then ok := sqlerrm like '%invalid_field%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: update_lead changed status (got %)', err; end if;
  ok := false; begin perform public.update_lead(v ->> 'token', '{"notes":"x"}'); exception when others then ok := sqlerrm like '%invalid_field%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: update_lead changed notes (got %)', err; end if;
  ok := false; begin perform public.update_lead(v ->> 'token', jsonb_build_object('token', w ->> 'token')); exception when others then ok := sqlerrm like '%invalid_field%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: update_lead changed token (got %)', err; end if;
  ok := false; begin perform public.update_lead(v ->> 'token', jsonb_build_object('id', w ->> 'id')); exception when others then ok := sqlerrm like '%invalid_field%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: update_lead changed id (got %)', err; end if;
  ok := false; begin perform public.update_lead(v ->> 'token', '{"step_reached":"completed"}'); exception when others then ok := sqlerrm like '%invalid_step_reached%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: update_lead set step completed (got %)', err; end if;
  ok := false; begin perform public.update_lead(v ->> 'token', '{"privacy_consent":false}'); exception when others then ok := sqlerrm like '%privacy_consent_required%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: update_lead revoked privacy consent (got %)', err; end if;
  ok := false; begin perform public.update_lead(v ->> 'token', '"just a string"'); exception when others then ok := sqlerrm like '%invalid_input%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: update_lead accepted a non-object patch (got %)', err; end if;
  ok := false; begin perform public.update_lead(v ->> 'token', jsonb_build_object('address', repeat('x', 30000))); exception when others then ok := sqlerrm like '%payload_too_large%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: update_lead accepted an oversized patch (got %)', err; end if;

  -- 9. chosen offer must match the commodity
  ok := false; begin perform public.update_lead(v ->> 'token', '{"chosen_offer_luce":"00000000-0000-4000-8000-00000000c004"}'); exception when others then ok := sqlerrm like '%invalid_offer%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: gas offer accepted as chosen_offer_luce (got %)', err; end if;

  -- 10. step only moves forward
  perform public.update_lead(v ->> 'token', '{"step_reached":"offer_chosen","chosen_offer_luce":"00000000-0000-4000-8000-00000000c001","chosen_offer_gas":"00000000-0000-4000-8000-00000000c004"}');
  perform public.update_lead(v ->> 'token', '{"step_reached":"page1"}');

  -- 10b. backward step is ignored on another lead C (verified as postgres); power_kw null = "Altro"
  w := public.create_lead('{"privacy_consent":true,"commodity":"luce"}');
  perform set_config('rls.c_id', w ->> 'id', true);
  perform public.update_lead(w ->> 'token', '{"step_reached":"offer_chosen","power_kw":3}');
  perform public.update_lead(w ->> 'token', '{"step_reached":"results","power_kw":null}');
  ok := false; begin perform public.update_lead(w ->> 'token', '{"power_kw":7}'); exception when check_violation then ok := true; end;
  if not ok then raise exception 'FAIL: power_kw 7 accepted'; end if;
  ok := false; begin perform public.update_lead(w ->> 'token', '{"appliances":["lavatrice","jacuzzi"]}'); exception when check_violation then ok := true; end;
  if not ok then raise exception 'FAIL: unknown appliance accepted'; end if;
  ok := false; begin perform public.update_lead(w ->> 'token', '{"people":6}'); exception when check_violation then ok := true; end;
  if not ok then raise exception 'FAIL: people 6 accepted'; end if;

  -- 11. complete_lead validates required fields (nothing is written on failure)
  ok := false; begin perform public.complete_lead(v ->> 'token', '{"tax_code":"RSSMRA80A01H501U"}'); exception when others then ok := sqlerrm like '%missing_field%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: complete_lead with missing fields (got %)', err; end if;

  -- 12. complete_lead with full data
  w := public.complete_lead(v ->> 'token', '{"tax_code":"rssmra80a01h501u","housing_title":"proprietario","cap":"99999","address":"Via Roma","street_number":"1","is_resident":true,"pod":"it001e12345678","power_kw":3,"voltage":220,"pdr":"12345678901234","monthly_cost_shown":95.5}');
  if (w ->> 'id') <> (v ->> 'id') or (w ->> 'token') <> (v ->> 'token') then raise exception 'FAIL: complete_lead returned %', w; end if;

  -- 13. a completed lead is read-only for anon
  ok := false; begin perform public.update_lead(v ->> 'token', '{"first_name":"Again"}'); exception when others then ok := sqlerrm like '%lead_not_found%'; err := sqlerrm; end;
  if not ok then raise exception 'FAIL: update_lead on completed lead (got %)', err; end if;
  ok := false; begin perform public.complete_lead(v ->> 'token', '{}'); exception when others then ok := sqlerrm like '%lead_not_found%'; err := sqlerrm; end;
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

reset role;
do $$ begin raise notice 'ALL RLS TESTS PASSED'; end $$;
rollback;
