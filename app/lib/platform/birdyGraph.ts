import {
  BIRDY_GRAPH_NODE_TYPES,
  BIRDY_GRAPH_RELATIONSHIP_TYPES,
  BIRDY_PRODUCTS,
  isValidBirdyConfidence,
  type BirdyGraphNodeType,
  type BirdyGraphRelationshipType,
  type BirdyProduct,
} from "./birdyContracts";

export type BirdyGraphEntityInput = {
  product: BirdyProduct;
  entityType: BirdyGraphNodeType;
  canonicalKey: string;
  title: string;
  summary?: string | null;
  confidence?: number;
  resourceType?: string | null;
  resourceId?: string | null;
  sourceType?: "user" | "system" | "birdy" | "integration";
  metadata?: Record<string, unknown>;
};

export type BirdyGraphRelationshipInput = {
  sourceEntityId: string;
  targetEntityId: string;
  relationshipType: BirdyGraphRelationshipType;
  strength?: number;
  confidence?: number;
  explanation?: string | null;
  sourceType?: "user" | "system" | "birdy" | "integration";
  metadata?: Record<string, unknown>;
};

export function validateBirdyGraphEntityInput(
  input: BirdyGraphEntityInput,
): string | null {
  if (!BIRDY_PRODUCTS.includes(input.product)) {
    return "BIRDY_GRAPH_ENTITY_PRODUCT_INVALID";
  }

  if (!BIRDY_GRAPH_NODE_TYPES.includes(input.entityType)) {
    return "BIRDY_GRAPH_ENTITY_TYPE_INVALID";
  }

  if (!input.canonicalKey?.trim()) {
    return "BIRDY_GRAPH_ENTITY_CANONICAL_KEY_INVALID";
  }

  if (!input.title?.trim()) {
    return "BIRDY_GRAPH_ENTITY_TITLE_INVALID";
  }

  if (
    input.confidence !== undefined &&
    !isValidBirdyConfidence(input.confidence)
  ) {
    return "BIRDY_GRAPH_ENTITY_CONFIDENCE_INVALID";
  }

  return null;
}

export function validateBirdyGraphRelationshipInput(
  input: BirdyGraphRelationshipInput,
): string | null {
  if (!input.sourceEntityId?.trim()) {
    return "BIRDY_GRAPH_RELATIONSHIP_SOURCE_INVALID";
  }

  if (!input.targetEntityId?.trim()) {
    return "BIRDY_GRAPH_RELATIONSHIP_TARGET_INVALID";
  }

  if (input.sourceEntityId === input.targetEntityId) {
    return "BIRDY_GRAPH_RELATIONSHIP_SELF_REFERENCE_INVALID";
  }

  if (!BIRDY_GRAPH_RELATIONSHIP_TYPES.includes(input.relationshipType)) {
    return "BIRDY_GRAPH_RELATIONSHIP_TYPE_INVALID";
  }

  if (input.strength !== undefined && !isValidBirdyConfidence(input.strength)) {
    return "BIRDY_GRAPH_RELATIONSHIP_STRENGTH_INVALID";
  }

  if (
    input.confidence !== undefined &&
    !isValidBirdyConfidence(input.confidence)
  ) {
    return "BIRDY_GRAPH_RELATIONSHIP_CONFIDENCE_INVALID";
  }

  return null;
}
