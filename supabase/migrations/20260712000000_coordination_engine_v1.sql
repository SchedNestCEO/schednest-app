-- SchedNest Platform v1: Universal Coordination Engine

create table if not exists public.coordination_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  product text not null
    check (product in ('platform', 'student', 'teams', 'med', 'business', 'life')),
  item_type text not null,
  source_table text,
  source_id uuid,
  title text not null,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  due_at timestamptz,
  timezone text not null default 'UTC',
  priority integer not null default 3 check (priority between 1 and 5),
  flexibility text not null default 'fixed'
    check (flexibility in ('fixed', 'movable', 'preferred')),
  minimum_duration_minutes integer,
  expected_duration_minutes integer,
  maximum_duration_minutes integer,
  earliest_start timestamptz,
  latest_end timestamptz,
  location text,
  participants jsonb not null default '[]'::jsonb,
  dependencies jsonb not null default '[]'::jsonb,
  status text not null default 'active'
    check (status in ('active', 'completed', 'cancelled', 'archived')),
  ai_generated boolean not null default false,
  user_locked boolean not null default false,
  confidence numeric(5,4) not null default 1.0000
    check (confidence >= 0 and confidence <= 1),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coordination_conflicts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  first_item_id uuid not null references public.coordination_items(id) on delete cascade,
  second_item_id uuid not null references public.coordination_items(id) on delete cascade,
  conflict_type text not null
    check (conflict_type in ('time_overlap', 'dependency', 'travel_buffer', 'resource', 'availability')),
  severity text not null default 'warning'
    check (severity in ('info', 'warning', 'critical')),
  status text not null default 'open'
    check (status in ('open', 'ignored', 'resolved')),
  explanation text,
  suggested_resolution jsonb not null default '{}'::jsonb,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique(first_item_id, second_item_id, conflict_type)
);

create index if not exists coordination_items_owner_schedule_idx
  on public.coordination_items(owner_id, starts_at, due_at);

create index if not exists coordination_items_source_idx
  on public.coordination_items(source_table, source_id);

create index if not exists coordination_items_product_idx
  on public.coordination_items(owner_id, product, status);

create index if not exists coordination_conflicts_owner_status_idx
  on public.coordination_conflicts(owner_id, status, detected_at desc);

alter table public.coordination_items enable row level security;
alter table public.coordination_conflicts enable row level security;

drop policy if exists "coordination_items_owner_all" on public.coordination_items;
create policy "coordination_items_owner_all"
on public.coordination_items
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "coordination_conflicts_owner_all"
on public.coordination_conflicts;
create policy "coordination_conflicts_owner_all"
on public.coordination_conflicts
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create or replace function public.detect_coordination_time_conflicts(
  target_owner_id uuid
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  inserted_count integer := 0;
begin
  if target_owner_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;

  insert into public.coordination_conflicts (
    owner_id,
    first_item_id,
    second_item_id,
    conflict_type,
    severity,
    explanation,
    suggested_resolution
  )
  select
    target_owner_id,
    first_item.id,
    second_item.id,
    'time_overlap',
    case
      when first_item.flexibility = 'fixed'
       and second_item.flexibility = 'fixed'
      then 'critical'
      else 'warning'
    end,
    first_item.title || ' overlaps with ' || second_item.title,
    jsonb_build_object(
      'action', 'review_schedule',
      'movable_item_id',
      case
        when first_item.flexibility <> 'fixed' then first_item.id
        when second_item.flexibility <> 'fixed' then second_item.id
        else null
      end
    )
  from public.coordination_items first_item
  join public.coordination_items second_item
    on first_item.owner_id = second_item.owner_id
   and first_item.id < second_item.id
   and first_item.status = 'active'
   and second_item.status = 'active'
   and first_item.starts_at is not null
   and first_item.ends_at is not null
   and second_item.starts_at is not null
   and second_item.ends_at is not null
   and first_item.starts_at < second_item.ends_at
   and second_item.starts_at < first_item.ends_at
  where first_item.owner_id = target_owner_id
  on conflict (first_item_id, second_item_id, conflict_type)
  do update set
    severity = excluded.severity,
    explanation = excluded.explanation,
    suggested_resolution = excluded.suggested_resolution,
    status = 'open',
    detected_at = now();

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

grant execute on function public.detect_coordination_time_conflicts(uuid)
to authenticated;
