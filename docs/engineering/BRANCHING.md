# Branching Strategy

`main` must remain deployable. Use focused working branches:

- `feature/<description>`
- `fix/<description>`
- `engineering/<description>`
- `docs/<description>`
- `release/<version>`

For this sprint:

```bash
git checkout -b engineering/phase-1-foundation
```

A permanent `develop` branch is not required until release volume makes it useful. Avoid unnecessary branch complexity.
