-- =====================================================================================
-- Phase 14 (T14.2)  Offers: variable (PUN + spread) prices, IBAN-required flag, featured audience.
--
-- ADDITIVE and backward compatible with the app currently in production (same Supabase
-- project for preview and production). The production app writes only fixed offers with
-- `featured` and a locked_months value; every such write keeps passing the new constraints.
-- No change to RLS policies or grants (new columns inherit the table-level ones).
--
-- 1. price_type allows ('fixed','variable'). Variable => commodity = 'luce' and
--    locked_months is null. Fixed => locked_months between 1 and 120.
--    locked_months becomes nullable.
-- 2. iban_required boolean not null default false (constant default: instant).
-- 3. featured_audience text null, check in ('casa','business','both'); backfilled 'both'
--    where featured = true.
-- 4. Trigger offers_sync_featured keeps `featured` and `featured_audience` consistent
--    (featured <=> featured_audience is not null) so the production app, which only knows
--    `featured`, keeps working: featured=true without audience => 'both'; toggling featured
--    off clears the audience.
-- 5. Delete snapshot trigger function recreated: snapshots also store price_type and
--    iban_required (same trigger, owner and privileges as before).
-- Idempotent: if-not-exists / create or replace / constraints dropped and re-added by name.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1 + 2 + 3. Columns and constraints
-- -------------------------------------------------------------------------------------
alter table public.offers
  add column if not exists iban_required boolean not null default false,
  add column if not exists featured_audience text;

-- Drop the old single-column checks (auto-named offers_price_type_check /
-- offers_locked_months_check) whatever their name, and our own new ones (re-run).
do $$
declare
  c record;
begin
  for c in
    select con.conname
      from pg_constraint con
     where con.conrelid = 'public.offers'::regclass
       and con.contype = 'c'
       and (pg_get_constraintdef(con.oid) ilike '%price_type%'
            or pg_get_constraintdef(con.oid) ilike '%locked_months%'
            or con.conname in ('offers_price_type_check', 'offers_locked_months_check',
                               'offers_price_type_values', 'offers_variable_rules',
                               'offers_fixed_rules', 'offers_featured_audience_values'))
  loop
    execute format('alter table public.offers drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.offers alter column locked_months drop not null;

alter table public.offers
  add constraint offers_price_type_values check (price_type in ('fixed', 'variable')),
  add constraint offers_variable_rules
    check (price_type <> 'variable' or (commodity = 'luce' and locked_months is null)),
  add constraint offers_fixed_rules
    check (price_type <> 'fixed' or (locked_months is not null and locked_months between 1 and 120)),
  add constraint offers_featured_audience_values
    check (featured_audience is null or featured_audience in ('casa', 'business', 'both'));

update public.offers set featured_audience = 'both' where featured and featured_audience is null;

comment on column public.offers.price_type is
  'fixed = energy_price is the final price; variable (luce only) = energy_price is the spread over PUN (€/kWh), no lock-in';
comment on column public.offers.locked_months is 'Months the price is locked (fixed offers, 1-120); null for variable offers';
comment on column public.offers.iban_required is 'Payment by IBAN is mandatory for this offer (step B IBAN becomes required)';
comment on column public.offers.featured_audience is
  'Forced-featured audience: casa / business / both; null = not featured. Kept in sync with featured by trigger offers_sync_featured.';

-- -------------------------------------------------------------------------------------
-- 4. featured <=> featured_audience is not null
-- -------------------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;

create or replace function private.offers_sync_featured()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.featured_audience is not distinct from old.featured_audience then
    -- Only the boolean was changed (production app toggle): the audience follows it.
    if new.featured is distinct from old.featured then
      new.featured_audience := case when new.featured then coalesce(new.featured_audience, 'both') else null end;
    end if;
  elsif new.featured_audience is null and new.featured then
    -- Insert (or audience cleared while featured stays true) with only `featured` set.
    new.featured_audience := case when tg_op = 'UPDATE' then null else 'both' end;
  end if;
  new.featured := new.featured_audience is not null;
  return new;
end;
$$;
comment on function private.offers_sync_featured() is
  'BEFORE INSERT/UPDATE trigger on public.offers: keeps featured and featured_audience consistent.';
revoke all on function private.offers_sync_featured() from public, anon, authenticated;

create or replace trigger offers_sync_featured
  before insert or update on public.offers
  for each row execute function private.offers_sync_featured();

-- -------------------------------------------------------------------------------------
-- 5. Delete snapshot also stores price_type and iban_required
--    (body identical to 20261015170000 apart from the two new keys)
-- -------------------------------------------------------------------------------------
create or replace function private.offers_snapshot_before_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_snapshot jsonb;
begin
  if not exists (
       select 1 from public.leads l
        where l.chosen_offer_luce = old.id or l.chosen_offer_gas = old.id) then
    return old;
  end if;

  v_snapshot := jsonb_build_object(
    'offer_id',                  old.id,
    'supplier_name',             (select s.name from public.suppliers s where s.id = old.supplier_id),
    'offer_name',                old.name,
    'commodity',                 old.commodity,
    'price_type',                old.price_type,
    'energy_price',              old.energy_price,
    'other_variable_costs',      old.other_variable_costs,
    'fixed_fee_monthly',         old.fixed_fee_monthly,
    'other_fixed_costs_monthly', old.other_fixed_costs_monthly,
    'locked_months',             old.locked_months,
    'iban_required',             old.iban_required,
    'deleted_at',                now()
  );

  update public.leads l
     set chosen_offer_luce_snapshot =
           case when l.chosen_offer_luce_snapshot is null
                  or (l.chosen_offer_luce_snapshot ->> 'offer_id') is distinct from old.id::text
                then v_snapshot else l.chosen_offer_luce_snapshot end,
         chosen_offer_luce = null
   where l.chosen_offer_luce = old.id;

  update public.leads l
     set chosen_offer_gas_snapshot =
           case when l.chosen_offer_gas_snapshot is null
                  or (l.chosen_offer_gas_snapshot ->> 'offer_id') is distinct from old.id::text
                then v_snapshot else l.chosen_offer_gas_snapshot end,
         chosen_offer_gas = null
   where l.chosen_offer_gas = old.id;

  return old;
end;
$$;

alter function private.offers_snapshot_before_delete() owner to postgres;
revoke all on function private.offers_snapshot_before_delete() from public, anon, authenticated;
