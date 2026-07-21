-- Reconstructs the booking-domain baseline that existed before
-- the tracked booking integrity and RPC migrations.

begin;

create table if not exists public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null default 'My Business',
  role text not null default 'business_owner',
  plan text not null default 'essentials',
  subscription_status text not null default 'beta',
  booking_slug text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text,
  phone text,
  website text,
  slug text,
  business_stage text default 'starting',
  preferred_language text default 'en',
  client_default_language text default 'en',
  booking_method text default 'booking_link',
  business_type text,
  accepts_cash boolean default false,
  accepts_zelle boolean default false,
  accepts_venmo boolean default false,
  accepts_card boolean default false,
  requires_deposit boolean default false,
  business_bank_status text default 'not_connected',
  onboarding_completed boolean default false,
  timezone text default 'America/Los_Angeles',
  currency text default 'USD',
  booking_time_mode text default 'fixed_hours',
  business_hours_enabled boolean default true,
  business_description text,
  contact_email text,
  contact_phone text,
  brand_primary_color text default '#34d399',
  brand_accent_color text default '#34d399',
  booking_page_theme text default 'schednest_dark',
  manual_payments_enabled boolean not null default true,
  manual_payment_zelle text,
  manual_payment_cash_app text,
  manual_payment_venmo text,
  manual_payment_paypal text,
  manual_payment_other text,
  manual_payment_qr_url text,
  manual_payment_qr_caption text,
  reminder_emails_enabled boolean not null default true,
  reminder_hours_before integer not null default 24,
  deposit_reminder_enabled boolean not null default true,
  owner_reminder_enabled boolean not null default true,
  stripe_account_id text,
  stripe_onboarding_complete boolean default false,
  stripe_connect_account_id text,
  stripe_connect_status text not null default 'not_connected',
  stripe_charges_enabled boolean not null default false,
  stripe_payouts_enabled boolean not null default false,
  check (booking_time_mode in ('fixed_hours', 'flexible_requests')),
  check (plan in ('essentials', 'growth', 'complete', 'teams')),
  check (role in ('founder', 'business_owner')),
  check (stripe_connect_status in ('not_connected', 'pending', 'restricted', 'active')),
  check (subscription_status in ('beta', 'active', 'past_due', 'canceled'))
);

create unique index if not exists business_profiles_booking_slug_key
  on public.business_profiles(booking_slug);

create unique index if not exists business_profiles_owner_id_key
  on public.business_profiles(owner_id);

alter table public.business_profiles enable row level security;

drop policy if exists "Users can manage their own business profile"
  on public.business_profiles;

create policy "Users can manage their own business profile"
on public.business_profiles
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.business_profiles(id) on delete cascade,
  name text,
  email text,
  phone text,
  notes text,
  created_at timestamptz default now(),
  owner_id uuid references auth.users(id) on delete cascade,
  full_name text,
  preferred_language text default 'en',
  source text default 'manual',
  updated_at timestamptz default now(),
  status text not null default 'active',
  internal_flag_note text,
  flagged_at timestamptz,
  blocked_at timestamptz,
  archived_at timestamptz,
  check (status in ('active', 'archived', 'blocked'))
);

create index if not exists idx_customers_business_email
  on public.customers(business_id, email);

create index if not exists idx_customers_business_id
  on public.customers(business_id);

create index if not exists idx_customers_business_name
  on public.customers(business_id, name);

create index if not exists idx_customers_business_phone
  on public.customers(business_id, phone);

create index if not exists idx_customers_business_status
  on public.customers(business_id, status);

alter table public.customers enable row level security;

drop policy if exists "Users can manage their own customers"
  on public.customers;

