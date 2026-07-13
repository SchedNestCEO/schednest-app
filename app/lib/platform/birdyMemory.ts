export type BirdyMemoryType =
  | "session"
  | "preference"
  | "behavioral"
  | "domain"
  | "sensitive";

export type BirdyMemorySource =
  | "user"
  | "system"
  | "birdy"
  | "integration";

export type BirdyMemorySensitivity =
  | "standard"
  | "personal"
  | "sensitive"
  | "restricted";

export type BirdyProduct =
  | "platform"
  | "student"
  | "teams"
  | "med"
  | "business"
  | "life";

export type CreateBirdyMemoryInput = {
  ownerId: string;
  product: BirdyProduct;
  memoryType: BirdyMemoryType;
  title: string;
  content: string;
  source?: BirdyMemorySource;
  confidence?: number;
  sensitivity?: BirdyMemorySensitivity;
  isUserConfirmed?: boolean;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
};

export function buildBirdyMemory(input: CreateBirdyMemoryInput) {
  return {
    owner_id: input.ownerId,
    product: input.product,
    memory_type: input.memoryType,
    title: input.title,
    content: input.content,
    source: input.source || "user",
    confidence: input.confidence ?? 1,
    sensitivity: input.sensitivity || "standard",
    is_user_confirmed: input.isUserConfirmed || false,
    expires_at: input.expiresAt || null,
    metadata: input.metadata || {},
  };
}
