-- Normalize Teams task fields after the original foundation migration.

update public.team_tasks
set status = 'todo'
where status = 'not_started';

alter table public.team_tasks
  alter column status set default 'todo';

alter table public.team_tasks
  drop constraint if exists team_tasks_status_check;

alter table public.team_tasks
  add constraint team_tasks_status_check
  check (
    status in (
      'todo',
      'in_progress',
      'blocked',
      'completed'
    )
  );

-- created_by already exists from the foundation migration and remains
-- required so every task retains an accountable creator.
