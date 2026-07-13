-- SchedNest Teams schedule + availability

create table if not exists public.team_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.team_workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  event_type text not null default 'meeting'
    check (event_type in ('meeting', 'shift', 'deadline', 'time_off', 'other')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  assignee_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_availability (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.team_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  available_from time,
  available_until time,
  is_unavailable boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, user_id, day_of_week)
);

alter table public.team_events enable row level security;
alter table public.team_availability enable row level security;

drop policy if exists "team_events_select" on public.team_events;
create policy "team_events_select"
on public.team_events for select
to authenticated
using (
  public.is_team_workspace_owner(workspace_id)
  or public.is_active_team_member(workspace_id)
);

drop policy if exists "team_events_insert" on public.team_events;
create policy "team_events_insert"
on public.team_events for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    public.is_team_workspace_owner(workspace_id)
    or public.is_active_team_member(workspace_id)
  )
);

drop policy if exists "team_events_update" on public.team_events;
create policy "team_events_update"
on public.team_events for update
to authenticated
using (
  public.is_team_workspace_owner(workspace_id)
  or public.is_active_team_member(workspace_id)
)
with check (
  public.is_team_workspace_owner(workspace_id)
  or public.is_active_team_member(workspace_id)
);

drop policy if exists "team_events_delete" on public.team_events;
create policy "team_events_delete"
on public.team_events for delete
to authenticated
using (
  public.is_team_workspace_owner(workspace_id)
  or created_by = auth.uid()
);

drop policy if exists "team_availability_select" on public.team_availability;
create policy "team_availability_select"
on public.team_availability for select
to authenticated
using (
  public.is_team_workspace_owner(workspace_id)
  or public.is_active_team_member(workspace_id)
);

drop policy if exists "team_availability_insert" on public.team_availability;
create policy "team_availability_insert"
on public.team_availability for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    public.is_team_workspace_owner(workspace_id)
    or public.is_active_team_member(workspace_id)
  )
);

drop policy if exists "team_availability_update" on public.team_availability;
create policy "team_availability_update"
on public.team_availability for update
to authenticated
using (
  user_id = auth.uid()
  or public.is_team_workspace_owner(workspace_id)
)
with check (
  user_id = auth.uid()
  or public.is_team_workspace_owner(workspace_id)
);

drop policy if exists "team_availability_delete" on public.team_availability;
create policy "team_availability_delete"
on public.team_availability for delete
to authenticated
using (
  user_id = auth.uid()
  or public.is_team_workspace_owner(workspace_id)
);

create index if not exists team_events_workspace_starts_idx
  on public.team_events(workspace_id, starts_at);

create index if not exists team_availability_workspace_user_idx
  on public.team_availability(workspace_id, user_id);
