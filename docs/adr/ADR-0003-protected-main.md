# ADR-0003: Main Must Remain Deployable

- Status: Accepted
- Date: 2026-07-13

## Context
Unverified changes to the primary branch increase broken deployment and rollback risk.

## Decision
`main` represents deployable code. Work occurs on focused branches and merges only after required checks.

## Consequences
Changes receive clearer validation and rollback history.
