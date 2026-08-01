import { describe, expect, test } from "vitest";
import {
  validateBirdyGraphEntityInput,
  validateBirdyGraphRelationshipInput,
  type BirdyGraphEntityInput,
  type BirdyGraphRelationshipInput,
} from "../../app/lib/platform/birdyGraph";

const validEntity: BirdyGraphEntityInput = {
  product: "platform",
  entityType: "project",
  canonicalKey: "project:schednest",
  title: "SchedNest",
  confidence: 0.9,
  sourceType: "user",
  metadata: {},
};

const validRelationship: BirdyGraphRelationshipInput = {
  sourceEntityId: "11111111-1111-4111-8111-111111111111",
  targetEntityId: "22222222-2222-4222-8222-222222222222",
  relationshipType: "depends_on",
  strength: 0.8,
  confidence: 0.75,
  sourceType: "birdy",
  metadata: {},
};

describe("Birdy graph entity validation", () => {
  test("accepts a valid graph entity", () => {
    expect(validateBirdyGraphEntityInput(validEntity)).toBeNull();
  });

  test("accepts confidence boundaries", () => {
    expect(
      validateBirdyGraphEntityInput({
        ...validEntity,
        confidence: 0,
      }),
    ).toBeNull();

    expect(
      validateBirdyGraphEntityInput({
        ...validEntity,
        confidence: 1,
      }),
    ).toBeNull();
  });

  test.each([
    {
      field: "product",
      value: "unsupported",
      code: "BIRDY_GRAPH_ENTITY_PRODUCT_INVALID",
    },
    {
      field: "entityType",
      value: "unsupported",
      code: "BIRDY_GRAPH_ENTITY_TYPE_INVALID",
    },
    {
      field: "canonicalKey",
      value: "   ",
      code: "BIRDY_GRAPH_ENTITY_CANONICAL_KEY_INVALID",
    },
    {
      field: "title",
      value: "",
      code: "BIRDY_GRAPH_ENTITY_TITLE_INVALID",
    },
    {
      field: "confidence",
      value: -0.01,
      code: "BIRDY_GRAPH_ENTITY_CONFIDENCE_INVALID",
    },
    {
      field: "confidence",
      value: 1.01,
      code: "BIRDY_GRAPH_ENTITY_CONFIDENCE_INVALID",
    },
    {
      field: "confidence",
      value: Number.NaN,
      code: "BIRDY_GRAPH_ENTITY_CONFIDENCE_INVALID",
    },
  ])("rejects invalid entity field $field", ({ field, value, code }) => {
    const input = {
      ...validEntity,
      [field]: value,
    } as BirdyGraphEntityInput;

    expect(validateBirdyGraphEntityInput(input)).toBe(code);
  });
});

describe("Birdy graph relationship validation", () => {
  test("accepts a valid graph relationship", () => {
    expect(validateBirdyGraphRelationshipInput(validRelationship)).toBeNull();
  });

  test("accepts strength and confidence boundaries", () => {
    expect(
      validateBirdyGraphRelationshipInput({
        ...validRelationship,
        strength: 0,
        confidence: 1,
      }),
    ).toBeNull();
  });

  test.each([
    {
      field: "sourceEntityId",
      value: "   ",
      code: "BIRDY_GRAPH_RELATIONSHIP_SOURCE_INVALID",
    },
    {
      field: "targetEntityId",
      value: "",
      code: "BIRDY_GRAPH_RELATIONSHIP_TARGET_INVALID",
    },
    {
      field: "relationshipType",
      value: "unsupported",
      code: "BIRDY_GRAPH_RELATIONSHIP_TYPE_INVALID",
    },
    {
      field: "strength",
      value: -0.01,
      code: "BIRDY_GRAPH_RELATIONSHIP_STRENGTH_INVALID",
    },
    {
      field: "strength",
      value: 1.01,
      code: "BIRDY_GRAPH_RELATIONSHIP_STRENGTH_INVALID",
    },
    {
      field: "confidence",
      value: Number.POSITIVE_INFINITY,
      code: "BIRDY_GRAPH_RELATIONSHIP_CONFIDENCE_INVALID",
    },
  ])("rejects invalid relationship field $field", ({ field, value, code }) => {
    const input = {
      ...validRelationship,
      [field]: value,
    } as BirdyGraphRelationshipInput;

    expect(validateBirdyGraphRelationshipInput(input)).toBe(code);
  });

  test("rejects self-referencing relationships", () => {
    expect(
      validateBirdyGraphRelationshipInput({
        ...validRelationship,
        targetEntityId: validRelationship.sourceEntityId,
      }),
    ).toBe("BIRDY_GRAPH_RELATIONSHIP_SELF_REFERENCE_INVALID");
  });
});
