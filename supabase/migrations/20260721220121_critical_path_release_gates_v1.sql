begin;

alter table public.coordination_items
  add column if not exists work_item_key text,
  add column if not exists milestone_key text,
  add column if not exists blocker_reason text,
  add column if not exists risk_level text not null default 'medium',
  add column if not exists severity text not null default 'normal',
  add column if not exists remaining_duration_minutes integer,
  add column if not exists earliest_calculated_start timestamptz,
  add column if not exists earliest_calculated_finish timestamptz,
  add column if not exists latest_calculated_start timestamptz,
  add column if not exists latest_calculated_finish timestamptz,
  add column if not exists schedule_slack_minutes integer,
  add column if not exists is_critical_path boolean not null default false,
  add column if not exists calculation_version integer not null default 0,
  add column if not exists calculated_at timestamptz;

alter table public.coordination_items
  drop constraint if exists coordination_items_risk_level_check;

alter table public.coordination_items
  add constraint coordination_items_risk_level_check
  check (risk_level in ('low', 'medium', 'high', 'critical'));

alter table public.coordination_items
  drop constraint if exists coordination_items_severity_check;

alter table public.coordination_items
  add constraint coordination_items_severity_check
  check (severity in ('normal', 'warning', 'high', 'critical'));

alter table public.coordination_items
  drop constraint if exists coordination_items_remaining_duration_check;

alter table public.coordination_items
  add constraint coordination_items_remaining_duration_check
  check (remaining_duration_minutes is null or remaining_duration_minutes >= 0);

create unique index if not exists coordination_items_owner_work_item_key_unique
  on public.coordination_items(owner_id, work_item_key)
  where work_item_key is not null;

create index if not exists coordination_items_critical_path_idx
  on public.coordination_items(owner_id, is_critical_path, status);

create index if not exists coordination_items_milestone_idx
  on public.coordination_items(owner_id, milestone_key, status);

create table if not exists public.coordination_dependencies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  predecessor_item_id uuid not null references public.coordination_items(id) on delete cascade,
  successor_item_id uuid not null references public.coordination_items(id) on delete cascade,
  dependency_type text not null default 'finish_to_start',
  lag_minutes integer not null default 0,
  is_blocking boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (predecessor_item_id <> successor_item_id),
  check (dependency_type in ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')),
  unique(predecessor_item_id, successor_item_id, dependency_type)
);

create index if not exists coordination_dependencies_owner_idx
  on public.coordination_dependencies(owner_id);

create index if not exists coordination_dependencies_predecessor_idx
  on public.coordination_dependencies(predecessor_item_id);

create index if not exists coordination_dependencies_successor_idx
  on public.coordination_dependencies(successor_item_id);

alter table public.coordination_dependencies enable row level security;

drop policy if exists "coordination_dependencies_owner_all"
  on public.coordination_dependencies;

create policy "coordination_dependencies_owner_all"
on public.coordination_dependencies
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create or replace function public.validate_coordination_dependency_owner()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  predecessor_owner uuid;
  successor_owner uuid;
begin
  select owner_id into predecessor_owner
  from public.coordination_items
  where id = new.predecessor_item_id;

  select owner_id into successor_owner
  from public.coordination_items
  where id = new.successor_item_id;

  if predecessor_owner is null or successor_owner is null then
    raise exception 'Dependency items were not found';
  end if;

  if predecessor_owner <> successor_owner then
    raise exception 'Dependency items must have the same owner';
  end if;

  if new.owner_id <> predecessor_owner then
    raise exception 'Dependency owner must match the item owner';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_coordination_dependency_owner_trigger
  on public.coordination_dependencies;

create trigger validate_coordination_dependency_owner_trigger
before insert or update on public.coordination_dependencies
for each row
execute function public.validate_coordination_dependency_owner();

create or replace function public.prevent_coordination_dependency_cycle()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  cycle_found boolean;
begin
  with recursive reachable_items(item_id) as (
    select dependency.successor_item_id
    from public.coordination_dependencies dependency
    where dependency.owner_id = new.owner_id
      and dependency.predecessor_item_id = new.successor_item_id
      and (tg_op = 'INSERT' or dependency.id <> new.id)

    union

    select dependency.successor_item_id
    from public.coordination_dependencies dependency
    join reachable_items reachable
      on dependency.predecessor_item_id = reachable.item_id
    where dependency.owner_id = new.owner_id
      and (tg_op = 'INSERT' or dependency.id <> new.id)
  )
  select exists (
    select 1
    from reachable_items
    where item_id = new.predecessor_item_id
  )
  into cycle_found;

  if cycle_found then
    raise exception 'Coordination dependency would create a cycle';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_coordination_dependency_cycle_trigger
  on public.coordination_dependencies;

