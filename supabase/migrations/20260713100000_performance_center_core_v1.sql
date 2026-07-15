-- SchedNest Performance Center Core v1.0
-- Engineering Phase 1, Sprint 3

create table if not exists public.performance_test_runs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  name text not null,
  product text not null default 'platform'
    check (product in ('platform','business','student','teams','medical','life')),
  environment text not null default 'staging'
    check (environment in ('local','development','preview','staging','production')),
  test_type text not null default 'snapshot'
    check (test_type in ('snapshot','smoke','regression','load','stress','soak','chaos')),
  status text not null default 'queued'
    check (status in ('queued','running','passed','failed','cancelled')),
  target_virtual_users integer,
  duration_seconds integer,
  started_at timestamptz,
  completed_at timestamptz,
  summary jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.performance_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.performance_test_runs(id) on delete set null,
  product text not null default 'platform'
    check (product in ('platform','business','student','teams','medical','life')),
  metric_key text not null,
  metric_value numeric not null,
  unit text not null,
  source text not null default 'manual_snapshot',
  status text not null default 'unknown'
    check (status in ('healthy','warning','critical','unknown')),
  metadata jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now()
);

create table if not exists public.performance_thresholds (
  id uuid primary key default gen_random_uuid(),
  product text not null default 'platform'
    check (product in ('platform','business','student','teams','medical','life')),
  metric_key text not null,
  display_name text not null,
  unit text not null,
  comparison text not null default 'lte'
    check (comparison in ('lte','gte')),
  warning_value numeric not null,
  critical_value numeric not null,
  enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product, metric_key)
);

create index if not exists performance_runs_created_idx
  on public.performance_test_runs(created_at desc);

create index if not exists performance_runs_product_idx
  on public.performance_test_runs(product, created_at desc);

create index if not exists performance_metrics_key_idx
  on public.performance_metric_snapshots(metric_key, captured_at desc);

create index if not exists performance_metrics_product_idx
  on public.performance_metric_snapshots(product, captured_at desc);

alter table public.performance_test_runs enable row level security;
alter table public.performance_metric_snapshots enable row level security;
alter table public.performance_thresholds enable row level security;

drop policy if exists "performance_runs_admin_all"
on public.performance_test_runs;

create policy "performance_runs_admin_all"
on public.performance_test_runs
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

drop policy if exists "performance_metrics_admin_all"
on public.performance_metric_snapshots;

create policy "performance_metrics_admin_all"
on public.performance_metric_snapshots
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

drop policy if exists "performance_thresholds_admin_all"
on public.performance_thresholds;

create policy "performance_thresholds_admin_all"
on public.performance_thresholds
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

insert into public.performance_thresholds (
  product, metric_key, display_name, unit, comparison, warning_value, critical_value
)
values
  ('platform','database_latency_ms','Database latency','ms','lte',250,750),
  ('platform','health_check_latency_ms','Health check latency','ms','lte',500,1500),
  ('platform','error_rate_percent','Error rate','percent','lte',1,5),
  ('platform','event_queue_depth','Event queue depth','items','lte',100,500),
  ('business','booking_read_latency_ms','Business booking read latency','ms','lte',300,900),
  ('business','booking_error_rate_percent','Business booking error rate','percent','lte',1,5)
on conflict (product, metric_key) do nothing;
