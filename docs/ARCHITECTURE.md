# SchedNest Architecture

```text
SchedNest Platform
├── Identity
├── Permissions
├── Coordination Engine
├── Notifications
├── Activity Log
├── Birdy Memory
├── Files
├── Settings
├── Connectors
├── Analytics
└── Products
    ├── Student
    ├── Teams
    ├── Med
    ├── Business
    └── Life
```

## Rules

- Shared capabilities live above products.
- Product-specific code stays thin.
- No duplicate notification, file, permission, memory, or activity systems.
- Birdy reads normalized platform data.
- Sensitive domains use stricter policy layers.
- Cross-product behavior is permission-aware.

## Event Pattern

```text
assignment.created
→ activity log
→ reminder scheduling
→ Birdy context update
→ analytics
→ coordination index update
```
