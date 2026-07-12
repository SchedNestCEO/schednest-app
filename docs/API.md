# SchedNest API Standards

## Goals

Predictable, authenticated, permission-aware, versionable, observable, and reusable across products.

## Route Rules

- validate every input
- return structured errors
- never trust client ownership fields
- authorize server-side
- log sensitive actions
- publish platform events after successful mutations

## Connector Interface

```ts
interface SchedNestConnector {
  authenticate(): Promise<void>;
  importItems(): Promise<unknown[]>;
  exportItem(item: unknown): Promise<void>;
  subscribeToChanges(): Promise<void>;
  revokeAccess(): Promise<void>;
}
```
