-- SchedNest Platform v1: Birdy Schedule Optimizer
-- Suggestions only. This migration does not auto-edit user schedules.

create or replace function public.generate_birdy_schedule_recommendations(
  target_owner_id uuid
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  generated_count integer := 0;
begin
  if target_owner_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;

  -- Recommend moving movable/preferred items involved in open time conflicts.
  insert into public.birdy_action_decisions (
    owner_id,
    product,
    action_key,
    resource_type,
    resource_id,
    recommendation,
    explanation,
    confidence,
    alternatives,
    constraints,
    status,
    metadata
  )
  select
    target_owner_id,
    movable_item.product,
    'resolve_schedule_conflict',
    'coordination_item',
    movable_item.id,
    'Move "' || movable_item.title || '" to resolve a schedule conflict.',
    coalesce(conflict.explanation, 'This item overlaps with another scheduled item.')
      || ' Birdy selected this item because it is marked '
      || movable_item.flexibility || '.',
    case
      when conflict.severity = 'critical' then 0.9000
      else 0.7500
    end,
    jsonb_build_array(
      jsonb_build_object(
        'type', 'move_item',
        'item_id', movable_item.id,
        'title', movable_item.title,
        'earliest_start', movable_item.earliest_start,
        'latest_end', movable_item.latest_end
      ),
      jsonb_build_object(
        'type', 'keep_schedule',
        'title', 'Keep current schedule'
      )
    ),
    jsonb_build_array(
      jsonb_build_object('name', 'user_locked', 'value', movable_item.user_locked),
      jsonb_build_object('name', 'flexibility', 'value', movable_item.flexibility)
    ),
    'pending',
    jsonb_build_object(
      'conflict_id', conflict.id,
      'severity', conflict.severity,
      'generated_by', 'birdy_optimizer_v1'
    )
  from public.coordination_conflicts conflict
  join lateral (
    select item.*
    from public.coordination_items item
    where item.id in (conflict.first_item_id, conflict.second_item_id)
      and item.owner_id = target_owner_id
      and item.status = 'active'
      and item.user_locked = false
      and item.flexibility in ('movable', 'preferred')
    order by
      case item.flexibility
        when 'movable' then 1
        when 'preferred' then 2
        else 3
      end,
      item.priority asc
    limit 1
  ) movable_item on true
  where conflict.owner_id = target_owner_id
    and conflict.status = 'open'
    and not exists (
      select 1
      from public.birdy_action_decisions existing
      where existing.owner_id = target_owner_id
        and existing.action_key = 'resolve_schedule_conflict'
        and existing.resource_id = movable_item.id
        and existing.status = 'pending'
        and existing.metadata ->> 'conflict_id' = conflict.id::text
    );

  get diagnostics generated_count = row_count;

  -- Recommend scheduling unscheduled movable items that have a due date.
  insert into public.birdy_action_decisions (
    owner_id,
    product,
    action_key,
    resource_type,
    resource_id,
    recommendation,
    explanation,
    confidence,
    alternatives,
    constraints,
    status,
    metadata
  )
  select
    target_owner_id,
    item.product,
    'schedule_unscheduled_item',
    'coordination_item',
    item.id,
    'Schedule "' || item.title || '" before its due date.',
    'This item has a due date but no scheduled start time. Birdy recommends placing it on the calendar before '
      || to_char(item.due_at, 'Mon DD, YYYY at HH12:MI AM') || '.',
    0.7000,
    jsonb_build_array(
      jsonb_build_object(
        'type', 'find_time',
        'item_id', item.id,
        'expected_duration_minutes', item.expected_duration_minutes,
        'earliest_start', item.earliest_start,
        'latest_end', coalesce(item.latest_end, item.due_at)
      ),
      jsonb_build_object(
        'type', 'leave_unscheduled',
        'title', 'Leave unscheduled'
      )
    ),
    jsonb_build_array(
      jsonb_build_object('name', 'due_at', 'value', item.due_at),
      jsonb_build_object('name', 'priority', 'value', item.priority)
    ),
    'pending',
    jsonb_build_object(
      'generated_by', 'birdy_optimizer_v1',
      'reason', 'unscheduled_due_item'
    )
  from public.coordination_items item
  where item.owner_id = target_owner_id
    and item.status = 'active'
    and item.starts_at is null
    and item.due_at is not null
    and item.flexibility in ('movable', 'preferred')
    and item.user_locked = false
    and not exists (
      select 1
      from public.birdy_action_decisions existing
      where existing.owner_id = target_owner_id
        and existing.action_key = 'schedule_unscheduled_item'
        and existing.resource_id = item.id
        and existing.status = 'pending'
    );

  get diagnostics generated_count = generated_count + row_count;

  return generated_count;
end;
$$;

grant execute on function public.generate_birdy_schedule_recommendations(uuid)
to authenticated;
