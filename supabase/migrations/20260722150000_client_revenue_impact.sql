create table if not exists public.client_revenue_impact (
  id uuid primary key default gen_random_uuid(),
  recorded_by uuid not null references auth.users(id) on delete cascade,
  client_id uuid,
  client_name text not null,
  period_start date,
  period_end date,
  missed_revenue_identified numeric(14,2) not null default 0 check (missed_revenue_identified >= 0),
  increased_revenue_realized numeric(14,2) not null default 0 check (increased_revenue_realized >= 0),
  evidence_status text not null default 'estimated'
    check (evidence_status in ('estimated','client_confirmed','verified')),
  source_type text not null default 'manual'
    check (source_type in ('manual','appointment_analysis','client_report','integration')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint revenue_impact_period_order check (
    period_end is null or period_start is null or period_end >= period_start
  )
);

create index if not exists client_revenue_impact_recorded_by_idx
  on public.client_revenue_impact(recorded_by, created_at desc);
create index if not exists client_revenue_impact_client_idx
  on public.client_revenue_impact(client_id, created_at desc);
create index if not exists client_revenue_impact_status_idx
  on public.client_revenue_impact(evidence_status);

alter table public.client_revenue_impact enable row level security;

create policy "Admins can read revenue impact"
  on public.client_revenue_impact for select
  using ((auth.jwt() ->> 'email') = 'hello@schednest.com');

create policy "Admins can insert revenue impact"
  on public.client_revenue_impact for insert
  with check (
    auth.uid() = recorded_by
    and (auth.jwt() ->> 'email') = 'hello@schednest.com'
  );

create policy "Admins can update revenue impact"
  on public.client_revenue_impact for update
  using ((auth.jwt() ->> 'email') = 'hello@schednest.com')
  with check ((auth.jwt() ->> 'email') = 'hello@schednest.com');

create policy "Admins can delete revenue impact"
  on public.client_revenue_impact for delete
  using ((auth.jwt() ->> 'email') = 'hello@schednest.com');

create or replace function public.set_client_revenue_impact_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists client_revenue_impact_updated_at on public.client_revenue_impact;
create trigger client_revenue_impact_updated_at
before update on public.client_revenue_impact
for each row execute function public.set_client_revenue_impact_updated_at();

create or replace view public.client_revenue_impact_summary as
select
  count(distinct coalesce(client_id::text, lower(client_name))) as clients_measured,
  coalesce(sum(missed_revenue_identified), 0)::numeric(14,2) as total_missed_revenue_identified,
  coalesce(sum(increased_revenue_realized), 0)::numeric(14,2) as total_increased_revenue_realized,
  coalesce(sum(missed_revenue_identified + increased_revenue_realized), 0)::numeric(14,2) as total_economic_impact,
  coalesce(sum(case when evidence_status = 'verified' then missed_revenue_identified + increased_revenue_realized else 0 end), 0)::numeric(14,2) as verified_economic_impact,
  coalesce(sum(case when evidence_status in ('client_confirmed','verified') then missed_revenue_identified + increased_revenue_realized else 0 end), 0)::numeric(14,2) as confirmed_economic_impact
from public.client_revenue_impact;

comment on table public.client_revenue_impact is
  'Aggregated client economic impact. Missed revenue identified and increased revenue realized are tracked separately to avoid misleading claims.';
