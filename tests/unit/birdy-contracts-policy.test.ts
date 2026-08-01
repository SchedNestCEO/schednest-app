import { describe, expect, test } from "vitest";
import {
  BIRDY_DECISION_STATUSES,
  BIRDY_EVIDENCE_TYPES,
  BIRDY_GRAPH_NODE_TYPES,
  BIRDY_GRAPH_RELATIONSHIP_TYPES,
  BIRDY_MEMORY_SENSITIVITIES,
  BIRDY_MEMORY_SOURCES,
  BIRDY_MEMORY_TYPES,
  BIRDY_PERMISSION_LEVELS,
  BIRDY_PRODUCTS,
  BIRDY_RECOMMENDATION_STATUSES,
  BIRDY_RISK_LEVELS,
  isBirdyDecisionStatus,
  isBirdyEvidenceType,
  isBirdyGraphNodeType,
  isBirdyGraphRelationshipType,
  isBirdyMemorySensitivity,
  isBirdyMemorySource,
  isBirdyMemoryType,
  isBirdyPermissionLevel,
  isBirdyProduct,
  isBirdyRecommendationStatus,
  isBirdyRiskLevel,
  isValidBirdyConfidence,
} from "../../app/lib/platform/birdyContracts";
import { resolveBirdyPolicy } from "../../app/lib/platform/birdyPolicy";

describe("Birdy runtime contracts", () => {
  test.each(BIRDY_PRODUCTS)("accepts Birdy product %s", (value) => {
    expect(isBirdyProduct(value)).toBe(true);
  });

  test.each(BIRDY_MEMORY_TYPES)("accepts memory type %s", (value) => {
    expect(isBirdyMemoryType(value)).toBe(true);
  });

  test.each(BIRDY_MEMORY_SOURCES)("accepts memory source %s", (value) => {
    expect(isBirdyMemorySource(value)).toBe(true);
  });

  test.each(BIRDY_MEMORY_SENSITIVITIES)(
    "accepts memory sensitivity %s",
    (value) => {
      expect(isBirdyMemorySensitivity(value)).toBe(true);
    },
  );

  test.each(BIRDY_PERMISSION_LEVELS)("accepts permission level %s", (value) => {
    expect(isBirdyPermissionLevel(value)).toBe(true);
  });

  test.each(BIRDY_RISK_LEVELS)("accepts risk level %s", (value) => {
    expect(isBirdyRiskLevel(value)).toBe(true);
  });

  test.each(BIRDY_DECISION_STATUSES)("accepts decision status %s", (value) => {
    expect(isBirdyDecisionStatus(value)).toBe(true);
  });

  test.each(BIRDY_GRAPH_NODE_TYPES)("accepts graph node type %s", (value) => {
    expect(isBirdyGraphNodeType(value)).toBe(true);
  });

  test.each(BIRDY_GRAPH_RELATIONSHIP_TYPES)(
    "accepts graph relationship %s",
    (value) => {
      expect(isBirdyGraphRelationshipType(value)).toBe(true);
    },
  );

  test.each(BIRDY_EVIDENCE_TYPES)("accepts evidence type %s", (value) => {
    expect(isBirdyEvidenceType(value)).toBe(true);
  });

  test.each(BIRDY_RECOMMENDATION_STATUSES)(
    "accepts recommendation status %s",
    (value) => {
      expect(isBirdyRecommendationStatus(value)).toBe(true);
    },
  );

  test.each([
    isBirdyProduct,
    isBirdyMemoryType,
    isBirdyMemorySource,
    isBirdyMemorySensitivity,
    isBirdyPermissionLevel,
    isBirdyRiskLevel,
    isBirdyDecisionStatus,
    isBirdyGraphNodeType,
    isBirdyGraphRelationshipType,
    isBirdyEvidenceType,
    isBirdyRecommendationStatus,
  ])("rejects unsupported contract values", (validator) => {
    expect(validator("unsupported")).toBe(false);
    expect(validator(null)).toBe(false);
    expect(validator(42)).toBe(false);
    expect(validator({})).toBe(false);
  });

  test.each([0, 0.25, 0.5, 0.85, 1])("accepts confidence %s", (confidence) => {
    expect(isValidBirdyConfidence(confidence)).toBe(true);
  });

  test.each([
    -0.01,
    1.01,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    "0.5",
    null,
    undefined,
  ])("rejects invalid confidence %s", (confidence) => {
    expect(isValidBirdyConfidence(confidence)).toBe(false);
  });
});

describe("Birdy policy resolution", () => {
  test("blocks generation when learning is disabled", () => {
    expect(
      resolveBirdyPolicy({
        product: "platform",
        actionKey: "generate_schedule_recommendations",
        learningAllowed: false,
      }),
    ).toMatchObject({
      allowed: false,
      reasonCode: "BIRDY_LEARNING_DISABLED",
    });
  });

  test("uses the safe recommendation-only default", () => {
    expect(
      resolveBirdyPolicy({
        product: "platform",
        actionKey: "generate_schedule_recommendations",
        learningAllowed: true,
      }),
    ).toEqual({
      allowed: true,
      permissionLevel: "recommend",
      riskLevel: "medium",
      requiresConfirmation: true,
      reasonCode: "BIRDY_POLICY_ALLOWED",
    });
  });

  test.each(["observe", "never"] as const)(
    "blocks permission level %s",
    (permissionLevel) => {
      expect(
        resolveBirdyPolicy({
          product: "platform",
          actionKey: "generate_schedule_recommendations",
          learningAllowed: true,
          permissionLevel,
          riskLevel: "medium",
        }),
      ).toMatchObject({
        allowed: false,
        reasonCode: "BIRDY_PERMISSION_DENIED",
      });
    },
  );

  test("blocks prohibited actions", () => {
    expect(
      resolveBirdyPolicy({
        product: "platform",
        actionKey: "generate_schedule_recommendations",
        learningAllowed: true,
        permissionLevel: "recommend",
        riskLevel: "prohibited",
      }),
    ).toMatchObject({
      allowed: false,
      reasonCode: "BIRDY_ACTION_PROHIBITED",
    });
  });

  test.each(["recommend", "ask", "execute"] as const)(
    "permits recommendation generation for %s",
    (permissionLevel) => {
      expect(
        resolveBirdyPolicy({
          product: "platform",
          actionKey: "generate_schedule_recommendations",
          learningAllowed: true,
          permissionLevel,
          riskLevel: "medium",
        }),
      ).toMatchObject({
        allowed: true,
        permissionLevel,
        reasonCode: "BIRDY_POLICY_ALLOWED",
      });
    },
  );

  test("denies an unknown action without an explicit permission", () => {
    expect(
      resolveBirdyPolicy({
        product: "platform",
        actionKey: "unknown_action",
        learningAllowed: true,
      }),
    ).toEqual({
      allowed: false,
      permissionLevel: "never",
      riskLevel: "prohibited",
      requiresConfirmation: true,
      reasonCode: "BIRDY_PERMISSION_MISSING",
    });
  });

  test("allows an unknown action with an explicit safe permission", () => {
    expect(
      resolveBirdyPolicy({
        product: "platform",
        actionKey: "custom_safe_action",
        learningAllowed: true,
        permissionLevel: "recommend",
        riskLevel: "low",
        requiresConfirmation: false,
      }),
    ).toEqual({
      allowed: true,
      permissionLevel: "recommend",
      riskLevel: "low",
      requiresConfirmation: false,
      reasonCode: "BIRDY_POLICY_ALLOWED",
    });
  });
});
