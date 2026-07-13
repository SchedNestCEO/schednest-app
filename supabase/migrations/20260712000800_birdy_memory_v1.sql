-- SchedNest Platform v1: Birdy Memory

create table if not exists public.birdy_memories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  product text not null
    check (product in ('platform', 'student', 'teams', 'med', 'business', 'life')),
  memory_type text not null
    check (memory_type in ('session', 'preference', 'behavioral', 'domain', 'sensitive')),
  title text not null,
  content text not null,
  source text not null default 'user'
    check (source in ('user', 'system', 'birdy', 'integration')),
  confidence numeric(5,4) not null default 1.0000
    check (confidence >= 0 and confidence <= 1),
  sensitivity text not null default 'standard'
    check (sensitivity in ('standard', 'personal', 'sensitive', 'restricted')),
  is_active boolean not null default true,
  is_user_confirmed boolean not null default false,
  last_used_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.birdy_memory_settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  learning_enabled boolean not null default true,
  preference_memory_enabled boolean not null default true,
  behavioral_memory_enabled boolean not null default true,
  domain_memory_enabled boolean not null default true,
  sensitive_memory_enabled boolean not null default false,
  auto_confirm_low_risk boolean not null default false,
  retention_days integer,
  product_overrides jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id)
);

create index if not exists birdy_memories_owner_active_idx
  on public.birdy_memories(owner_id, is_active, updated_at desc);

create index if not exists birdy_memories_product_type_idx
  on public.birdy_memories(owner_id, product, memory_type);

alter table public.birdy_memories enable row level security;
alter table public.birdy_memory_settings enable row level security;

drop policy if exists "birdy_memories_owner_all" on public.birdy_memories;
create policy "birdy_memories_owner_all"
on public.birdy_memories
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "birdy_memory_settings_owner_all"
on public.birdy_memory_settings;
create policy "birdy_memory_settings_owner_all"
on public.birdy_memory_settings
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create or replace function public.confirm_birdy_memory(
  target_memory_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.birdy_memories
  set
    is_user_confirmed = true,
    updated_at = now()
  where id = target_memory_id
    and owner_id = auth.uid();
end;
$$;

grant execute on function public.confirm_birdy_memory(uuid)
to authenticated;

create or replace function public.archive_birdy_memory(
  target_memory_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.birdy_memories
  set
    is_active = false,
    updated_at = now()
  where id = target_memory_id
    and owner_id = auth.uid();
end;
$$;

grant execute on function public.archive_birdy_memory(uuid)
to authenticated;
