-- SchedNest Platform v1: Connector Framework

create table if not exists public.platform_connectors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  connector_type text not null
    check (connector_type in ('calendar', 'lms', 'communication', 'storage', 'health', 'business', 'custom')),
  product text not null
    check (product in ('platform', 'student', 'teams', 'med', 'business', 'life')),
  display_name text not null,
  status text not null default 'disconnected'
    check (status in ('disconnected', 'connecting', 'connected', 'error', 'revoked')),
  external_account_id text,
  scopes jsonb not null default '[]'::jsonb,
  config jsonb not null default '{}'::jsonb,
  credentials_reference text,
  last_sync_at timestamptz,
  next_sync_at timestamptz,
  sync_cursor text,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, provider, product)
);

create table if not exists public.platform_connector_sync_runs (
  id uuid primary key default gen_random_uuid(),
  connector_id uuid not null references public.platform_connectors(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  direction text not null default 'import'
    check (direction in ('import', 'export', 'bidirectional')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'partial', 'failed', 'cancelled')),
  items_read integer not null default 0,
  items_created integer not null default 0,
  items_updated integer not null default 0,
  items_failed integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists platform_connectors_owner_idx
  on public.platform_connectors(owner_id, status, provider);

create index if not exists platform_connector_runs_connector_idx
  on public.platform_connector_sync_runs(connector_id, created_at desc);

alter table public.platform_connectors enable row level security;
alter table public.platform_connector_sync_runs enable row level security;

drop policy if exists "platform_connectors_owner_all"
on public.platform_connectors;

create policy "platform_connectors_owner_all"
on public.platform_connectors
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "platform_connector_runs_owner_all"
on public.platform_connector_sync_runs;

create policy "platform_connector_runs_owner_all"
on public.platform_connector_sync_runs
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create or replace function public.revoke_platform_connector(
  target_connector_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.platform_connectors
  set
    status = 'revoked',
    credentials_reference = null,
    updated_at = now()
  where id = target_connector_id
    and owner_id = auth.uid();
end;
$$;

grant execute on function public.revoke_platform_connector(uuid)
to authenticated;
