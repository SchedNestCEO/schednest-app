# Testing Strategy

## Quality layers
- Static: ESLint, TypeScript, foundation verification
- Build: production Next.js build
- Unit: pure logic and validation
- Integration: database, authorization, events, processors, adapters
- Smoke: critical post-deployment paths
- Regression: previously working behavior
- Performance: approved staging only
- Resilience: bounded, reversible, isolated from production

## Sprint 1 gate
```bash
npm run engineering:verify
npm run lint
npm run typecheck
npm run build
```
