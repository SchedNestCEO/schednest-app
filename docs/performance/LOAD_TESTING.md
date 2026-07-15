# Load Testing

Load tests target localhost, preview, or staging by default. Production hosts are
blocked unless `ALLOW_PRODUCTION_LOAD_TEST=true` is deliberately supplied.
No CI job executes load tests automatically.

Business receives public-route and authenticated backend-read coverage. Student,
Teams, Medical, and Life receive route-level coverage. Life currently targets
`/coming-soon` until a dedicated Life route exists.
