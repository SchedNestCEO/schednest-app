# Performance Center Core

## Purpose

Performance Center records performance runs, metric snapshots, and thresholds
for SchedNest products.

## Sprint 3 scope

- Founder-only historical visibility
- Manual platform snapshots
- Seeded platform and Business thresholds
- Read-only history API plus controlled snapshot creation
- No load generation

## Tables

- `performance_test_runs`
- `performance_metric_snapshots`
- `performance_thresholds`

## Security

All three tables use RLS and require `public.is_platform_admin()`. The API also
requires an authenticated platform administrator before reading or writing.

## Product strategy

Business receives the first product-specific thresholds. Student, Teams,
Medical, and Life remain supported product values for future expansion.

## Future

Sprint 4 adds staging-only k6 test execution and result ingestion.
