# Sprint 8 — Birdy Intelligence Foundation

## Objective

Transform Birdy from several connected recommendation features into a unified,
permission-aware operational intelligence system built on an explainable
knowledge graph.

Sprint 8 creates the intelligence foundation. Sprint 9 will focus on evaluation,
calibration, staged autonomy, safety controls, and execution governance.

## Existing Foundation

- Birdy memories
- Birdy memory settings
- Birdy action permissions
- Birdy action decisions
- Birdy schedule optimizer
- Business Birdy suggestions
- Platform privacy and consent controls
- Tenant-scoped row-level security
- Synthetic owner-isolation tests

## Required Sprint 8 Capabilities

### 1. Unified Birdy Contracts

Create shared runtime-validated contracts for:

- products
- memory types
- memory sources
- sensitivity levels
- permission levels
- risk levels
- decision states
- graph node types
- graph relationship types
- evidence types
- confidence factors
- recommendation lifecycle states

All APIs, pages, migrations, tests, and Birdy services must use these contracts.

### 2. Knowledge Graph Foundation

Create owner-scoped graph storage for:

- entities
- relationships
- observations
- evidence
- confidence assessments
- provenance
- temporal validity
- supersession and invalidation
- graph health and integrity state

Every graph object must include tenant ownership, source attribution, creation
time, update time, and lifecycle state.

### 3. Unified Intelligence Model

Unify the relationships between:

- memories
- permissions
- suggestions
- recommendations
- decisions
- activities
- goals
- projects
- tasks
- people
- customers
- bookings
- services
- schedules
- Student records
- Teams records
- Med records
- Business records
- Life records

Existing tables should not be discarded. They should connect to the graph
through stable resource references.

### 4. Evidence and Explainability

Every Birdy recommendation must be able to report:

- what Birdy observed
- which records were used
- why those records were relevant
- which constraints applied
- which permission applied
- confidence score
- confidence factors
- uncertainty
- alternatives considered
- expected impact
- freshness of supporting evidence
- whether sensitive data was involved

### 5. Permission Enforcement

Birdy must resolve permission before producing or executing an action.

Required outcomes:

- observe
- recommend
- ask
- execute
- never

The resolved permission must account for:

- product
- action
- risk
- owner configuration
- consent
- sensitivity
- confirmation requirement
- resource context
- temporary conditions

Sprint 8 remains recommendation-first. High-risk execution is deferred to
Sprint 9 unless explicitly implemented and tested as safe.

### 6. Unified API Boundary

Birdy pages must use authenticated APIs rather than duplicating direct database
logic.

APIs must provide:

- runtime validation
- stable error codes
- structured internal logging
- tenant isolation
- permission checks
- consent checks
- pagination
- deterministic filtering
- concurrency handling
- idempotency where writes may be retried

Raw database errors must not be exposed to clients.

### 7. Birdy Intelligence Map

Implement the Birdy Intelligence Map using the approved visual direction.

Required modules:

- Memory Cluster
- Strategic Goals
- People Network
- Project Nexus
- Knowledge Base
- Decision Pathways
- Activity Stream
- Routing Traces
- Birdy Confidence

The interface must reveal relationships and explanations without exposing data
outside the authenticated tenant.

### 8. Automated Test Network

Every Sprint 8 capability must include:

- unit tests for contracts and confidence calculations
- integration tests for graph writes and relationship integrity
- API validation and authentication tests
- tenant-isolation tests
- permission-enforcement tests
- consent and sensitive-data tests
- concurrency and idempotency tests
- failure-isolation tests
- synthetic cross-module workflows
- architecture-map assignments
- resilience-matrix assessments

## Required Failure Handling

Sprint 8 must test:

- malformed graph records
- missing source resources
- deleted or archived source resources
- stale evidence
- duplicate ingestion
- concurrent relationship creation
- permission changes during recommendation generation
- consent withdrawal
- partial graph-write failure
- invalid confidence values
- circular relationships
- cross-tenant resource references
- recommendation generation with incomplete data

## Sprint 9 Handoff

Sprint 8 must leave explicit interfaces for:

- Birdy evaluation datasets
- confidence calibration
- recommendation scoring
- staged autonomy
- simulation mode
- shadow execution
- approval thresholds
- rollback
- safety policies
- outcome tracking
- decision-quality measurement

## Completion Standard

Sprint 8 is complete only when every added capability is:

- connected
- observable
- secure
- permission-aware
- consent-aware
- testable
- explainable
- recoverable
- migration-safe
- failure-contained
- tenant-isolated
- mapped into the platform architecture
