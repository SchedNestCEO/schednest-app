# Sprint 6 Dependency Remediation

## Completed remediation

SchedNest upgraded and verified the supported application toolchain, including:

- Next.js 16.2.12
- ESLint 9.39.5
- eslint-config-next 16.2.12
- Tailwind CSS 4.3.3
- @tailwindcss/postcss 4.3.3

Next.js normally resolved Sharp 0.34.5. SchedNest applies an npm override requiring
Sharp 0.35.3 to remediate the applicable Sharp and libvips security advisories.

## Remaining upstream dependency finding

Next.js 16.2.12 includes PostCSS 8.4.31 internally.

npm audit reports this nested package because applicable PostCSS advisories affect
that version.

A scoped PostCSS override to 8.5.23 was evaluated but rejected because npm retained
the nested PostCSS 8.4.31 package and marked the dependency tree invalid with
ELSPROBLEMS.

SchedNest will not run `npm audit fix --force`, because npm currently proposes
downgrading Next.js to 9.3.3, which is incompatible with the application.

## Current risk controls

- No arbitrary user-provided PostCSS plugins or configuration are executed.
- User-controlled CSS source-map input is not intentionally processed.
- Sharp resolves to 0.35.3 through a validated npm override.
- The installed dependency tree is valid.
- The complete SchedNest system test passes.
- Dependency audits will continue during engineering verification.
- Next.js will be upgraded when a compatible stable version replaces the affected
  bundled PostCSS release.

## Verification results

The following checks passed after remediation:

- Engineering Foundation verification
- Sprint 2 safeguards
- Sprint 3 performance verification
- Sprint 4 load-foundation verification
- Sprint 5 booking-integrity verification
- Environment validation
- Migration validation: 40 migrations
- Critical route validation
- Vercel configuration validation
- Engineering lint
- Lint no-regression budget
- TypeScript validation
- Unit tests: 6 passed
- Production build
- Browser regression tests: 15 passed
- Complete SchedNest system test

The complete system test passed in 131.7 seconds.

## Temporary exception acceptance

The remaining PostCSS exception is accepted temporarily only while:

- no critical audit findings exist;
- the remaining production high-severity finding is limited to Next.js's bundled
  PostCSS dependency;
- the dependency tree remains valid;
- Sharp resolves to 0.35.3 or newer;
- the complete system test remains passing;
- the exception is reassessed during every Next.js dependency upgrade.
