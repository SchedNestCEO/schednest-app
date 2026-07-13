-- SchedNest Platform v1: Birdy Action Permissions

create table if not exists public.birdy_action_permissions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  product text not null
    check (product in ('platform', 'student', 'teams', 'med', 'business', 'life')),
  action_key text not null,
  permission_level text not null default 'recommend'
    check (permission_level in ('observe', 'recommend', 'ask', 'execute', 'never')),
  risk_level text not null default 'low'
    check (risk_level in ('low', 'medium', 'high', 'prohibited')),
  requires_confirmation boolean not null default true,
  auto_execute_window jsonb not null default '{}'::jsonb,
  conditions jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, product, action_key)
);

create table if not exists public.birdy_action_decisions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  product text not null
    check (product in ('platform', 'student', 'teams', 'med', 'business', 'life')),
  action_key text not null,
  resource_type text,
  resource_id uuid,
  recommendation text not null,
  explanation text,
  confidence numeric(5,4) not null default 0.5000
    check (confidence >= 0 and confidence <= 1),
  alternatives jsonb not null default '[]'::jsonb,
  constraints jsonb not null default '[]'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'executed', 'cancelled', 'expired')),
  decided_at timestamptz,
  executed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists birdy_action_permissions_owner_idx
  on public.birdy_action_permissions(owner_id, product, action_key);

create index if not exists birdy_action_decisions_owner_status_idx
  on public.birdy_action_decisions(owner_id, status, created_at desc);

alter table public.birdy_action_permissions enable row level security;
alter table public.birdy_action_decisions enable row level security;

drop policy if exists "birdy_action_permissions_owner_all"
on public.birdy_action_permissions;

create policy "birdy_action_permissions_owner_all"
on public.birdy_action_permissions
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "birdy_action_decisions_owner_all"
on public.birdy_action_decisions;

create policy "birdy_action_decisions_owner_all"
on public.birdy_action_decisions
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create or replace function public.decide_birdy_action(
  target_decision_id uuid,
  decision_status text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if decision_status not in ('approved', 'rejected', 'cancelled') then
    raise exception 'Invalid decision status';
  end if;

  update public.birdy_action_decisions
  set
    status = decision_status,
    decided_at = now(),
    updated_at = now()
  where id = target_decision_id
    and owner_id = auth.uid()
    and status = 'pending';
end;
$$;

grant execute on function public.decide_birdy_action(uuid, text)
to authenticated;
