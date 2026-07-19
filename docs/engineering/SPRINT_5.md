# Engineering Phase 1 — Sprint 5

Status: Planned

## Theme

Scheduling Integrity v1.0

## Objective

Ensure that SchedNest creates valid bookings safely, prevents overlapping appointments, and handles simultaneous booking attempts without producing duplicate or conflicting records.

Sprint 5 establishes the scheduling-integrity foundation required for future Birdy conflict detection, recommendations, and optimization.

## Primary Scope

### 1. Availability Validation

- validate requested booking times against business hours
- validate service duration before booking creation
- reject appointments outside configured availability
- revalidate availability immediately before saving a booking
- return clear conflict and validation messages

### 2. Overlap Prevention

- prevent bookings that overlap existing active appointments
- define which booking statuses block availability
- allow completed and cancelled appointments to remain historical
- protect booking creation at the database level
- avoid relying only on client-side checks

### 3. Concurrent Booking Safety

- handle two customers attempting to book the same time simultaneously
- ensure only one conflicting appointment can be created
- return a predictable conflict response to the unsuccessful request
- prevent duplicate submissions from repeated clicks or network retries

### 4. Conflict Detection

- identify direct appointment overlaps
- record enough conflict context for future analysis
- expose reusable conflict-checking logic
- prepare conflict information for Birdy recommendations
- preserve product boundaries and tenant isolation

### 5. Booking API Integrity

- centralize booking validation
- validate business, service, customer, start time, and end time
- enforce authenticated and public-booking permissions
- use structured success and error responses
- preserve Row Level Security protections

## Database Work

Sprint 5 may include:

- a database function for atomic booking creation
- overlap-detection queries
- transaction-level or constraint-based concurrency protection
- supporting indexes for business and time-range searches
- migration validation
- rollback documentation

The final implementation must avoid destructive schema changes and preserve existing booking history.

## Testing

### Functional Tests

Validate:

- valid booking creation
- booking outside business hours
- booking with an invalid service
- booking with an invalid duration
- exact duplicate booking attempts
- partially overlapping bookings
- fully contained overlapping bookings
- adjacent appointments that do not overlap
- cancelled booking behavior

### Concurrency Test

Run a controlled authenticated write test with:

- dedicated load-test account
- isolated test service and customer data
- 5 concurrent virtual users initially
- multiple attempts against the same appointment window
- verification that only one conflicting booking succeeds
- complete cleanup after validation

Testing must not run against production without explicit authorization.

## Performance Targets

Initial targets:

- booking validation p95 below 500 ms in the approved test environment
- conflict responses p95 below 500 ms
- 0 duplicate conflicting bookings
- 0 unexpected server errors
- 100% cleanup of generated test records

## Security Requirements

- maintain tenant isolation
- preserve Row Level Security
- never use service-role credentials in client or k6 scripts
- prevent users from creating bookings for another business
- avoid exposing private customer or business information in errors
- verify all database functions use safe search paths and permissions

## Deliverables

- scheduling-integrity database migration
- centralized booking-creation logic
- overlap prevention
- concurrency-safe conflict handling
- clear booking conflict messages
- controlled authenticated write test
- cleanup and rollback scripts
- Sprint 5 verification script
- updated engineering and database documentation
- benchmark results

## Definition of Done

Sprint 5 is complete when:

- overlapping active bookings are prevented
- simultaneous conflicting booking attempts cannot create duplicate appointments
- valid adjacent bookings continue to work
- public and authenticated booking flows use the protected booking logic
- tenant isolation and RLS are verified
- controlled concurrency testing passes
- generated test data is removed
- migrations, routes, lint, typecheck, and production build pass
- Sprint 5 verification passes
- implementation and results are documented

## Out of Scope

The following remain outside Sprint 5:

- autonomous Birdy scheduling actions
- advanced schedule optimization
- adaptive duration prediction
- cross-product scheduling negotiation
- waitlists
- payments redesign
- production-scale write testing
