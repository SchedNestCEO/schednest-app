export type CoordinationProduct =
  | "platform"
  | "student"
  | "teams"
  | "med"
  | "business"
  | "life";

export type CoordinationFlexibility =
  | "fixed"
  | "movable"
  | "preferred";

export type CreateCoordinationItemInput = {
  ownerId: string;
  product: CoordinationProduct;
  itemType: string;
  title: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  dueAt?: string;
  timezone?: string;
  priority?: number;
  flexibility?: CoordinationFlexibility;
  expectedDurationMinutes?: number;
  minimumDurationMinutes?: number;
  maximumDurationMinutes?: number;
  earliestStart?: string;
  latestEnd?: string;
  location?: string;
  participants?: unknown[];
  dependencies?: unknown[];
  sourceTable?: string;
  sourceId?: string;
  aiGenerated?: boolean;
  userLocked?: boolean;
  confidence?: number;
  metadata?: Record<string, unknown>;
};

export function buildCoordinationItem(
  input: CreateCoordinationItemInput
) {
  return {
    owner_id: input.ownerId,
    product: input.product,
    item_type: input.itemType,
    source_table: input.sourceTable || null,
    source_id: input.sourceId || null,
    title: input.title,
    description: input.description || null,
    starts_at: input.startsAt || null,
    ends_at: input.endsAt || null,
    due_at: input.dueAt || null,
    timezone: input.timezone || "UTC",
    priority: input.priority ?? 3,
    flexibility: input.flexibility || "fixed",
    expected_duration_minutes:
      input.expectedDurationMinutes || null,
    minimum_duration_minutes:
      input.minimumDurationMinutes || null,
    maximum_duration_minutes:
      input.maximumDurationMinutes || null,
    earliest_start: input.earliestStart || null,
    latest_end: input.latestEnd || null,
    location: input.location || null,
    participants: input.participants || [],
    dependencies: input.dependencies || [],
    ai_generated: input.aiGenerated || false,
    user_locked: input.userLocked || false,
    confidence: input.confidence ?? 1,
    metadata: input.metadata || {},
  };
}
