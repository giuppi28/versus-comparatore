-- LOCAL VALIDATION ONLY (never apply to Supabase).
-- Minimal emulation of what a Supabase project provides before our migrations run:
-- API roles, the auth schema (users table, auth.uid()), the extensions schema and
-- Supabase's default privileges (ALL on new public tables/functions to anon/authenticated).
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

create schema if not exists extensions;
grant usage on schema extensions to anon, authenticated, service_role;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (
  id    uuid primary key,
  email text
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(current_setting('request.jwt.claim.sub', true),
                         (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')), '')::uuid;
$$;
create function auth.role() returns text language sql stable as $$
  select coalesce(current_setting('request.jwt.claim.role', true),
                  (current_setting('request.jwt.claims', true)::jsonb ->> 'role'));
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim', true), ''),
                  nullif(current_setting('request.jwt.claims', true), ''))::jsonb;
$$;
create table auth.mfa_factors (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status  text not null  -- Supabase: enum auth.factor_status ('unverified' | 'verified')
);
grant execute on function auth.uid(), auth.role(), auth.jwt() to anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
