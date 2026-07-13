export type PlatformProduct =
  | "platform"
  | "student"
  | "teams"
  | "med"
  | "business"
  | "life";

export type ActivitySeverity =
  | "info"
  | "success"
  | "warning"
  | "critical";

export type ActivitySource =
  | "user"
  | "system"
  | "birdy"
  | "integration";

export type CreateActivityInput = {
  ownerId: string;
  product: PlatformProduct;
  eventType: string;
  action: string;
  title: string;
  description?: string;
  resourceType?: string;
  resourceId?: string;
  severity?: ActivitySeverity;
  source?: ActivitySource;
  metadata?: Record<string, unknown>;
};

export function buildActivityEvent(input: CreateActivityInput) {
  return {
    owner_id: input.ownerId,
    product: input.product,
    event_type: input.eventType,
    action: input.action,
    resource_type: input.resourceType || null,
    resource_id: input.resourceId || null,
    title: input.title,
    description: input.description || null,
    severity: input.severity || "info",
    source: input.source || "user",
    metadata: input.metadata || {},
  };
}
