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
