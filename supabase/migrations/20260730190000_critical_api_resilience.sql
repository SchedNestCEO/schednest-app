-- Sprint 7: critical API resilience and failure isolation.

-- Adopt the existing booking_notifications dependency into migration history.
create table if not exists public.booking_notifications (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade,
  business_id uuid references public.business_profiles(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete cascade,
  event_type text not null,
  recipient_type text not null,
  recipient_email text not null,
  subject text not null,
  status text not null default 'pending',
  provider text default 'resend',
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.booking_notifications
  add column if not exists attempt_count integer not null default 1,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists recovered_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'booking_notifications_status_check'
      and conrelid = 'public.booking_notifications'::regclass
  ) then
    alter table public.booking_notifications
      add constraint booking_notifications_status_check
      check (status in ('pending', 'sent', 'failed', 'skipped'))
      not valid;
  end if;
end
$$;

alter table public.booking_notifications
  validate constraint booking_notifications_status_check;

create index if not exists idx_booking_notifications_booking_id
  on public.booking_notifications (booking_id);

create index if not exists idx_booking_notifications_business_id
  on public.booking_notifications (business_id);

create index if not exists idx_booking_notifications_owner_unread
  on public.booking_notifications (owner_id, read_at, created_at);

create index if not exists booking_notifications_retry_idx
  on public.booking_notifications (
    status,
    last_attempt_at,
    created_at
  )
  where status in ('pending', 'failed');

alter table public.booking_notifications enable row level security;

drop policy if exists
  "Users can view their own booking notifications"
  on public.booking_notifications;

create policy
  "Users can view their own booking notifications"
on public.booking_notifications
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists
  "Users can update their own booking notifications"
  on public.booking_notifications;

create policy
  "Users can update their own booking notifications"
on public.booking_notifications
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- Stripe event ledger prevents duplicate and concurrent webhook processing.
create table if not exists public.stripe_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  status text not null default 'processing'
    check (status in ('processing', 'completed', 'failed')),
  attempt_count integer not null default 1
    check (attempt_count > 0),
  processing_started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stripe_webhook_events_status_idx
  on public.stripe_webhook_events (
    status,
    updated_at
  );

alter table public.stripe_webhook_events enable row level security;

-- No authenticated-user policies are intentional.
-- This table is accessible only through trusted service-role operations.

create or replace function public.claim_stripe_webhook_event(
  requested_event_id text,
  requested_event_type text
)
returns table (
  claimed boolean,
  event_status text,
  attempts integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_status text;
  existing_attempts integer;
begin
  insert into public.stripe_webhook_events (
    stripe_event_id,
    event_type,
    status,
    attempt_count,
    processing_started_at,
    updated_at
  )
  values (
    requested_event_id,
    requested_event_type,
    'processing',
    1,
    now(),
    now()
  )
  on conflict (stripe_event_id) do nothing;

  if found then
    return query
      select true, 'processing'::text, 1;
    return;
  end if;

  select status, attempt_count
  into existing_status, existing_attempts
  from public.stripe_webhook_events
  where stripe_event_id = requested_event_id
  for update;

  if existing_status = 'failed' then
    update public.stripe_webhook_events
    set
      status = 'processing',
      event_type = requested_event_type,
      attempt_count = attempt_count + 1,
      processing_started_at = now(),
      failed_at = null,
      last_error = null,
      updated_at = now()
    where stripe_event_id = requested_event_id
    returning attempt_count
    into existing_attempts;

    return query
      select true, 'processing'::text, existing_attempts;
    return;
  end if;

  return query
    select false, existing_status, existing_attempts;
end;
$$;

revoke all on function public.claim_stripe_webhook_event(text, text)
  from public, anon, authenticated;

grant execute on function public.claim_stripe_webhook_event(text, text)
  to service_role;

-- Only one active export for the same owner and product scope.
create unique index if not exists
  platform_data_requests_one_active_export_idx
on public.platform_data_requests (
  owner_id,
  coalesce(product, '__all_products__')
)
where
  request_type = 'export'
  and status in ('pending', 'processing');
