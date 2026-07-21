# SchedNest Database Standards

## Naming

- plural snake_case tables
- UUID primary keys
- timestamptz timestamps
- explicit status constraints
- consistent owner_id and workspace_id

## RLS

Every user-owned table must enable RLS and define select, insert, update, and delete policies without circular dependencies.

## Planned Shared Tables

- platform_notifications
- platform_notification_preferences
- platform_activity_events
- birdy_memories
- birdy_action_permissions
- coordination_items
- coordination_dependencies
- platform_files
- platform_connectors
- platform_feature_flags
- platform_metrics

## Booking Scheduling Integrity

Business bookings must use centralized protected RPCs rather than direct client inserts.

Required protections include:

- `end_time > start_time`
- tenant ownership validation
- service and customer validation
- business-hours validation
- reusable blocking-status logic
- database-level active-overlap prevention
- predictable `23P01` conflict responses
- safe `security definer` search paths
- explicit function permissions

Active booking overlap protection uses a PostgreSQL exclusion constraint with half-open time ranges:

```sql
tstzrange(start_time, end_time, '[)')
```

The half-open range allows adjacent appointments while rejecting duplicate, partial, contained, and fully overlapping appointments.

Applied migrations must never be edited after deployment. Corrections and rollbacks must use new forward migrations.

Controlled concurrent write testing must run against staging unless production testing receives explicit authorization.