create trigger prevent_coordination_dependency_cycle_trigger
before insert or update on public.coordination_dependencies
for each row
execute function public.prevent_coordination_dependency_cycle();

create table if not exists public.coordination_milestones (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  milestone_key text not null,
  title text not null,
  description text,
  target_at timestamptz,
  status text not null default 'planned',
  completion_percent integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status in ('planned', 'active', 'blocked', 'completed', 'cancelled')),
  check (completion_percent between 0 and 100),
  unique(owner_id, milestone_key)
);

create table if not exists public.coordination_release_gates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  gate_key text not null,
  title text not null,
  description text,
  milestone_id uuid references public.coordination_milestones(id) on delete set null,
  status text not null default 'pending',
  required boolean not null default true,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  rejection_reason text,
  evidence jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status in ('pending', 'passing', 'failed', 'waived', 'approved')),
  unique(owner_id, gate_key)
);

create index if not exists coordination_milestones_owner_status_idx
  on public.coordination_milestones(owner_id, status, target_at);

create index if not exists coordination_release_gates_owner_status_idx
  on public.coordination_release_gates(owner_id, status, required);

alter table public.coordination_milestones enable row level security;
alter table public.coordination_release_gates enable row level security;

drop policy if exists "coordination_milestones_owner_all"
  on public.coordination_milestones;

create policy "coordination_milestones_owner_all"
on public.coordination_milestones
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "coordination_release_gates_owner_all"
  on public.coordination_release_gates;

create policy "coordination_release_gates_owner_all"
on public.coordination_release_gates
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create or replace function public.validate_coordination_release_gate()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  linked_milestone_owner uuid;
begin
  if new.milestone_id is not null then
    select owner_id into linked_milestone_owner
    from public.coordination_milestones
    where id = new.milestone_id;

    if linked_milestone_owner is null then
      raise exception 'Release-gate milestone was not found';
    end if;

    if linked_milestone_owner <> new.owner_id then
      raise exception 'Release gate and milestone must have the same owner';
    end if;
  end if;

  if new.status = 'approved' then
    if new.approved_by is null then
      new.approved_by := auth.uid();
    end if;

    if new.approved_at is null then
      new.approved_at := now();
    end if;
  elsif new.status <> 'approved' then
    new.approved_by := null;
    new.approved_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_coordination_release_gate_trigger
  on public.coordination_release_gates;

create trigger validate_coordination_release_gate_trigger
before insert or update on public.coordination_release_gates
for each row
execute function public.validate_coordination_release_gate();