create policy "Users can manage their own customers"
on public.customers
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.business_profiles(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer not null default 60,
  price_cents integer,
  is_active boolean default true,
  created_at timestamptz default now(),
  owner_id uuid references auth.users(id) on delete cascade,
  price numeric(10,2),
  updated_at timestamptz default now(),
  sample_image_url text,
  sample_caption text,
  show_sample_on_booking_page boolean default false,
  publish_at timestamptz,
  unpublish_at timestamptz,
  discount_type text default 'none',
  discount_value numeric,
  discount_label text,
  discount_starts_at timestamptz,
  discount_ends_at timestamptz,
  deleted_at timestamptz,
  pricing_type text default 'fixed',
  deposit_required boolean not null default false,
  deposit_type text not null default 'fixed',
  deposit_amount numeric not null default 0,
  deposit_policy text,
  deposit_collection_method text not null default 'manual',
  manual_deposit_instructions text,
  deposits_enabled boolean not null default false,
  cancellation_window_hours integer default 24,
  late_cancellation_forfeits_deposit boolean not null default true,
  no_show_forfeits_deposit boolean not null default true,
  check (deposit_amount >= 0),
  check (deposit_collection_method in ('manual', 'stripe')),
  check (deposit_type in ('none', 'fixed', 'percent')),
  check (deposit_type <> 'percent' or deposit_amount <= 100)
);

create index if not exists idx_services_business_id
  on public.services(business_id);

alter table public.services enable row level security;

drop policy if exists "Users can manage their own services"
  on public.services;

create policy "Users can manage their own services"
on public.services
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create table if not exists public.business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.business_profiles(id) on delete cascade,
  day_of_week integer not null,
  opens_at time,
  closes_at time,
  is_closed boolean default false,
  owner_id uuid references auth.users(id) on delete cascade,
  is_open boolean default true,
  open_time time,
  close_time time,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists business_hours_business_day_unique
  on public.business_hours(business_id, day_of_week);

create index if not exists idx_business_hours_business_id
  on public.business_hours(business_id);

alter table public.business_hours enable row level security;

drop policy if exists "Users can manage their own business hours"
  on public.business_hours;

create policy "Users can manage their own business hours"
on public.business_hours
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.business_profiles(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text default 'pending',
  notes text,
  created_at timestamptz default now(),
  owner_id uuid references auth.users(id) on delete cascade,
  source text default 'manual',
  customer_name text,
  customer_phone text,
  customer_email text,
  updated_at timestamptz default now(),
  customer_warning_status text,
  customer_warning_note text,
  requires_owner_review boolean not null default false,
  intake_answers jsonb not null default '{}'::jsonb,
  deposit_required boolean not null default false,
  deposit_status text not null default 'not_required',
  deposit_amount numeric not null default 0,
  deposit_payment_url text,
  stripe_deposit_session_id text,
  deposit_paid_at timestamptz,
  deposit_collection_method text not null default 'manual',
  deposit_policy text,
  manual_deposit_instructions text,
  deposit_policy_accepted boolean not null default false,
  deposit_policy_accepted_at timestamptz,
  customer_reminder_sent_at timestamptz,
  owner_reminder_sent_at timestamptz,
  deposit_reminder_sent_at timestamptz,
  payment_status text not null default 'unpaid',
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  stripe_connected_account_id text,
  cancellation_reason text,
  cancelled_at timestamptz,
  marked_no_show_at timestamptz,
  check (deposit_amount >= 0),
  check (deposit_collection_method in ('manual', 'stripe')),
  check (deposit_status in ('not_required', 'required', 'pending_payment', 'paid', 'failed', 'refunded', 'waived')),
  check (payment_status in ('unpaid', 'processing', 'paid', 'failed', 'refunded', 'partially_refunded')),
  check (end_time > start_time)
);

create index if not exists idx_bookings_business_id
  on public.bookings(business_id);

create index if not exists idx_bookings_customer_warning
  on public.bookings(business_id, requires_owner_review);

create index if not exists idx_bookings_start_time
  on public.bookings(start_time);

alter table public.bookings enable row level security;

drop policy if exists "Users can manage their own bookings"
  on public.bookings;

create policy "Users can manage their own bookings"
on public.bookings
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

commit;
