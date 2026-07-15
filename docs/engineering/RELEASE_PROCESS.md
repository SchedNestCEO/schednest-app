# Release Process

## Prepare
Update the changelog and version manifest, review migrations, confirm environment variables, and document known issues.

## Validate
```bash
npm ci
npm run engineering:verify
npm run lint
npm run typecheck
npm run build
```

## Review
Confirm authentication, authorization, database impact, customer impact, operational visibility, failure behavior, and rollback steps.

## Deploy and verify
Merge only after checks pass. After deployment, verify key routes, authentication, event processing, Founder OS health, and errors.

## Rollback
Prefer the smallest safe rollback: revert the app release, disable a feature, pause a processor, or apply a forward repair migration. Never rewrite deployed migration history.
