export const BIRDY_PRODUCTS = [
  "platform",
  "student",
  "teams",
  "med",
  "business",
  "life",
] as const;

export type BirdyProduct = (typeof BIRDY_PRODUCTS)[number];

export const BIRDY_MEMORY_TYPES = [
  "session",
  "preference",
  "behavioral",
  "domain",
  "sensitive",
] as const;

export type BirdyMemoryType = (typeof BIRDY_MEMORY_TYPES)[number];

export const BIRDY_MEMORY_SOURCES = [
  "user",
  "system",
  "birdy",
  "integration",
] as const;

export type BirdyMemorySource = (typeof BIRDY_MEMORY_SOURCES)[number];

export const BIRDY_MEMORY_SENSITIVITIES = [
  "standard",
  "personal",
  "sensitive",
  "restricted",
] as const;

export type BirdyMemorySensitivity =
  (typeof BIRDY_MEMORY_SENSITIVITIES)[number];

export const BIRDY_PERMISSION_LEVELS = [
  "observe",
  "recommend",
  "ask",
  "execute",
  "never",
] as const;

export type BirdyPermissionLevel = (typeof BIRDY_PERMISSION_LEVELS)[number];

export const BIRDY_RISK_LEVELS = [
  "low",
  "medium",
  "high",
  "prohibited",
] as const;

export type BirdyRiskLevel = (typeof BIRDY_RISK_LEVELS)[number];

export const BIRDY_DECISION_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "executed",
  "cancelled",
  "expired",
] as const;

export type BirdyDecisionStatus = (typeof BIRDY_DECISION_STATUSES)[number];

export const BIRDY_GRAPH_NODE_TYPES = [
  "memory",
  "person",
  "customer",
  "booking",
  "service",
  "goal",
  "project",
  "task",
  "schedule",
  "activity",
  "knowledge",
  "decision",
  "suggestion",
  "recommendation",
  "student_record",
  "team_record",
  "med_record",
  "business_record",
  "life_record",
] as const;

export type BirdyGraphNodeType = (typeof BIRDY_GRAPH_NODE_TYPES)[number];

export const BIRDY_GRAPH_RELATIONSHIP_TYPES = [
  "belongs_to",
  "depends_on",
  "supports",
  "conflicts_with",
  "derived_from",
  "related_to",
  "assigned_to",
  "scheduled_for",
  "influences",
  "supersedes",
  "invalidates",
  "evidences",
  "recommended_for",
] as const;

export type BirdyGraphRelationshipType =
  (typeof BIRDY_GRAPH_RELATIONSHIP_TYPES)[number];

export const BIRDY_EVIDENCE_TYPES = [
  "record",
  "observation",
  "memory",
  "event",
  "user_confirmation",
  "system_calculation",
  "integration",
] as const;

export type BirdyEvidenceType = (typeof BIRDY_EVIDENCE_TYPES)[number];

export const BIRDY_CONFIDENCE_FACTORS = [
  "source_reliability",
  "evidence_quantity",
  "evidence_agreement",
  "freshness",
  "user_confirmation",
  "data_completeness",
  "historical_accuracy",
] as const;

export type BirdyConfidenceFactor = (typeof BIRDY_CONFIDENCE_FACTORS)[number];

export const BIRDY_RECOMMENDATION_STATUSES = [
  "draft",
  "pending",
  "presented",
  "approved",
  "rejected",
  "executed",
  "cancelled",
  "expired",
  "superseded",
] as const;

export type BirdyRecommendationStatus =
  (typeof BIRDY_RECOMMENDATION_STATUSES)[number];

function isOneOf<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
): value is T[number] {
  return typeof value === "string" && allowed.includes(value as T[number]);
}

export function isBirdyProduct(value: unknown): value is BirdyProduct {
  return isOneOf(value, BIRDY_PRODUCTS);
}

export function isBirdyMemoryType(value: unknown): value is BirdyMemoryType {
  return isOneOf(value, BIRDY_MEMORY_TYPES);
}

export function isBirdyMemorySource(
  value: unknown,
): value is BirdyMemorySource {
  return isOneOf(value, BIRDY_MEMORY_SOURCES);
}

export function isBirdyMemorySensitivity(
  value: unknown,
): value is BirdyMemorySensitivity {
  return isOneOf(value, BIRDY_MEMORY_SENSITIVITIES);
}

export function isBirdyPermissionLevel(
  value: unknown,
): value is BirdyPermissionLevel {
  return isOneOf(value, BIRDY_PERMISSION_LEVELS);
}

export function isBirdyRiskLevel(value: unknown): value is BirdyRiskLevel {
  return isOneOf(value, BIRDY_RISK_LEVELS);
}

export function isBirdyDecisionStatus(
  value: unknown,
): value is BirdyDecisionStatus {
  return isOneOf(value, BIRDY_DECISION_STATUSES);
}

export function isBirdyGraphNodeType(
  value: unknown,
): value is BirdyGraphNodeType {
  return isOneOf(value, BIRDY_GRAPH_NODE_TYPES);
}

export function isBirdyGraphRelationshipType(
  value: unknown,
): value is BirdyGraphRelationshipType {
  return isOneOf(value, BIRDY_GRAPH_RELATIONSHIP_TYPES);
}

export function isBirdyEvidenceType(
  value: unknown,
): value is BirdyEvidenceType {
  return isOneOf(value, BIRDY_EVIDENCE_TYPES);
}

export function isBirdyRecommendationStatus(
  value: unknown,
): value is BirdyRecommendationStatus {
  return isOneOf(value, BIRDY_RECOMMENDATION_STATUSES);
}

export function isValidBirdyConfidence(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}