create or replace function public.refresh_coordination_critical_path(
  target_owner_id uuid
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  base_at timestamptz := date_trunc('minute', now());
  project_duration integer := 0;
  updated_count integer := 0;
begin
  if target_owner_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;

  create temporary table if not exists coordination_path_calculation (
    item_id uuid primary key,
    duration_minutes integer not null,
    earliest_offset integer not null default 0,
    remaining_path_minutes integer not null default 0
  ) on commit drop;

  truncate table coordination_path_calculation;

  insert into coordination_path_calculation (item_id, duration_minutes)
  select
    item.id,
    greatest(
      0,
      coalesce(
        item.remaining_duration_minutes,
        item.expected_duration_minutes,
        item.minimum_duration_minutes,
        case
          when item.starts_at is not null and item.ends_at is not null
          then ceil(extract(epoch from (item.ends_at - item.starts_at)) / 60.0)::integer
          else 0
        end
      )
    )
  from public.coordination_items item
  where item.owner_id = target_owner_id
    and item.status not in ('cancelled', 'archived');

  with recursive forward_paths(item_id, offset_minutes) as (
    select calculation.item_id, 0
    from coordination_path_calculation calculation
    where not exists (
      select 1
      from public.coordination_dependencies dependency
      where dependency.owner_id = target_owner_id
        and dependency.successor_item_id = calculation.item_id
        and dependency.is_blocking
        and dependency.dependency_type = 'finish_to_start'
    )

    union all

    select
      dependency.successor_item_id,
      path.offset_minutes + predecessor.duration_minutes + dependency.lag_minutes
    from forward_paths path
    join coordination_path_calculation predecessor
      on predecessor.item_id = path.item_id
    join public.coordination_dependencies dependency
      on dependency.predecessor_item_id = path.item_id
     and dependency.owner_id = target_owner_id
     and dependency.is_blocking
     and dependency.dependency_type = 'finish_to_start'
  ),
  maximum_offsets as (
    select item_id, max(offset_minutes)::integer as offset_minutes
    from forward_paths
    group by item_id
  )
  update coordination_path_calculation calculation
  set earliest_offset = maximum_offsets.offset_minutes
  from maximum_offsets
  where maximum_offsets.item_id = calculation.item_id;

  with recursive reverse_paths(item_id, path_minutes) as (
    select calculation.item_id, 0
    from coordination_path_calculation calculation
    where not exists (
      select 1
      from public.coordination_dependencies dependency
      where dependency.owner_id = target_owner_id
        and dependency.predecessor_item_id = calculation.item_id
        and dependency.is_blocking
        and dependency.dependency_type = 'finish_to_start'
    )

    union all

    select
      dependency.predecessor_item_id,
      path.path_minutes + successor.duration_minutes + dependency.lag_minutes
    from reverse_paths path
    join coordination_path_calculation successor
      on successor.item_id = path.item_id
    join public.coordination_dependencies dependency
      on dependency.successor_item_id = path.item_id
     and dependency.owner_id = target_owner_id
     and dependency.is_blocking
     and dependency.dependency_type = 'finish_to_start'
  ),
  maximum_remaining_paths as (
    select item_id, max(path_minutes)::integer as path_minutes
    from reverse_paths
    group by item_id
  )
  update coordination_path_calculation calculation
  set remaining_path_minutes = maximum_remaining_paths.path_minutes
  from maximum_remaining_paths
  where maximum_remaining_paths.item_id = calculation.item_id;

  select coalesce(max(earliest_offset + duration_minutes), 0)
  into project_duration
  from coordination_path_calculation;

  update public.coordination_items item
  set
    earliest_calculated_start = base_at + calculation.earliest_offset * interval '1 minute',
    earliest_calculated_finish = base_at + (calculation.earliest_offset + calculation.duration_minutes) * interval '1 minute',
    latest_calculated_finish = base_at + (project_duration - calculation.remaining_path_minutes) * interval '1 minute',
    latest_calculated_start = base_at + (project_duration - calculation.remaining_path_minutes - calculation.duration_minutes) * interval '1 minute',
    schedule_slack_minutes = greatest(
      0,
      project_duration - calculation.earliest_offset - calculation.duration_minutes - calculation.remaining_path_minutes
    ),
    is_critical_path = (
      project_duration - calculation.earliest_offset - calculation.duration_minutes - calculation.remaining_path_minutes = 0
    ),
    calculation_version = item.calculation_version + 1,
    calculated_at = now()
  from coordination_path_calculation calculation
  where item.id = calculation.item_id
    and item.owner_id = target_owner_id;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

grant execute on function public.refresh_coordination_critical_path(uuid)
to authenticated;

create or replace function public.get_coordination_release_readiness(
  target_owner_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  result jsonb;
begin
  if target_owner_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;

  select jsonb_build_object(
    'total_items', count(*),
    'completed_items', count(*) filter (where item.status = 'completed'),
    'blocked_items', count(*) filter (where item.blocker_reason is not null),
    'critical_path_items', count(*) filter (where item.is_critical_path),
    'high_risk_items', count(*) filter (where item.risk_level in ('high', 'critical')),
    'high_severity_items', count(*) filter (where item.severity in ('high', 'critical')),
    'completion_percent',
      case
        when count(*) = 0 then 0
        else round(
          100.0 * count(*) filter (where item.status = 'completed') / count(*)
        )
      end,
    'required_gates', (
      select count(*)
      from public.coordination_release_gates gate_record
      where gate_record.owner_id = target_owner_id
        and gate_record.required
    ),
    'approved_required_gates', (
      select count(*)
      from public.coordination_release_gates gate_record
      where gate_record.owner_id = target_owner_id
        and gate_record.required
        and gate_record.status in ('approved', 'waived')
    ),
    'failed_required_gates', (
      select count(*)
      from public.coordination_release_gates gate_record
      where gate_record.owner_id = target_owner_id
        and gate_record.required
        and gate_record.status = 'failed'
    ),
    'release_ready',
      count(*) filter (
        where item.status <> 'completed'
          and item.severity in ('high', 'critical')
      ) = 0
      and not exists (
        select 1
        from public.coordination_release_gates gate_record
        where gate_record.owner_id = target_owner_id
          and gate_record.required
          and gate_record.status not in ('approved', 'waived')
      )
  )
  into result
  from public.coordination_items item
  where item.owner_id = target_owner_id
    and item.status not in ('cancelled', 'archived');

  return result;
end;
$$;

grant execute on function public.get_coordination_release_readiness(uuid)
to authenticated;

commit;
