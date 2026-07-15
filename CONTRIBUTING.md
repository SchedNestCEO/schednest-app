# Contributing to SchedNest

## Workflow
1. Pull the latest stable branch.
2. Create a focused branch.
3. Read `CONSTITUTION.md` and relevant docs.
4. Implement, document, and test the change.
5. Run all quality checks before merge.

## Branch names
- `feature/<description>`
- `fix/<description>`
- `engineering/<description>`
- `docs/<description>`
- `release/<version>`

## Required checks
```bash
npm ci
npm run engineering:verify
npm run lint
npm run typecheck
npm run build
```

## Core rules
- Products do not directly mutate another product's private data.
- Cross-product coordination uses shared platform services and events.
- Birdy recommends; consequential actions require authorization.
- Never edit a deployed migration.
- Never expose privileged credentials to browser code.
- Every meaningful change includes documentation and rollback notes.
