create extension if not exists pgcrypto;

create table if not exists public.founder_time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  description text,
  clock_in timestamptz not null,
  clock_out timestamptz,
  break_minutes integer not null default 0 check (break_minutes >= 0),
  hourly_rate numeric(10,2) not null default 50.00 check (hourly_rate >= 0),
  status text not null default 'unpaid_founder_contribution'
    check (status in ('unpaid_founder_contribution','deferred_approved','paid')),
  is_historical boolean not null default false,
  manual_hours numeric(10,2) check (manual_hours is null or manual_hours >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint founder_time_clock_order check (clock_out is null or clock_out >= clock_in)
);

create unique index if not exists founder_time_one_active_entry_per_user
  on public.founder_time_entries(user_id)
  where clock_out is null and manual_hours is null;

create index if not exists founder_time_entries_user_clock_in_idx
  on public.founder_time_entries(user_id, clock_in desc);

alter table public.founder_time_entries enable row level security;

create policy "Users can read their own founder time"
  on public.founder_time_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert their own founder time"
  on public.founder_time_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own founder time"
  on public.founder_time_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own founder time"
  on public.founder_time_entries for delete
  using (auth.uid() = user_id);

create or replace function public.set_founder_time_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists founder_time_entries_updated_at on public.founder_time_entries;
create trigger founder_time_entries_updated_at
before update on public.founder_time_entries
for each row execute function public.set_founder_time_updated_at();

comment on table public.founder_time_entries is
  'Internal founder contribution tracking. Entries are not accrued payroll unless separately authorized.';
