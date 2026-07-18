# Sprint 4 Staging Benchmark

## Purpose

This document records the approved Sprint 4 performance benchmarks for the SchedNest Business product.

Testing was limited to local and Vercel preview environments. No production load testing was performed.

## Test Date

July 18, 2026

## Public Booking Page Benchmark

### Environment

- Vercel preview deployment
- Route: `/book/schednest`
- Maximum virtual users: 100
- Vercel deployment protection accessed through an automation bypass secret
- Test type: read-only public page requests

### Results

| Metric | Result |
|---|---:|
| HTTP requests | 9,948 |
| Request failures | 0% |
| Average response time | 200.2 ms |
| Median response time | 155.1 ms |
| p90 response time | 398.7 ms |
| p95 response time | 580.1 ms |
| Maximum response time | 3,150 ms |

### Outcome

The public booking-page benchmark passed its configured thresholds with no request failures.

## Authenticated Business Benchmark

### Environment

- Supabase-hosted Business data
- Dedicated load-test Business account
- Seeded test dataset:
  - 5 services
  - 100 customers
  - 500 historical bookings
- Maximum virtual users: 100
- Test duration: 2 minutes
- Test type: authenticated read workload

### Results

| Metric | Result |
|---|---:|
| Completed iterations | 4,428 |
| Interrupted iterations | 0 |
| HTTP requests | 13,285 |
| Request failures | 0% |
| Check success rate | 100% |
| Average response time | 97.0 ms |
| Median response time | 93.1 ms |
| p90 response time | 107.8 ms |
| p95 response time | 116.0 ms |
| Maximum response time | 733.0 ms |

### Outcome

The authenticated Business benchmark passed cleanly at 100 concurrent virtual users. All functional checks succeeded, no requests failed, and 95% of requests completed within approximately 116 milliseconds.

## Data Cleanup

All seeded services, customers, and bookings marked with `LOADTEST_20260718` were deleted after testing.

Cleanup verification returned:

- Services remaining: 0
- Customers remaining: 0
- Bookings remaining: 0

## Notes

These results establish a Sprint 4 baseline and are not a guarantee of production performance. Future benchmarks should be compared against these measurements using equivalent environments, datasets, test scripts, and concurrency levels.
