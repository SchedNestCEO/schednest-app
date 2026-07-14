create table if not exists public.platform_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  role text not null default 'admin' check (role in ('founder','admin','support','engineering','analyst')),
  status text not null default 'active' check (status in ('active','suspended','revoked')),
  permissions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.platform_admins
    where user_id = auth.uid() and status = 'active'
  );
$$;
grant execute on function public.is_platform_admin() to authenticated;

create table if not exists public.platform_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  service_key text not null,
  service_name text not null,
  product text not null default 'platform',
  status text not null default 'unknown' check (status in ('healthy','degraded','down','unknown')),
  latency_ms integer,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now()
);

create table if not exists public.platform_incidents (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  severity text not null default 'minor' check (severity in ('minor','major','critical')),
  status text not null default 'investigating' check (status in ('investigating','identified','monitoring','resolved')),
  affected_services jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_notification_state (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete cascade unique,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  severity text not null default 'info' check (severity in ('info','warning','critical')),
  title text not null,
  message text,
  fingerprint text,
  status text not null default 'new' check (status in ('new','reviewed','resolved','dismissed','archived')),
  occurrence_count integer not null default 1,
  last_occurred_at timestamptz not null default now(),
  material_change boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists admin_notifications_fingerprint_unique
on public.admin_notifications(fingerprint) where fingerprint is not null;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid references auth.users(id) on delete set null,
  customer_email text,
  product text not null default 'platform',
  subject text not null,
  message text not null,
  category text not null default 'general',
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'open' check (status in ('open','waiting_customer','waiting_internal','resolved','closed')),
  assigned_admin_id uuid references auth.users(id) on delete set null,
  escalation_required boolean not null default false,
  ai_confidence numeric(5,4),
  suggested_reply text,
  resolution_summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.platform_admins enable row level security;
alter table public.platform_health_snapshots enable row level security;
alter table public.platform_incidents enable row level security;
alter table public.admin_notification_state enable row level security;
alter table public.admin_notifications enable row level security;
alter table public.support_tickets enable row level security;

drop policy if exists "platform_admins_self_read" on public.platform_admins;
create policy "platform_admins_self_read" on public.platform_admins for select to authenticated using (user_id = auth.uid());

drop policy if exists "platform_health_admin_all" on public.platform_health_snapshots;
create policy "platform_health_admin_all" on public.platform_health_snapshots for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists "platform_incidents_admin_all" on public.platform_incidents;
create policy "platform_incidents_admin_all" on public.platform_incidents for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists "admin_notification_state_self_all" on public.admin_notification_state;
create policy "admin_notification_state_self_all" on public.admin_notification_state for all to authenticated using (admin_user_id = auth.uid() and public.is_platform_admin()) with check (admin_user_id = auth.uid() and public.is_platform_admin());

drop policy if exists "admin_notifications_admin_all" on public.admin_notifications;
create policy "admin_notifications_admin_all" on public.admin_notifications for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists "support_tickets_admin_all" on public.support_tickets;
create policy "support_tickets_admin_all" on public.support_tickets for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
