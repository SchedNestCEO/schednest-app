-- SchedNest Founder OS Operations v1.1
-- Incident Center + Audit Center

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action_key text not null,
  resource_type text not null,
  resource_id uuid,
  summary text not null,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_idx
  on public.admin_audit_logs(created_at desc);

create index if not exists admin_audit_logs_resource_idx
  on public.admin_audit_logs(resource_type, resource_id);

alter table public.admin_audit_logs enable row level security;

drop policy if exists "admin_audit_logs_admin_read"
on public.admin_audit_logs;

create policy "admin_audit_logs_admin_read"
on public.admin_audit_logs
for select
to authenticated
using (public.is_platform_admin());

drop policy if exists "admin_audit_logs_admin_insert"
on public.admin_audit_logs;

create policy "admin_audit_logs_admin_insert"
on public.admin_audit_logs
for insert
to authenticated
with check (public.is_platform_admin());

create or replace function public.log_admin_action(
  target_action_key text,
  target_resource_type text,
  target_resource_id uuid,
  target_summary text,
  target_before_state jsonb default null,
  target_after_state jsonb default null,
  target_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  result_id uuid;
  current_role text;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  select role
  into current_role
  from public.platform_admins
  where user_id = auth.uid()
    and status = 'active'
  limit 1;

  insert into public.admin_audit_logs (
    actor_user_id,
    actor_role,
    action_key,
    resource_type,
    resource_id,
    summary,
    before_state,
    after_state,
    metadata
  )
  values (
    auth.uid(),
    current_role,
    target_action_key,
    target_resource_type,
    target_resource_id,
    target_summary,
    target_before_state,
    target_after_state,
    target_metadata
  )
  returning id into result_id;

  return result_id;
end;
$$;

grant execute on function public.log_admin_action(
  text,text,uuid,text,jsonb,jsonb,jsonb
) to authenticated;

create or replace function public.update_platform_incident(
  target_incident_id uuid,
  target_status text,
  target_summary text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  previous_row jsonb;
  updated_row jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  if target_status not in (
    'investigating',
    'identified',
    'monitoring',
    'resolved'
  ) then
    raise exception 'Invalid incident status';
  end if;

  select to_jsonb(i)
  into previous_row
  from public.platform_incidents i
  where i.id = target_incident_id;

  update public.platform_incidents
  set
    status = target_status,
    resolved_at = case
      when target_status = 'resolved' then now()
      else null
    end,
    updated_at = now(),
    metadata = case
      when target_summary is null then metadata
      else metadata || jsonb_build_object(
        'latest_update',
        target_summary
      )
    end
  where id = target_incident_id;

  select to_jsonb(i)
  into updated_row
  from public.platform_incidents i
  where i.id = target_incident_id;

  perform public.log_admin_action(
    'incident_status_changed',
    'platform_incident',
    target_incident_id,
    'Incident status changed to ' || target_status,
    previous_row,
    updated_row,
    '{}'::jsonb
  );
end;
$$;

grant execute on function public.update_platform_incident(
  uuid,text,text
) to authenticated;
