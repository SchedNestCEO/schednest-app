-- SchedNest Student + Teams data foundation
-- Run in Supabase SQL Editor or add to your normal migration workflow.

create extension if not exists pgcrypto;

-- =========================================================
-- STUDENT
-- =========================================================

create table if not exists public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  school_name text,
  program_name text,
  timezone text not null default 'America/Los_Angeles',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_courses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  student_profile_id uuid not null
    references public.student_profiles(id) on delete cascade,
  name text not null,
  course_code text,
  instructor_name text,
  location text,
  color_label text,
  starts_on date,
  ends_on date,
  status text not null default 'active'
    check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_class_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.student_courses(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  location text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.student_assignments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.student_courses(id) on delete set null,
  title text not null,
  description text,
  due_at timestamptz,
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'submitted', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_exams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.student_courses(id) on delete set null,
  title text not null,
  exam_at timestamptz not null,
  location text,
  notes text,
  status text not null default 'upcoming'
    check (status in ('upcoming', 'completed', 'missed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_study_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.student_courses(id) on delete set null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  notes text,
  status text not null default 'planned'
    check (status in ('planned', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists student_courses_owner_idx
  on public.student_courses(owner_id);

create index if not exists student_assignments_owner_due_idx
  on public.student_assignments(owner_id, due_at);

create index if not exists student_exams_owner_exam_at_idx
  on public.student_exams(owner_id, exam_at);

create index if not exists student_study_sessions_owner_starts_idx
  on public.student_study_sessions(owner_id, starts_at);

alter table public.student_profiles enable row level security;
alter table public.student_courses enable row level security;
alter table public.student_class_sessions enable row level security;
alter table public.student_assignments enable row level security;
alter table public.student_exams enable row level security;
alter table public.student_study_sessions enable row level security;

drop policy if exists "student_profiles_owner_all" on public.student_profiles;
create policy "student_profiles_owner_all"
on public.student_profiles
for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "student_courses_owner_all" on public.student_courses;
create policy "student_courses_owner_all"
on public.student_courses
for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "student_class_sessions_owner_all" on public.student_class_sessions;
create policy "student_class_sessions_owner_all"
on public.student_class_sessions
for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "student_assignments_owner_all" on public.student_assignments;
create policy "student_assignments_owner_all"
on public.student_assignments
for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "student_exams_owner_all" on public.student_exams;
create policy "student_exams_owner_all"
on public.student_exams
for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "student_study_sessions_owner_all" on public.student_study_sessions;
create policy "student_study_sessions_owner_all"
on public.student_study_sessions
for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- =========================================================
-- TEAMS
-- =========================================================

create table if not exists public.team_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  timezone text not null default 'America/Los_Angeles',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null
    references public.team_workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  invited_email text,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'manager', 'member', 'viewer')),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'declined', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or invited_email is not null)
);

create unique index if not exists team_memberships_workspace_user_unique
  on public.team_memberships(workspace_id, user_id)
  where user_id is not null;

create unique index if not exists team_memberships_workspace_email_unique
  on public.team_memberships(workspace_id, lower(invited_email))
  where invited_email is not null;

create table if not exists public.team_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null
    references public.team_workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  starts_on date,
  due_on date,
  status text not null default 'planned'
    check (status in ('planned', 'active', 'blocked', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null
    references public.team_workspaces(id) on delete cascade,
  project_id uuid references public.team_projects(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  assigned_to uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  due_at timestamptz,
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'blocked', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null
    references public.team_workspaces(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  request_type text not null default 'general'
    check (request_type in ('general', 'time_off', 'schedule_change', 'coverage')),
  title text not null,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'denied', 'cancelled')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists team_memberships_user_idx
  on public.team_memberships(user_id);

create index if not exists team_projects_workspace_idx
  on public.team_projects(workspace_id);

create index if not exists team_tasks_workspace_due_idx
  on public.team_tasks(workspace_id, due_at);

create index if not exists team_requests_workspace_status_idx
  on public.team_requests(workspace_id, status);

alter table public.team_workspaces enable row level security;
alter table public.team_memberships enable row level security;
alter table public.team_projects enable row level security;
alter table public.team_tasks enable row level security;
alter table public.team_requests enable row level security;

-- Workspace visibility for owners and active members.
drop policy if exists "team_workspaces_member_select" on public.team_workspaces;
create policy "team_workspaces_member_select"
on public.team_workspaces
for select
using (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.team_memberships membership
    where membership.workspace_id = id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  )
);

drop policy if exists "team_workspaces_owner_insert" on public.team_workspaces;
create policy "team_workspaces_owner_insert"
on public.team_workspaces
for insert
with check (owner_id = auth.uid());

drop policy if exists "team_workspaces_owner_update" on public.team_workspaces;
create policy "team_workspaces_owner_update"
on public.team_workspaces
for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "team_workspaces_owner_delete" on public.team_workspaces;
create policy "team_workspaces_owner_delete"
on public.team_workspaces
for delete
using (owner_id = auth.uid());

-- Memberships can be viewed by members of the workspace.
drop policy if exists "team_memberships_workspace_select" on public.team_memberships;
create policy "team_memberships_workspace_select"
on public.team_memberships
for select
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.team_workspaces workspace
    where workspace.id = workspace_id
      and workspace.owner_id = auth.uid()
  )
);

-- Initial version: only workspace owners manage memberships.
drop policy if exists "team_memberships_owner_insert" on public.team_memberships;
create policy "team_memberships_owner_insert"
on public.team_memberships
for insert
with check (
  exists (
    select 1
    from public.team_workspaces workspace
    where workspace.id = workspace_id
      and workspace.owner_id = auth.uid()
  )
);

drop policy if exists "team_memberships_owner_update" on public.team_memberships;
create policy "team_memberships_owner_update"
on public.team_memberships
for update
using (
  exists (
    select 1
    from public.team_workspaces workspace
    where workspace.id = workspace_id
      and workspace.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.team_workspaces workspace
    where workspace.id = workspace_id
      and workspace.owner_id = auth.uid()
  )
);

drop policy if exists "team_memberships_owner_delete" on public.team_memberships;
create policy "team_memberships_owner_delete"
on public.team_memberships
for delete
using (
  exists (
    select 1
    from public.team_workspaces workspace
    where workspace.id = workspace_id
      and workspace.owner_id = auth.uid()
  )
);

-- Shared workspace records are visible to owners and active members.
drop policy if exists "team_projects_member_all" on public.team_projects;
create policy "team_projects_member_all"
on public.team_projects
for all
using (
  exists (
    select 1
    from public.team_workspaces workspace
    where workspace.id = workspace_id
      and (
        workspace.owner_id = auth.uid()
        or exists (
          select 1
          from public.team_memberships membership
          where membership.workspace_id = workspace.id
            and membership.user_id = auth.uid()
            and membership.status = 'active'
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.team_workspaces workspace
    where workspace.id = workspace_id
      and (
        workspace.owner_id = auth.uid()
        or exists (
          select 1
          from public.team_memberships membership
          where membership.workspace_id = workspace.id
            and membership.user_id = auth.uid()
            and membership.status = 'active'
        )
      )
  )
);

drop policy if exists "team_tasks_member_all" on public.team_tasks;
create policy "team_tasks_member_all"
on public.team_tasks
for all
using (
  exists (
    select 1
    from public.team_workspaces workspace
    where workspace.id = workspace_id
      and (
        workspace.owner_id = auth.uid()
        or exists (
          select 1
          from public.team_memberships membership
          where membership.workspace_id = workspace.id
            and membership.user_id = auth.uid()
            and membership.status = 'active'
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.team_workspaces workspace
    where workspace.id = workspace_id
      and (
        workspace.owner_id = auth.uid()
        or exists (
          select 1
          from public.team_memberships membership
          where membership.workspace_id = workspace.id
            and membership.user_id = auth.uid()
            and membership.status = 'active'
        )
      )
  )
);

drop policy if exists "team_requests_member_all" on public.team_requests;
create policy "team_requests_member_all"
on public.team_requests
for all
using (
  exists (
    select 1
    from public.team_workspaces workspace
    where workspace.id = workspace_id
      and (
        workspace.owner_id = auth.uid()
        or exists (
          select 1
          from public.team_memberships membership
          where membership.workspace_id = workspace.id
            and membership.user_id = auth.uid()
            and membership.status = 'active'
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.team_workspaces workspace
    where workspace.id = workspace_id
      and (
        workspace.owner_id = auth.uid()
        or exists (
          select 1
          from public.team_memberships membership
          where membership.workspace_id = workspace.id
            and membership.user_id = auth.uid()
            and membership.status = 'active'
        )
      )
  )
);

-- Required by later Teams scheduling migrations during clean database builds.
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
