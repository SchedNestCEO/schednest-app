begin;

create table if not exists public.birdy_suggestions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.business_profiles(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete cascade,
  suggestion_type text,
  title text,
  message text,
  description text,
  action_label text,
  action_href text,
  priority text not null default 'normal',
  status text not null default 'active',
  source text not null default 'rule_based',
  metadata jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.birdy_suggestions
  add column if not exists business_id uuid,
  add column if not exists owner_id uuid,
  add column if not exists suggestion_type text,
  add column if not exists title text,
  add column if not exists message text,
  add column if not exists description text,
  add column if not exists action_label text,
  add column if not exists action_href text,
  add column if not exists priority text default 'normal',
  add column if not exists status text default 'active',
  add column if not exists source text default 'rule_based',
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists completed_at timestamptz,
  add column if not exists dismissed_at timestamptz,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.birdy_suggestions
  alter column priority set default 'normal',
  alter column status set default 'active',
  alter column source set default 'rule_based',
  alter column metadata set default '{}'::jsonb,
  alter column created_at set default now(),
  alter column updated_at set default now();

update public.birdy_suggestions
set
  priority = coalesce(priority, 'normal'),
  source = coalesce(source, 'rule_based'),
  metadata = coalesce(metadata, '{}'::jsonb),
  description = coalesce(description, message),
  status = case
    when status is null or status = 'open' then 'active'
    else status
  end;

create index if not exists birdy_suggestions_business_id_idx
  on public.birdy_suggestions(business_id);

create index if not exists birdy_suggestions_status_idx
  on public.birdy_suggestions(status);

create index if not exists birdy_suggestions_created_at_idx
  on public.birdy_suggestions(created_at desc);

alter table public.birdy_suggestions enable row level security;

drop policy if exists
  "Users can manage their own Birdy suggestions"
  on public.birdy_suggestions;

drop policy if exists
  "Business owners can view birdy suggestions"
  on public.birdy_suggestions;

drop policy if exists
  "Business owners can insert birdy suggestions"
  on public.birdy_suggestions;

drop policy if exists
  "Business owners can update birdy suggestions"
  on public.birdy_suggestions;

create policy "Business owners can view birdy suggestions"
on public.birdy_suggestions
for select
to authenticated
using (
  exists (
    select 1
    from public.business_profiles
    where business_profiles.id =
      birdy_suggestions.business_id
      and business_profiles.owner_id = auth.uid()
  )
);

create policy "Business owners can insert birdy suggestions"
on public.birdy_suggestions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.business_profiles
    where business_profiles.id =
      birdy_suggestions.business_id
      and business_profiles.owner_id = auth.uid()
  )
);

create policy "Business owners can update birdy suggestions"
on public.birdy_suggestions
for update
to authenticated
using (
  exists (
    select 1
    from public.business_profiles
    where business_profiles.id =
      birdy_suggestions.business_id
      and business_profiles.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.business_profiles
    where business_profiles.id =
      birdy_suggestions.business_id
      and business_profiles.owner_id = auth.uid()
  )
);

commit;
