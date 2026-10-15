-- =====================================================================================
-- T1.1  VERSUS schema: suppliers, offers, comuni, leads, settings, admins (PRD §12)
-- Target: Supabase Postgres 15+. Extensions live in the `extensions` schema (Supabase default).
-- RLS, policies, grants and the lead functions are in the next migration (T1.2).
-- =====================================================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;  -- gen_random_bytes (lead tokens)
create extension if not exists unaccent with schema extensions;  -- accent-insensitive comuni search
create extension if not exists pg_trgm  with schema extensions;  -- trigram index for ILIKE '%q%'

-- -------------------------------------------------------------------------------------
-- Helpers
-- -------------------------------------------------------------------------------------

-- Search normalization, identical to app/src/lib/data/normalize.ts:
-- lowercase, accents stripped, apostrophes / hyphens / dots -> spaces, whitespace collapsed.
-- "Forlì" -> "forli", "L'Aquila" -> "l aquila". IMMUTABLE (explicit dictionary) so it can
-- back a generated column.
create or replace function public.normalize_search(p_text text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select btrim(regexp_replace(
           regexp_replace(
             lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_text, ''))),
             '[''’`´.\-]', ' ', 'g'),
           '\s+', ' ', 'g'));
$$;

-- updated_at maintenance
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -------------------------------------------------------------------------------------
-- suppliers
-- Special dropdown options ("Servizio di Tutela / Tutele Graduali", "Altro fornitore",
-- "Non lo so") are ordinary rows with no offers.
-- -------------------------------------------------------------------------------------
create table public.suppliers (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (char_length(btrim(name)) between 1 and 120),
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  logo_path        text check (logo_path is null or char_length(logo_path) between 1 and 300),
  sells_luce       boolean not null default false,
  sells_gas        boolean not null default false,
  show_in_dropdown boolean not null default true,
  sort_order       integer not null default 0,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table public.suppliers is 'Energy suppliers (PRD §12). Also hosts the special "current supplier" dropdown options.';
create index suppliers_active_sort_idx on public.suppliers (active, sort_order);

create trigger suppliers_set_updated_at before update on public.suppliers
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------------------------------
-- offers  (v1: fixed price, single rate; VAT excluded; fees stored monthly)
-- -------------------------------------------------------------------------------------
create table public.offers (
  id                        uuid primary key default gen_random_uuid(),
  supplier_id               uuid not null references public.suppliers (id) on update cascade on delete restrict,
  name                      text not null check (char_length(btrim(name)) between 1 and 160),
  commodity                 text not null check (commodity in ('luce', 'gas')),
  customer_type             text not null default 'both' check (customer_type in ('casa', 'business', 'both')),
  price_type                text not null default 'fixed' check (price_type = 'fixed'),
  energy_price              numeric(12, 6) not null check (energy_price >= 0 and energy_price < 100),
  other_variable_costs      numeric(12, 6) not null default 0 check (other_variable_costs >= 0 and other_variable_costs < 100),
  fixed_fee_monthly         numeric(12, 4) not null default 0 check (fixed_fee_monthly >= 0 and fixed_fee_monthly < 100000),
  other_fixed_costs_monthly numeric(12, 4) not null default 0 check (other_fixed_costs_monthly >= 0 and other_fixed_costs_monthly < 100000),
  locked_months             integer not null check (locked_months between 1 and 120),
  activation_cost           numeric(10, 2) not null default 0 check (activation_cost >= 0 and activation_cost < 100000),
  promo_text                text check (promo_text is null or char_length(promo_text) <= 500),
  advantages                text[] not null default '{}'
                            check (array_position(advantages, null) is null and cardinality(advantages) <= 30),
  details                   text check (details is null or char_length(details) <= 10000),
  featured                  boolean not null default false,
  active                    boolean not null default true,
  price_verified            boolean not null default false,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
comment on column public.offers.energy_price is '€/kWh (luce) or €/Smc (gas), VAT excluded';
comment on column public.offers.other_variable_costs is '€/kWh (luce) or €/Smc (gas), VAT excluded';
comment on column public.offers.fixed_fee_monthly is 'Quota fissa €/month (admin may enter yearly; stored monthly)';
comment on column public.offers.advantages is 'Ordered bullets for the offer modal; **word** renders bold';
comment on column public.offers.price_verified is 'Internal: prices verified by Aldo. Go-live blocked while an active offer is unverified.';
create index offers_supplier_idx on public.offers (supplier_id);
create index offers_public_idx on public.offers (commodity, customer_type) where active;

create trigger offers_set_updated_at before update on public.offers
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------------------------------
-- comuni  (ISTAT municipalities + DPR 412/93 climate zone). Data: *_comuni_data_*.sql
-- -------------------------------------------------------------------------------------
create table public.comuni (
  istat_code          text primary key check (istat_code ~ '^[0-9]{6}$'),
  name                text not null check (char_length(btrim(name)) between 1 and 120),
  name_search         text generated always as (public.normalize_search(name)) stored,
  province_code       text not null check (province_code ~ '^[A-Z]{2}$'),   -- sigla automobilistica
  province_name       text not null,
  region              text not null,
  caps                text[] not null default '{}'
                      check (array_to_string(caps, ',') ~ '^([0-9]{5}(,[0-9]{5})*)?$'),
  climate_zone        text check (climate_zone in ('A', 'B', 'C', 'D', 'E', 'F')),
  -- How the zone was obtained (see app/supabase/README.md). NULL zone = unknown, flagged.
  climate_zone_source text check (climate_zone_source in ('dpr412', 'dpr412_renamed', 'dpr412_merged')),
  updated_at          timestamptz not null default now(),
  constraint comuni_zone_source_consistent check ((climate_zone is null) = (climate_zone_source is null))
);
comment on column public.comuni.name_search is 'normalize_search(name): accent-insensitive search key';
comment on column public.comuni.climate_zone is 'DPR 412/93 zone; NULL = not available (flagged, see README)';
create index comuni_name_search_trgm_idx on public.comuni using gin (name_search extensions.gin_trgm_ops);
create index comuni_name_search_prefix_idx on public.comuni (name_search text_pattern_ops);
create index comuni_province_idx on public.comuni (province_code);

create trigger comuni_set_updated_at before update on public.comuni
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------------------------------
-- leads  (one row per customer session; same row updated step by step, completed at the end)
-- Never readable by anon. Written only through SECURITY DEFINER functions (T1.2).
-- -------------------------------------------------------------------------------------
create table public.leads (
  id                    uuid primary key default gen_random_uuid(),
  -- 256-bit random secret; the only capability needed to update the in-progress lead.
  token                 text not null unique
                        default encode(extensions.gen_random_bytes(32), 'hex')
                        check (token ~ '^[0-9a-f]{64}$'),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  step_reached          text not null default 'page1'
                        check (step_reached in ('page1', 'results', 'offer_chosen', 'completed')),
  status                text not null default 'new'
                        check (status in ('new', 'contacted', 'in_progress', 'closed')),
  notes                 text check (notes is null or char_length(notes) <= 10000),

  commodity             text check (commodity in ('luce', 'gas', 'dual')),
  customer_type         text check (customer_type in ('casa', 'business')),
  first_name            text check (first_name is null or char_length(first_name) between 1 and 100),
  last_name             text check (last_name is null or char_length(last_name) between 1 and 100),
  phone                 text check (phone is null or phone ~ '^[0-9+ ().-]{6,25}$'),
  tax_code              text check (tax_code is null or tax_code ~ '^[A-Z0-9]{16}$'),
  company_name          text check (company_name is null or char_length(company_name) between 1 and 200),
  vat_number            text check (vat_number is null or vat_number ~ '^[0-9]{11}$'),
  housing_title         text check (housing_title in ('proprietario', 'inquilino', 'usufruttuario', 'altro')),

  comune_istat          text references public.comuni (istat_code) on update cascade on delete restrict,
  cap                   text check (cap is null or cap ~ '^[0-9]{5}$'),
  address               text check (address is null or char_length(address) between 1 and 200),
  street_number         text check (street_number is null or char_length(street_number) between 1 and 20),
  is_resident           boolean,

  service_type          text check (service_type in ('cambio_fornitore', 'subentro', 'voltura', 'primo_allaccio')),
  current_supplier_luce uuid references public.suppliers (id) on update cascade on delete set null,
  current_supplier_gas  uuid references public.suppliers (id) on update cascade on delete set null,
  has_gas               boolean,

  people                smallint check (people between 1 and 5),                  -- 5 = "5+"
  appliances            text[] not null default '{}'
                        check (appliances <@ array['frigorifero', 'forno', 'lavastoviglie', 'lavatrice',
                                                   'climatizzatore', 'scaldabagno']::text[]),  -- config/consumption.ts
  gas_uses              text[] not null default '{}'
                        check (gas_uses <@ array['cucina', 'riscaldamento', 'acqua_calda']::text[]),
  sqm_range             text check (sqm_range in ('lt60', '60_90', '90_120', 'gt120')),
  -- Annual consumption actually used (estimated or entered manually; see manual_consumption).
  estimated_kwh_year    numeric(12, 2) check (estimated_kwh_year >= 0 and estimated_kwh_year < 100000000),
  estimated_smc_year    numeric(12, 2) check (estimated_smc_year >= 0 and estimated_smc_year < 100000000),
  manual_consumption    boolean,
  final_kwh_month       numeric(12, 2) check (final_kwh_month >= 0 and final_kwh_month < 10000000),
  final_smc_month       numeric(12, 2) check (final_smc_month >= 0 and final_smc_month < 10000000),

  chosen_offer_luce     uuid references public.offers (id) on update cascade on delete set null,
  chosen_offer_gas      uuid references public.offers (id) on update cascade on delete set null,
  monthly_cost_shown    numeric(12, 2) check (monthly_cost_shown >= 0 and monthly_cost_shown < 10000000),

  pod                   text check (pod is null or pod ~ '^IT[0-9A-Z]{12}$'),
  power_kw              numeric(4, 1) check (power_kw in (1.5, 3, 3.5, 4, 4.5, 5, 6, 10, 15)),  -- null = "Altro"
  voltage               smallint check (voltage in (220, 380)),
  pdr                   text check (pdr is null or pdr ~ '^[0-9]{14}$'),

  privacy_consent       boolean not null check (privacy_consent),  -- GDPR: no row without consent
  marketing_consent     boolean
);
comment on table public.leads is 'Customer leads (PRD §5.1, §12). anon: no direct access; use create_lead/update_lead/complete_lead.';
create index leads_created_at_idx on public.leads (created_at desc);
create index leads_step_status_idx on public.leads (step_reached, status);
create index leads_comune_idx on public.leads (comune_istat);
create index leads_current_supplier_luce_idx on public.leads (current_supplier_luce);
create index leads_current_supplier_gas_idx on public.leads (current_supplier_gas);
create index leads_chosen_offer_luce_idx on public.leads (chosen_offer_luce);
create index leads_chosen_offer_gas_idx on public.leads (chosen_offer_gas);

create trigger leads_set_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------------------------------
-- settings  (single row, id = true)
-- -------------------------------------------------------------------------------------
create table public.settings (
  id                 boolean primary key default true check (id),
  notification_email text check (notification_email is null
                                 or notification_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  updated_at         timestamptz not null default now()
);
comment on table public.settings is 'Global settings, single row (id = true).';

create trigger settings_set_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

insert into public.settings (id, notification_email) values (true, null)
on conflict (id) do nothing;

-- -------------------------------------------------------------------------------------
-- admins  (Supabase Auth users allowed into /admin; rows created manually, never via API)
-- -------------------------------------------------------------------------------------
create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
comment on table public.admins is 'Admin users (auth.users). Insert manually (SQL editor); no API write access.';
