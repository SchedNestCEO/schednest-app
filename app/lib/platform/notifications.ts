export type PlatformProduct =
  | "platform"
  | "student"
  | "teams"
  | "med"
  | "business"
  | "life";

export type NotificationSeverity =
  | "info"
  | "success"
  | "warning"
  | "critical";

export type CreatePlatformNotificationInput = {
  ownerId: string;
  product: PlatformProduct;
  notificationType: string;
  title: string;
  body?: string;
  actionUrl?: string;
  severity?: NotificationSeverity;
  scheduledFor?: string;
  dedupeKey?: string;
  metadata?: Record<string, unknown>;
};

export function buildPlatformNotification(
  input: CreatePlatformNotificationInput
) {
  return {
    owner_id: input.ownerId,
    product: input.product,
    notification_type: input.notificationType,
    title: input.title,
    body: input.body || null,
    action_url: input.actionUrl || null,
    severity: input.severity || "info",
    status: input.scheduledFor ? "scheduled" : "pending",
    scheduled_for: input.scheduledFor || null,
    dedupe_key: input.dedupeKey || null,
    metadata: input.metadata || {},
  };
}
