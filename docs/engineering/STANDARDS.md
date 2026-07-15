# Engineering Standards

## Maintainability
Code must favor clear ownership, explicit interfaces, and predictable behavior. The repository—not chat history—is the source of truth.

## Product boundaries
Business, Student, Teams, Medical, and Life are independent products. A product must not directly modify another product's private tables or internals. Cross-product behavior uses shared platform services, documented APIs, or platform events.

## Shared services
Shared services define contracts, validate inputs, enforce authorization, expose failures, avoid silent data loss, and document ownership.

## Birdy
Birdy may analyze, recommend, prioritize, explain, and draft. Privileged or consequential actions require explicit authorization and an auditable path.

## Database
- Deployed migrations are immutable.
- Every schema change uses a new migration.
- Security policies are reviewed with schema changes.
- Destructive changes require transition and repair plans.

## APIs
Validate input, enforce authorization server-side, keep service credentials server-side, return intentional errors, and log meaningful failures without exposing secrets.

## UI
Handle loading, empty, success, and error states. Admin interfaces verify access. Operational dashboards distinguish live data from placeholders.

## Documentation
Major systems document purpose, ownership, dependencies, data, APIs, events, failures, security boundaries, and rollback considerations.
