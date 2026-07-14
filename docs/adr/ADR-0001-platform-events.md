# ADR-0001: Platform Events for Cross-Product Coordination

- Status: Accepted
- Date: 2026-07-13

## Context
Direct table writes between products create coupling and unclear ownership.

## Decision
Cross-product coordination uses documented shared platform services and platform events. Products do not directly mutate another product's private data.

## Consequences
This improves separation, auditability, and independent evolution while adding event-contract, idempotency, and failure-handling responsibilities.
