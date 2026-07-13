-- SchedNest Platform v1: Privacy Controls

create table if not exists public.platform_consents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  consent_key text not null,
  status text not null default 'not_granted'
    check (status in ('granted', 'not_granted', 'withdrawn')),
  version text not null default '1.0',
  source text not null default 'settings',
  granted_at timestamptz,
  withdrawn_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, consent_key)
);

create table if not exists public.platform_data_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null
    check (request_type in ('export', 'delete_account', 'delete_product_data', 'correct_data')),
  product text
    check (product is null or product in ('platform', 'student', 'teams', 'med', 'business', 'life')),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'rejected', 'cancelled')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.platform_consents enable row level security;
alter table public.platform_data_requests enable row level security;

drop policy if exists "platform_consents_owner_all" on public.platform_consents;
create policy "platform_consents_owner_all"
on public.platform_consents
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "platform_data_requests_owner_all" on public.platform_data_requests;
create policy "platform_data_requests_owner_all"
on public.platform_data_requests
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
