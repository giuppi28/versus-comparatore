-- =====================================================================================
-- Documentation of the REAL DB state after 20261015140000 (QUESTIONS.md,
-- "REVIEWER NOTE 2026-10-15 14:05 — real DB state"). NO APPLY NEEDED: the reviewer already
-- did this by hand on the real project.
--
-- On the real project the DROP FUNCTION statements of 20261015140000 were NOT executed
-- (the connector needs an interactive confirmation for destructive SQL). Instead the old
-- functions had all privileges revoked, were moved to schema `private` (not exposed by
-- the API) and renamed:
--
--   public.create_lead(jsonb)               -> private.old_create_lead_disabled(jsonb)
--   public.update_lead(text, jsonb)         -> private.old_update_lead_disabled(text, jsonb)
--   public.complete_lead(text, jsonb)       -> private.old_complete_lead_disabled(text, jsonb)
--   public.bootstrap_load_comuni(text)      -> private.bootstrap_load_comuni_disabled(text)
--     (temporary RPC created by the reviewer for the T8.1 comuni load; never created by a
--      repo migration)
--
-- This file makes a DB built from the repo match that state idempotently:
--   * fresh DB: 20261015140000 already dropped the old lead functions and
--     bootstrap_load_comuni never existed -> every block below is a no-op;
--   * real DB: the functions are already in `private` -> only the (repeatable) revoke runs;
--   * a DB where the old functions still sit in `public` -> revoke, rename, move.
-- No function is dropped.
-- =====================================================================================

create schema if not exists private;
revoke all on schema private from public;

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('create_lead',           'jsonb',       'old_create_lead_disabled'),
      ('update_lead',           'text, jsonb', 'old_update_lead_disabled'),
      ('complete_lead',         'text, jsonb', 'old_complete_lead_disabled'),
      ('bootstrap_load_comuni', 'text',        'bootstrap_load_comuni_disabled')
    ) as t(old_name, args, new_name)
  loop
    -- Still in public: revoke, rename (in public), then move to private.
    if to_regprocedure(format('public.%I(%s)', r.old_name, r.args)) is not null then
      if to_regprocedure(format('private.%I(%s)', r.new_name, r.args)) is not null then
        raise exception 'cannot disable public.%(%): private.%(%) already exists',
          r.old_name, r.args, r.new_name, r.args;
      end if;
      execute format('revoke all on function public.%I(%s) from public, anon, authenticated',
                     r.old_name, r.args);
      execute format('alter function public.%I(%s) rename to %I', r.old_name, r.args, r.new_name);
      execute format('alter function public.%I(%s) set schema private', r.new_name, r.args);
    end if;

    -- Already disabled (real DB, or just moved above): make sure nobody can execute it.
    if to_regprocedure(format('private.%I(%s)', r.new_name, r.args)) is not null then
      execute format('revoke all on function private.%I(%s) from public, anon, authenticated',
                     r.new_name, r.args);
    end if;
  end loop;
end
$$;
