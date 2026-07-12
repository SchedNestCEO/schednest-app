-- Normalize Teams task fields for Tasks + Workload

alter table public.team_tasks
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists description text,
  add column if not exists due_at timestamptz,
  add column if not exists priority text not null default 'medium',
  add column if not exists status text not null default 'todo',
  add column if not exists completed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists team_tasks_workspace_due_idx
  on public.team_tasks(workspace_id, due_at);

create index if not exists team_tasks_workspace_assignee_idx
  on public.team_tasks(workspace_id, assigned_to);

drop policy if exists "team_tasks_select" on public.team_tasks;
create policy "team_tasks_select"
on public.team_tasks
for select
to authenticated
using (
  public.is_team_workspace_owner(workspace_id)
  or public.is_active_team_member(workspace_id)
);

drop policy if exists "team_tasks_insert" on public.team_tasks;
create policy "team_tasks_insert"
on public.team_tasks
for insert
to authenticated
with check (
  public.is_team_workspace_owner(workspace_id)
  or public.is_active_team_member(workspace_id)
);

drop policy if exists "team_tasks_update" on public.team_tasks;
create policy "team_tasks_update"
on public.team_tasks
for update
to authenticated
using (
  public.is_team_workspace_owner(workspace_id)
  or public.is_active_team_member(workspace_id)
)
with check (
  public.is_team_workspace_owner(workspace_id)
  or public.is_active_team_member(workspace_id)
);

drop policy if exists "team_tasks_delete" on public.team_tasks;
create policy "team_tasks_delete"
on public.team_tasks
for delete
to authenticated
using (
  public.is_team_workspace_owner(workspace_id)
  or public.is_active_team_member(workspace_id)
);
