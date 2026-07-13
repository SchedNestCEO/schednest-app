-- SchedNest Platform v1: Universal Activity Timeline

create table if not exists public.platform_activity_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  product text not null
    check (product in ('platform', 'student', 'teams', 'med', 'business', 'life')),
  event_type text not null,
  action text not null,
  resource_type text,
  resource_id uuid,
  title text not null,
  description text,
  severity text not null default 'info'
    check (severity in ('info', 'success', 'warning', 'critical')),
  source text not null default 'user'
    check (source in ('user', 'system', 'birdy', 'integration')),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists platform_activity_owner_occurred_idx
  on public.platform_activity_events(owner_id, occurred_at desc);

create index if not exists platform_activity_product_idx
  on public.platform_activity_events(owner_id, product, occurred_at desc);

create index if not exists platform_activity_resource_idx
  on public.platform_activity_events(resource_type, resource_id);

alter table public.platform_activity_events enable row level security;

drop policy if exists "platform_activity_owner_select"
on public.platform_activity_events;

create policy "platform_activity_owner_select"
on public.platform_activity_events
for select
to authenticated
using (
  owner_id = auth.uid()
  or actor_user_id = auth.uid()
);

drop policy if exists "platform_activity_owner_insert"
on public.platform_activity_events;

create policy "platform_activity_owner_insert"
on public.platform_activity_events
for insert
to authenticated
with check (
  actor_user_id = auth.uid()
  or owner_id = auth.uid()
);

drop policy if exists "platform_activity_owner_delete"
on public.platform_activity_events;

create policy "platform_activity_owner_delete"
on public.platform_activity_events
for delete
to authenticated
using (owner_id = auth.uid());

create or replace function public.create_platform_activity_event(
  p_owner_id uuid,
  p_product text,
  p_event_type text,
  p_action text,
  p_title text,
  p_description text default null,
  p_resource_type text default null,
  p_resource_id uuid default null,
  p_severity text default 'info',
  p_source text default 'user',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into public.platform_activity_events (
    actor_user_id,
    owner_id,
    product,
    event_type,
    action,
    resource_type,
    resource_id,
    title,
    description,
    severity,
    source,
    metadata
  )
  values (
    auth.uid(),
    p_owner_id,
    p_product,
    p_event_type,
    p_action,
    p_resource_type,
    p_resource_id,
    p_title,
    p_description,
    p_severity,
    p_source,
    p_metadata
  )
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.create_platform_activity_event(
  uuid, text, text, text, text, text, text, uuid, text, text, jsonb
) to authenticated;
