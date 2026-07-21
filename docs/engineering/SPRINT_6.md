# Engineering Phase 1 — Sprint 6

Status: Planned

## Theme

Launch Readiness, Site Health, and Full-Site Verification

## Objective

Make SchedNest ready for a controlled launch by completing reliability work, applying the Torogoz visual system, instrumenting CEO Admin site health, and proving every known capability through a traceable full-site test.

Sprint 6 must establish a reliable foundation before Birdy Foundation work begins in Sprint 7.

## Work-Item Identification Standard

Every Sprint 6 item must use a stable human-readable identifier.

Format: `S6-{WORKSTREAM}-{NUMBER}`

Workstream codes:

- `PLAN` — planning and capability inventory
- `REL` — reliability and scheduling correctness
- `BRAND` — Torogoz design-system rollout
- `TEST` — automated and manual testing
- `HEALTH` — CEO Admin site health
- `SEC` — permissions, RLS, and security validation
- `OPS` — monitoring, backup, recovery, and support
- `DEFECT` — defects discovered during verification
- `GATE` — release and sprint completion gates

Each work item must define its ID, title, acceptance criteria, owner, status, estimated duration, remaining duration, dependencies, blocker reason, risk, severity, milestone, and calculated critical-path status.

## Primary Scope

### 1. Capability Inventory and Traceability

Create a complete inventory of the current site, including routes, pages, navigation, buttons, forms, roles, permissions, CRUD operations, public and authenticated workflows, loading states, empty states, success states, error states, emails, notifications, uploads, integrations, and scheduled actions.

Every known capability must map through this chain:

`Capability ID → Work Item ID → Test ID → Defect ID → Retest Result → Release Gate`

### 2. Booking Reliability

Complete business-timezone correctness, browser-timezone independence, duplicate-click protection, network-retry idempotency, expired-session recovery, conflict recovery, safe availability refreshes, and persistent booking tests.

### 3. Torogoz Design System Rollout

Apply reusable design tokens across the site:

- cream and warm white backgrounds
- charcoal and black structural surfaces
- turquoise primary actions and active states
- orange urgent conflicts and alerts
- golden olive tentative and secondary states
- restrained multicolor branding
- reduced saturation and accessible contrast

### 4. Automated Regression Coverage

Cover authentication, onboarding, profiles, services, customers, manual bookings, public bookings, booking requests, status transitions, overlap cases, business hours, tenant isolation, unauthorized access, responsive critical paths, and failure recovery.

### 5. CEO Admin Site Health v1

Reuse and extend Founder OS and Performance Center foundations to show:

- overall Healthy, Warning, or Critical status
- website and API availability
- latency and failure rates
- booking success and failure health
- authentication failures
- migration alignment
- product-by-product health
- incidents, deployments, and alerts
- plain-language impact summaries

### 6. Critical-Path and Release-Gate Foundation

Extend the existing coordination engine with:

- human-readable work-item IDs
- normalized dependency records
- dependency types
- blocker reasons
- milestones and release gates
- remaining-duration tracking
- cycle detection
- earliest and latest dates
- schedule slack
- calculated critical-path status
- CEO-level release-readiness reporting

Critical-path designation must be calculated from dependencies and durations rather than manually assigned.

### 7. Full-Site System Test v1.0

Run the complete traceability matrix against staging after reliability and Torogoz rollout work is complete.

Allowed outcomes:

- Passed
- Failed
- Blocked
- Deferred with written justification
- Not applicable

### 8. Launch Operations Foundation

Verify monitoring, backup and recovery, rollback readiness, feature flags, audit coverage, product analytics, customer data export and deletion readiness, and basic CEO Admin support tooling.

## Initial Critical Path

1. `S6-PLAN-001` — capability inventory
2. `S6-REL-001` — timezone correctness
3. `S6-REL-002` — submission idempotency
4. `S6-BRAND-001` — Torogoz design tokens
5. `S6-BRAND-002` — site-wide visual rollout
6. `S6-TEST-001` — automated regression coverage
7. `S6-HEALTH-001` — CEO Admin Site Health v1
8. `S6-TEST-002` — Full-Site System Test v1.0
9. `S6-DEFECT-*` — resolve critical and high-severity defects
10. `S6-GATE-001` — launch-readiness approval

This path must be recalculated as dependencies and estimates become more precise.

## Definition of Done

Sprint 6 is complete when:

- 100% of known capabilities are inventoried and mapped to tests
- 100% of critical workflows are executed and pass
- no critical or high-severity defects remain unresolved
- timezone and retry protections pass
- tenant isolation and RLS tests pass
- Torogoz styling is consistently applied
- accessibility and contrast checks pass
- CEO Admin detects simulated health failures
- critical-path and release-gate reporting works
- automated regression tests pass
- migrations, routes, lint, typecheck, and production build pass
- generated test data is removed
- results and accepted deferrals are documented

## Out of Scope

- autonomous Birdy actions
- Birdy memory and recommendation UX
- multi-agent scheduling negotiation
- advanced schedule optimization
- broad production write testing
- full calendar integrations
- complete billing implementation
- payments and deposits
- waitlists
- multi-location and resource scheduling

## Expected Outcome

SchedNest has a consistent visual identity, reliable booking behavior, measurable site health, complete capability-to-test traceability, and documented evidence that the current product is ready for a controlled launch.

Birdy Foundation work may begin only after `S6-GATE-001` is approved.
