create extension if not exists pgcrypto;

create table if not exists public.med_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  date_of_birth date,
  timezone text not null default 'America/Los_Angeles',
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  subscription_status text not null default 'free'
    check (subscription_status in ('free','trialing','active','past_due','cancelled')),
  billing_interval text
    check (billing_interval is null or billing_interval in ('monthly','annual')),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.med_care_nests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  med_profile_id uuid not null references public.med_profiles(id) on delete cascade,
  name text not null,
  category text,
  description text,
  status text not null default 'active'
    check (status in ('active','completed','archived')),
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.med_appointments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  med_profile_id uuid not null references public.med_profiles(id) on delete cascade,
  care_nest_id uuid references public.med_care_nests(id) on delete set null,
  title text not null,
  provider_name text,
  facility_name text,
  appointment_type text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  preparation_instructions text,
  transportation_notes text,
  status text not null default 'scheduled'
    check (status in ('scheduled','completed','cancelled','missed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create table if not exists public.med_medications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  med_profile_id uuid not null references public.med_profiles(id) on delete cascade,
  care_nest_id uuid references public.med_care_nests(id) on delete set null,
  medication_name text not null,
  dosage text,
  instructions text,
  frequency text,
  start_date date,
  end_date date,
  refill_date date,
  prescribing_provider text,
  pharmacy_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.med_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  med_profile_id uuid not null references public.med_profiles(id) on delete cascade,
  care_nest_id uuid references public.med_care_nests(id) on delete set null,
  title text not null,
  description text,
  due_at timestamptz,
  completed_at timestamptz,
  task_type text not null default 'general'
    check (task_type in ('general','lab','imaging','refill','follow_up','preparation','insurance','transportation')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.med_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  med_profile_id uuid not null references public.med_profiles(id) on delete cascade,
  care_nest_id uuid references public.med_care_nests(id) on delete set null,
  title text not null,
  document_type text,
  file_url text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.med_provider_questions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  med_profile_id uuid not null references public.med_profiles(id) on delete cascade,
  care_nest_id uuid references public.med_care_nests(id) on delete set null,
  appointment_id uuid references public.med_appointments(id) on delete set null,
  question text not null,
  answered boolean not null default false,
  answer_notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.med_caregiver_access (
  id uuid primary key default gen_random_uuid(),
  med_profile_id uuid not null references public.med_profiles(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  caregiver_user_id uuid references auth.users(id) on delete cascade,
  caregiver_email text not null,
  relationship text,
  permission_level text not null default 'view'
    check (permission_level in ('view','manage')),
  status text not null default 'pending'
    check (status in ('pending','accepted','revoked')),
  created_at timestamptz not null default now(),
  unique (med_profile_id, caregiver_email)
);

create index if not exists med_appointments_owner_starts_idx
  on public.med_appointments(owner_id, starts_at);
create index if not exists med_medications_owner_active_idx
  on public.med_medications(owner_id, is_active);
create index if not exists med_tasks_owner_due_idx
  on public.med_tasks(owner_id, due_at);

alter table public.med_profiles enable row level security;
alter table public.med_care_nests enable row level security;
alter table public.med_appointments enable row level security;
alter table public.med_medications enable row level security;
alter table public.med_tasks enable row level security;
alter table public.med_documents enable row level security;
alter table public.med_provider_questions enable row level security;
alter table public.med_caregiver_access enable row level security;

drop policy if exists "med_profiles_owner_all" on public.med_profiles;
create policy "med_profiles_owner_all"
on public.med_profiles for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "med_care_nests_owner_all" on public.med_care_nests;
create policy "med_care_nests_owner_all"
on public.med_care_nests for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "med_appointments_owner_all" on public.med_appointments;
create policy "med_appointments_owner_all"
on public.med_appointments for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "med_medications_owner_all" on public.med_medications;
create policy "med_medications_owner_all"
on public.med_medications for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "med_tasks_owner_all" on public.med_tasks;
create policy "med_tasks_owner_all"
on public.med_tasks for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "med_documents_owner_all" on public.med_documents;
create policy "med_documents_owner_all"
on public.med_documents for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "med_provider_questions_owner_all" on public.med_provider_questions;
create policy "med_provider_questions_owner_all"
on public.med_provider_questions for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "med_caregiver_access_owner_all" on public.med_caregiver_access;
create policy "med_caregiver_access_owner_all"
on public.med_caregiver_access for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
