-- SchedNest Med emergency card + accessibility preferences

create table if not exists public.med_emergency_cards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  med_profile_id uuid not null references public.med_profiles(id) on delete cascade,
  blood_type text,
  allergies text,
  conditions text,
  emergency_contacts jsonb not null default '[]'::jsonb,
  preferred_hospital text,
  primary_provider text,
  insurance_provider text,
  insurance_member_id text,
  notes text,
  share_with_caregivers boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id)
);

create table if not exists public.med_accessibility_preferences (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  large_text boolean not null default false,
  high_contrast boolean not null default false,
  simplified_navigation boolean not null default false,
  reduced_motion boolean not null default false,
  voice_reminders boolean not null default false,
  email_reminders boolean not null default true,
  sms_reminders boolean not null default false,
  preferred_language text not null default 'English',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id)
);

alter table public.med_emergency_cards enable row level security;
alter table public.med_accessibility_preferences enable row level security;

drop policy if exists "med_emergency_cards_owner_all" on public.med_emergency_cards;
create policy "med_emergency_cards_owner_all"
on public.med_emergency_cards
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "med_emergency_cards_caregiver_select" on public.med_emergency_cards;
create policy "med_emergency_cards_caregiver_select"
on public.med_emergency_cards
for select
to authenticated
using (
  share_with_caregivers = true
  and public.med_has_permission(owner_id, 'view_medications')
);

drop policy if exists "med_accessibility_owner_all" on public.med_accessibility_preferences;
create policy "med_accessibility_owner_all"
on public.med_accessibility_preferences
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
