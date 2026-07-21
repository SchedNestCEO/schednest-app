begin;

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
  if auth.uid() is null or target_owner_id <> auth.uid() then
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

revoke all on function public.refresh_coordination_critical_path(uuid) from public;
revoke all on function public.refresh_coordination_critical_path(uuid) from anon;
grant execute on function public.refresh_coordination_critical_path(uuid) to authenticated;

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
  if auth.uid() is null or target_owner_id <> auth.uid() then
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
        else round(100.0 * count(*) filter (where item.status = 'completed') / count(*))
      end,
    'required_gates', (
      select count(*)
      from public.coordination_release_gates gate_record
      where gate_record.owner_id = target_owner_id and gate_record.required
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

revoke all on function public.get_coordination_release_readiness(uuid) from public;
revoke all on function public.get_coordination_release_readiness(uuid) from anon;
grant execute on function public.get_coordination_release_readiness(uuid) to authenticated;

commit;
