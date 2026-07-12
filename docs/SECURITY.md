# SchedNest Security Standards

## Principles

- least privilege
- deny by default
- explicit sharing
- immediate revocation
- secure defaults
- auditable actions
- defense in depth

## Required Controls

- RLS on every user-owned table
- no recursive policies
- secure helper functions
- workspace isolation
- caregiver scope enforcement
- signed private file URLs
- input validation
- rate limiting
- server-side authorization
- audit logging

## Security Test Matrix

For every resource verify owner access, collaborator access, unauthorized denial, immediate revocation, workspace isolation, invitation ownership, protected-field integrity, private file access, and safe failure.
