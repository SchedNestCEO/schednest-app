-- SchedNest Platform v1: Universal Notifications

create table if not exists public.platform_notification_preferences (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default true,
  sms_enabled boolean not null default false,
  push_enabled boolean not null default false,
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  timezone text not null default 'UTC',
  digest_mode text not null default 'instant'
    check (digest_mode in ('instant', 'hourly', 'daily')),
  product_overrides jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id)
);

create table if not exists public.platform_notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  product text not null
    check (product in ('platform', 'student', 'teams', 'med', 'business', 'life')),
  notification_type text not null,
  severity text not null default 'info'
    check (severity in ('info', 'success', 'warning', 'critical')),
  title text not null,
  body text,
  action_url text,
  status text not null default 'pending'
    check (status in ('pending', 'scheduled', 'sent', 'read', 'acknowledged', 'cancelled', 'failed')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  acknowledged_at timestamptz,
  dedupe_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.platform_notifications(id) on delete cascade,
  channel text not null
    check (channel in ('in_app', 'email', 'sms', 'push', 'voice')),
  provider text,
  provider_message_id text,
  status text not null default 'queued'
    check (status in ('queued', 'sending', 'sent', 'delivered', 'failed', 'cancelled')),
  attempt_count integer not null default 0,
  last_attempt_at timestamptz,
  delivered_at timestamptz,
  failure_code text,
  failure_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_escalation_rules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  product text not null
    check (product in ('platform', 'student', 'teams', 'med', 'business', 'life')),
  notification_type text not null,
  wait_minutes integer not null default 30 check (wait_minutes >= 1),
  escalation_channel text not null
    check (escalation_channel in ('in_app', 'email', 'sms', 'push', 'voice')),
  escalate_to_user_id uuid references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists platform_notifications_owner_dedupe_idx
  on public.platform_notifications(owner_id, dedupe_key)
  where dedupe_key is not null;

create index if not exists platform_notifications_owner_status_idx
  on public.platform_notifications(owner_id, status, created_at desc);

create index if not exists platform_notifications_schedule_idx
  on public.platform_notifications(status, scheduled_for)
  where status in ('pending', 'scheduled');

create index if not exists platform_notification_deliveries_notification_idx
  on public.platform_notification_deliveries(notification_id, status);

alter table public.platform_notification_preferences enable row level security;
alter table public.platform_notifications enable row level security;
alter table public.platform_notification_deliveries enable row level security;
alter table public.platform_escalation_rules enable row level security;

drop policy if exists "platform_notification_preferences_owner_all"
on public.platform_notification_preferences;

create policy "platform_notification_preferences_owner_all"
on public.platform_notification_preferences
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "platform_notifications_owner_select"
on public.platform_notifications;

create policy "platform_notifications_owner_select"
on public.platform_notifications
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "platform_notifications_owner_insert"
on public.platform_notifications;

create policy "platform_notifications_owner_insert"
on public.platform_notifications
for insert
to authenticated
with check (
  owner_id = auth.uid()
  or created_by = auth.uid()
);

drop policy if exists "platform_notifications_owner_update"
on public.platform_notifications;

create policy "platform_notifications_owner_update"
on public.platform_notifications
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "platform_notifications_owner_delete"
on public.platform_notifications;

create policy "platform_notifications_owner_delete"
on public.platform_notifications
for delete
to authenticated
using (owner_id = auth.uid());

drop policy if exists "platform_notification_deliveries_owner_select"
on public.platform_notification_deliveries;

create policy "platform_notification_deliveries_owner_select"
on public.platform_notification_deliveries
for select
to authenticated
using (
  exists (
    select 1
    from public.platform_notifications notification
    where notification.id = platform_notification_deliveries.notification_id
      and notification.owner_id = auth.uid()
  )
);

drop policy if exists "platform_escalation_rules_owner_all"
on public.platform_escalation_rules;

create policy "platform_escalation_rules_owner_all"
on public.platform_escalation_rules
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create or replace function public.mark_platform_notification_read(
  target_notification_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.platform_notifications
  set
    status = case
      when status in ('acknowledged', 'cancelled', 'failed') then status
      else 'read'
    end,
    read_at = coalesce(read_at, now()),
    updated_at = now()
  where id = target_notification_id
    and owner_id = auth.uid();
end;
$$;

grant execute on function public.mark_platform_notification_read(uuid)
to authenticated;

create or replace function public.acknowledge_platform_notification(
  target_notification_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.platform_notifications
  set
    status = 'acknowledged',
    read_at = coalesce(read_at, now()),
    acknowledged_at = coalesce(acknowledged_at, now()),
    updated_at = now()
  where id = target_notification_id
    and owner_id = auth.uid();
end;
$$;

grant execute on function public.acknowledge_platform_notification(uuid)
to authenticated;
