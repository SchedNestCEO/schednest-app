-- SchedNest Platform v1: Unified Settings

create table if not exists public.platform_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  preferred_name text,
  phone text,
  timezone text not null default 'UTC',
  locale text not null default 'en-US',
  preferred_language text not null default 'English',
  date_format text not null default 'MM/DD/YYYY',
  time_format text not null default '12h'
    check (time_format in ('12h', '24h')),
  week_starts_on integer not null default 0
    check (week_starts_on between 0 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id)
);

create table if not exists public.platform_privacy_settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  analytics_enabled boolean not null default true,
  personalization_enabled boolean not null default true,
  product_cross_context_enabled boolean not null default false,
  allow_birdy_learning boolean not null default true,
  allow_sensitive_memory boolean not null default false,
  allow_usage_improvement boolean not null default false,
  default_sharing_scope text not null default 'private'
    check (default_sharing_scope in ('private', 'approved_people', 'workspace')),
  data_retention_days integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id)
);

create table if not exists public.platform_accessibility_settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  large_text boolean not null default false,
  high_contrast boolean not null default false,
  reduced_motion boolean not null default false,
  simplified_navigation boolean not null default false,
  screen_reader_optimized boolean not null default false,
  plain_language boolean not null default false,
  larger_controls boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id)
);

create table if not exists public.platform_product_settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  product text not null
    check (product in ('student', 'teams', 'med', 'business', 'life')),
  is_enabled boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, product)
);

alter table public.platform_profiles enable row level security;
alter table public.platform_privacy_settings enable row level security;
alter table public.platform_accessibility_settings enable row level security;
alter table public.platform_product_settings enable row level security;

drop policy if exists "platform_profiles_owner_all" on public.platform_profiles;
create policy "platform_profiles_owner_all"
on public.platform_profiles
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "platform_privacy_settings_owner_all"
on public.platform_privacy_settings;
create policy "platform_privacy_settings_owner_all"
on public.platform_privacy_settings
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "platform_accessibility_settings_owner_all"
on public.platform_accessibility_settings;
create policy "platform_accessibility_settings_owner_all"
on public.platform_accessibility_settings
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "platform_product_settings_owner_all"
on public.platform_product_settings;
create policy "platform_product_settings_owner_all"
on public.platform_product_settings
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
