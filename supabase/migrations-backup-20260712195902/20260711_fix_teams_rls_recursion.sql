-- Fix recursive Teams RLS policies

create or replace function public.is_team_workspace_owner(
  target_workspace_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.team_workspaces
    where id = target_workspace_id
      and owner_id = auth.uid()
  );
$$;

create or replace function public.is_active_team_member(
  target_workspace_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.team_memberships
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

revoke all on function public.is_team_workspace_owner(uuid) from public;
revoke all on function public.is_active_team_member(uuid) from public;

grant execute on function public.is_team_workspace_owner(uuid) to authenticated;
grant execute on function public.is_active_team_member(uuid) to authenticated;

drop policy if exists "team_workspaces_member_select" on public.team_workspaces;
drop policy if exists "team_workspaces_owner_insert" on public.team_workspaces;
drop policy if exists "team_workspaces_owner_update" on public.team_workspaces;
drop policy if exists "team_workspaces_owner_delete" on public.team_workspaces;
drop policy if exists "team_memberships_workspace_select" on public.team_memberships;
drop policy if exists "team_memberships_owner_insert" on public.team_memberships;
drop policy if exists "team_memberships_owner_update" on public.team_memberships;
drop policy if exists "team_memberships_owner_delete" on public.team_memberships;
drop policy if exists "team_projects_member_all" on public.team_projects;
drop policy if exists "team_tasks_member_all" on public.team_tasks;
drop policy if exists "team_requests_member_all" on public.team_requests;

drop policy if exists "team_workspaces_select" on public.team_workspaces;
drop policy if exists "team_workspaces_insert" on public.team_workspaces;
drop policy if exists "team_workspaces_update" on public.team_workspaces;
drop policy if exists "team_workspaces_delete" on public.team_workspaces;
drop policy if exists "team_memberships_select" on public.team_memberships;
drop policy if exists "team_memberships_insert" on public.team_memberships;
drop policy if exists "team_memberships_update" on public.team_memberships;
drop policy if exists "team_memberships_delete" on public.team_memberships;
drop policy if exists "team_projects_select" on public.team_projects;
drop policy if exists "team_projects_insert" on public.team_projects;
drop policy if exists "team_projects_update" on public.team_projects;
drop policy if exists "team_projects_delete" on public.team_projects;
drop policy if exists "team_tasks_select" on public.team_tasks;
drop policy if exists "team_tasks_insert" on public.team_tasks;
drop policy if exists "team_tasks_update" on public.team_tasks;
drop policy if exists "team_tasks_delete" on public.team_tasks;
drop policy if exists "team_requests_select" on public.team_requests;
drop policy if exists "team_requests_insert" on public.team_requests;
drop policy if exists "team_requests_update" on public.team_requests;
drop policy if exists "team_requests_delete" on public.team_requests;

create policy "team_workspaces_select"
on public.team_workspaces for select
using (owner_id = auth.uid() or public.is_active_team_member(id));

create policy "team_workspaces_insert"
on public.team_workspaces for insert
with check (owner_id = auth.uid());

create policy "team_workspaces_update"
on public.team_workspaces for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "team_workspaces_delete"
on public.team_workspaces for delete
using (owner_id = auth.uid());

create policy "team_memberships_select"
on public.team_memberships for select
using (
  user_id = auth.uid()
  or public.is_team_workspace_owner(workspace_id)
  or public.is_active_team_member(workspace_id)
);

create policy "team_memberships_insert"
on public.team_memberships for insert
with check (public.is_team_workspace_owner(workspace_id));

create policy "team_memberships_update"
on public.team_memberships for update
using (public.is_team_workspace_owner(workspace_id))
with check (public.is_team_workspace_owner(workspace_id));

create policy "team_memberships_delete"
on public.team_memberships for delete
using (public.is_team_workspace_owner(workspace_id));

create policy "team_projects_select"
on public.team_projects for select
using (
  public.is_team_workspace_owner(workspace_id)
  or public.is_active_team_member(workspace_id)
);

create policy "team_projects_insert"
on public.team_projects for insert
with check (
  public.is_team_workspace_owner(workspace_id)
  or public.is_active_team_member(workspace_id)
);

create policy "team_projects_update"
on public.team_projects for update
using (
  public.is_team_workspace_owner(workspace_id)
  or public.is_active_team_member(workspace_id)
)
with check (
  public.is_team_workspace_owner(workspace_id)
  or public.is_active_team_member(workspace_id)
);

create policy "team_projects_delete"
on public.team_projects for delete
using (
  public.is_team_workspace_owner(workspace_id)
  or public.is_active_team_member(workspace_id)
);

create policy "team_tasks_select"
on public.team_tasks for select
using (
  public.is_team_workspace_owner(workspace_id)
  or public.is_active_team_member(workspace_id)
);

create policy "team_tasks_insert"
on public.team_tasks for insert
with check (
  public.is_team_workspace_owner(workspace_id)
  or public.is_active_team_member(workspace_id)
);

create policy "team_tasks_update"
on public.team_tasks for update
using (
  public.is_team_workspace_owner(workspace_id)
  or public.is_active_team_member(workspace_id)
)
with check (
  public.is_team_workspace_owner(workspace_id)
  or public.is_active_team_member(workspace_id)
);

create policy "team_tasks_delete"
on public.team_tasks for delete
using (
  public.is_team_workspace_owner(workspace_id)
  or public.is_active_team_member(workspace_id)
);

create policy "team_requests_select"
on public.team_requests for select
using (
  public.is_team_workspace_owner(workspace_id)
  or public.is_active_team_member(workspace_id)
);

create policy "team_requests_insert"
on public.team_requests for insert
with check (
  public.is_team_workspace_owner(workspace_id)
  or public.is_active_team_member(workspace_id)
);

create policy "team_requests_update"
on public.team_requests for update
using (
  public.is_team_workspace_owner(workspace_id)
  or public.is_active_team_member(workspace_id)
)
with check (
  public.is_team_workspace_owner(workspace_id)
  or public.is_active_team_member(workspace_id)
);

create policy "team_requests_delete"
on public.team_requests for delete
using (
  public.is_team_workspace_owner(workspace_id)
  or public.is_active_team_member(workspace_id)
);
