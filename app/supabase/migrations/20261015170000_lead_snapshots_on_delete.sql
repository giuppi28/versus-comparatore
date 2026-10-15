-- =====================================================================================
-- Phase 11 (D1, T11.1)  Preserve lead history before admin deletions.
--
-- ADDITIVE and backward compatible with the app currently in production (same Supabase
-- project for preview and production): no DROP, no change to RLS, grants or the lead
-- functions. The production app keeps working unchanged (`select *` on leads just returns
-- four extra nullable columns; the lead functions never write them because they are not in
-- private.lead_writable_fields()).
--
-- 1. public.leads gets four nullable columns:
--      chosen_offer_luce_snapshot / chosen_offer_gas_snapshot  jsonb  (compact offer copy)
--      current_supplier_luce_name / current_supplier_gas_name  text   (supplier name)
-- 2. BEFORE DELETE ON public.offers (per row): every lead that still references the offer
--    in chosen_offer_luce / chosen_offer_gas gets the snapshot in the matching column.
--    Snapshot shape (jsonb object):
--      { "offer_id", "supplier_name", "offer_name", "commodity", "energy_price",
--        "other_variable_costs", "fixed_fee_monthly", "other_fixed_costs_monthly",
--        "locked_months", "deleted_at" }
--    Written when the column is NULL, or when it holds the snapshot of a DIFFERENT offer
--    (an in-progress lead whose earlier choice was deleted and who then picked another
--    offer: the stale copy must not survive). An existing snapshot of the same offer is
--    never overwritten.
--    The trigger also sets chosen_offer_* to NULL itself (the end state the existing FK
--    ON DELETE SET NULL produces anyway): needed so that one statement deleting several
--    offers referenced by the same lead (luce + gas offer of one supplier) does not fail the
--    FK re-check of a lead row already updated in the same transaction.
-- 3. BEFORE DELETE ON public.suppliers (per row):
--      - placeholder suppliers (is_placeholder = true: Tutela / Altro fornitore / Non lo so)
--        cannot be deleted: raises 'placeholder_supplier: ...' (SQLSTATE P0001, HTTP 400);
--      - otherwise every lead that still references the supplier in current_supplier_luce /
--        current_supplier_gas gets its name in current_supplier_*_name (the lead references
--        THIS supplier, so its name is the correct one even if an older value is present),
--        and current_supplier_* is set to NULL itself (as ON DELETE SET NULL would; same
--        reason as for offers).
--    offers.supplier_id stays ON DELETE RESTRICT: the app deletes a supplier's offers first
--    (each offer delete fires trigger 2), then the supplier.
--
-- The trigger functions live in `private` (not exposed by PostgREST), are SECURITY DEFINER
-- (owner postgres: the lead update must not depend on the caller's lead privileges),
-- use search_path = '' with fully qualified names, and nobody can EXECUTE them directly.
-- Postgres does not check EXECUTE when firing a trigger, so admin deletes still work.
-- Idempotent (add column if not exists / create or replace function / create or replace
-- trigger, PG 14+). No DROP statement.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. New lead columns (nullable, no default: instant ADD COLUMN, no table rewrite)
-- -------------------------------------------------------------------------------------
alter table public.leads
  add column if not exists chosen_offer_luce_snapshot jsonb
    constraint leads_chosen_offer_luce_snapshot_object
    check (chosen_offer_luce_snapshot is null or jsonb_typeof(chosen_offer_luce_snapshot) = 'object'),
  add column if not exists chosen_offer_gas_snapshot jsonb
    constraint leads_chosen_offer_gas_snapshot_object
    check (chosen_offer_gas_snapshot is null or jsonb_typeof(chosen_offer_gas_snapshot) = 'object'),
  add column if not exists current_supplier_luce_name text
    constraint leads_current_supplier_luce_name_len
    check (current_supplier_luce_name is null or char_length(current_supplier_luce_name) between 1 and 120),
  add column if not exists current_supplier_gas_name text
    constraint leads_current_supplier_gas_name_len
    check (current_supplier_gas_name is null or char_length(current_supplier_gas_name) between 1 and 120);

comment on column public.leads.chosen_offer_luce_snapshot is
  'Copy of the chosen luce offer taken when that offer was deleted (trigger offers_snapshot_before_delete). Shape: {offer_id, supplier_name, offer_name, commodity, energy_price, other_variable_costs, fixed_fee_monthly, other_fixed_costs_monthly, locked_months, deleted_at}.';
comment on column public.leads.chosen_offer_gas_snapshot is
  'Copy of the chosen gas offer taken when that offer was deleted (same shape as chosen_offer_luce_snapshot).';
comment on column public.leads.current_supplier_luce_name is
  'Name of the current luce supplier, stored when that supplier was deleted (trigger suppliers_guard_before_delete).';
comment on column public.leads.current_supplier_gas_name is
  'Name of the current gas supplier, stored when that supplier was deleted (trigger suppliers_guard_before_delete).';

-- -------------------------------------------------------------------------------------
-- 2. Offer delete: snapshot into referencing leads
-- -------------------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;

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
    'energy_price',              old.energy_price,
    'other_variable_costs',      old.other_variable_costs,
    'fixed_fee_monthly',         old.fixed_fee_monthly,
    'other_fixed_costs_monthly', old.other_fixed_costs_monthly,
    'locked_months',             old.locked_months,
    'deleted_at',                now()
  );

  -- The FK column is cleared here too (same end state as ON DELETE SET NULL). Required when
  -- one statement deletes several rows referenced by the same lead (e.g. the luce AND gas
  -- offer of a supplier): a lead row already updated in this transaction gets its FKs
  -- re-checked on the next update, and a reference to an offer deleted earlier in the same
  -- statement (whose SET NULL action has not run yet) would fail that check.
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
comment on function private.offers_snapshot_before_delete() is
  'BEFORE DELETE trigger on public.offers: copies the offer into leads.chosen_offer_*_snapshot of referencing leads.';

alter function private.offers_snapshot_before_delete() owner to postgres;
revoke all on function private.offers_snapshot_before_delete() from public, anon, authenticated;

create or replace trigger offers_snapshot_before_delete
  before delete on public.offers
  for each row execute function private.offers_snapshot_before_delete();

-- -------------------------------------------------------------------------------------
-- 3. Supplier delete: placeholder guard + supplier name into referencing leads
-- -------------------------------------------------------------------------------------
create or replace function private.suppliers_guard_before_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.is_placeholder then
    raise exception 'placeholder_supplier: "%" is a placeholder supplier and cannot be deleted', old.name
      using errcode = 'P0001',
            hint = 'Placeholder suppliers (Tutela / Altro fornitore / Non lo so) are required by the "Fornitore attuale" dropdown.';
  end if;

  -- FK column cleared here too (same end state as ON DELETE SET NULL; see the offer trigger).
  update public.leads l
     set current_supplier_luce_name = old.name,
         current_supplier_luce = null
   where l.current_supplier_luce = old.id;

  update public.leads l
     set current_supplier_gas_name = old.name,
         current_supplier_gas = null
   where l.current_supplier_gas = old.id;

  return old;
end;
$$;
comment on function private.suppliers_guard_before_delete() is
  'BEFORE DELETE trigger on public.suppliers: rejects placeholder suppliers, stores the supplier name in leads.current_supplier_*_name of referencing leads.';

alter function private.suppliers_guard_before_delete() owner to postgres;
revoke all on function private.suppliers_guard_before_delete() from public, anon, authenticated;

create or replace trigger suppliers_guard_before_delete
  before delete on public.suppliers
  for each row execute function private.suppliers_guard_before_delete();
