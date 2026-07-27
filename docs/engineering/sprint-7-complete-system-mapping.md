# Sprint 7: Complete System Mapping and Synthetic Verification

## Objective

Create an authoritative map of every SchedNest page, API endpoint, role,
state, dependency, and test, then use isolated synthetic users and customers
to verify that the platform functions as one connected system.

## Required outcomes

1. Every application page, API route, and layout is registered.
2. Every mapped capability identifies its access model and expected states.
3. Every page control and workflow receives a stable capability identifier.
4. Every capability is assigned one or more automated tests.
5. Synthetic business owners and customers can be created deterministically.
6. Synthetic data is isolated from production and automatically removed.
7. Cross-business access attempts are denied and tested.
8. Complete workflows are tested from customer action through business result.
9. Sprint 7 verification fails when repository functionality is not mapped.
10. The complete system test includes the Sprint 7 gate.

## Test layers

- Static repository inventory
- Unit tests
- Database and RPC integration tests
- API authorization tests
- Browser component and state tests
- Full synthetic-user workflows
- Tenant-isolation tests
- Cleanup and repeatability tests
- Production build and deployment safeguards

## Synthetic actors

- Platform administrator
- Business owner
- Business employee
- Public booking customer
- Medical user
- Caregiver
- Student
- Team administrator
- Team member
- Unauthenticated visitor

## Safety requirements

Synthetic-user tests must refuse to run against production credentials.
Synthetic users and records must use deterministic identifiers and dedicated
test email domains. Payment tests must use Stripe test mode. Email,
notification, and reminder delivery must be intercepted or redirected.
