# Sprint 5 Booking Concurrency Benchmark

## Test Date

July 2026

## Environment

- Environment: Supabase staging
- Production data used: No
- Virtual users: 5
- Attempts: 5
- Target: Same business, service, customer, and appointment window
- Authentication: Dedicated staging test account
- Client credentials: Supabase public key only
- Service-role credentials used: No

## Purpose

Verify that simultaneous attempts to create conflicting bookings cannot produce duplicate or overlapping active appointments.

## Database Protection

The booking system uses:

- centralized booking RPCs
- reusable availability validation
- a PostgreSQL exclusion constraint
- business-hours enforcement
- a 100 ms transaction-local lock timeout
- predictable `23P01` conflict responses

## Final Results

| Metric | Result | Requirement | Status |
|---|---:|---:|---|
| Completed attempts | 5 | 5 | Passed |
| Successful bookings | 1 | Exactly 1 | Passed |
| Expected conflicts | 4 | Exactly 4 | Passed |
| Unexpected responses | 0 | 0 | Passed |
| Checks | 9/9 | 100% | Passed |
| Write latency average | 1,148.20 ms | Informational | Passed |
| Write latency median | 1,149.11 ms | Informational | Passed |
| Write latency p95 | 1,176.67 ms | Below 1,500 ms | Passed |
| Write latency maximum | 1,182.99 ms | Informational | Passed |
| Duplicate conflicting bookings | 0 | 0 | Passed |
| Generated booking cleanup | Complete | 100% | Passed |

## Interpretation

Five authenticated virtual users attempted to create the same appointment concurrently.

Exactly one request succeeded. The remaining four requests returned expected scheduling-conflict responses. No unexpected responses occurred, and no duplicate overlapping appointments were created.

The database-level exclusion constraint remained the final concurrency protection. A 100 ms transaction-local lock timeout ensured competing writes returned predictable conflicts rather than waiting for the default database lock timeout.

The measured latency represents the full external request path through the remote Supabase staging API. The final write p95 was 1,176.67 ms, below the controlled staging threshold of 1,500 ms.

## Cleanup

The test verified that exactly one generated booking existed before cleanup. The generated booking was then removed successfully.

The dedicated staging business, service, customer, business-hours configuration, and authentication account remain available for future controlled regression testing.

## Conclusion

Sprint 5 concurrent-booking safety passed. Simultaneous conflicting attempts cannot create duplicate active appointments, conflict responses are predictable, and generated booking records are cleaned up after the test.
