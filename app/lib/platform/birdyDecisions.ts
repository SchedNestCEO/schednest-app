export type BirdyDecisionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "executed"
  | "cancelled"
  | "expired";

export type BirdyDecisionProduct =
  | "platform"
  | "student"
  | "teams"
  | "med"
  | "business"
  | "life";

export type CreateBirdyDecisionInput = {
  ownerId: string;
  product: BirdyDecisionProduct;
  actionKey: string;
  recommendation: string;
  explanation?: string;
  confidence?: number;
  resourceType?: string;
  resourceId?: string;
  alternatives?: unknown[];
  constraints?: unknown[];
  metadata?: Record<string, unknown>;
};

export function buildBirdyDecision(
  input: CreateBirdyDecisionInput
) {
  return {
    owner_id: input.ownerId,
    product: input.product,
    action_key: input.actionKey,
    resource_type: input.resourceType || null,
    resource_id: input.resourceId || null,
    recommendation: input.recommendation,
    explanation: input.explanation || null,
    confidence: input.confidence ?? 0.5,
    alternatives: input.alternatives || [],
    constraints: input.constraints || [],
    metadata: input.metadata || {},
  };
}
