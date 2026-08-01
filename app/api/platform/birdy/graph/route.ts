import { NextRequest, NextResponse } from "next/server";
import {
  validateBirdyGraphEntityInput,
  validateBirdyGraphRelationshipInput,
  type BirdyGraphEntityInput,
  type BirdyGraphRelationshipInput,
} from "../../../../lib/platform/birdyGraph";
import {
  isBirdyProduct,
  type BirdyGraphNodeType,
  type BirdyGraphRelationshipType,
  type BirdyProduct,
} from "../../../../lib/platform/birdyContracts";
import { createAuthenticatedRouteClient } from "../../../../lib/supabase/admin";

const GRAPH_SOURCE_TYPES = ["user", "system", "birdy", "integration"] as const;

type GraphSourceType = (typeof GRAPH_SOURCE_TYPES)[number];

type CreateGraphEntityBody = {
  kind: "entity";
  product?: unknown;
  entityType?: unknown;
  canonicalKey?: unknown;
  title?: unknown;
  summary?: unknown;
  confidence?: unknown;
  resourceType?: unknown;
  resourceId?: unknown;
  sourceType?: unknown;
  metadata?: unknown;
};

type CreateGraphRelationshipBody = {
  kind: "relationship";
  sourceEntityId?: unknown;
  targetEntityId?: unknown;
  relationshipType?: unknown;
  strength?: unknown;
  confidence?: unknown;
  explanation?: unknown;
  sourceType?: unknown;
  metadata?: unknown;
};

function getAccessToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
}

function isGraphSourceType(value: unknown): value is GraphSourceType {
  return (
    typeof value === "string" &&
    GRAPH_SOURCE_TYPES.includes(value as GraphSourceType)
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function graphValidationMessage(code: string) {
  const messages: Record<string, string> = {
    BIRDY_GRAPH_ENTITY_PRODUCT_INVALID: "Invalid Birdy product.",
    BIRDY_GRAPH_ENTITY_TYPE_INVALID: "Invalid Birdy graph entity type.",
    BIRDY_GRAPH_ENTITY_CANONICAL_KEY_INVALID: "canonicalKey must contain text.",
    BIRDY_GRAPH_ENTITY_TITLE_INVALID: "title must contain text.",
    BIRDY_GRAPH_ENTITY_CONFIDENCE_INVALID:
      "confidence must be between 0 and 1.",
    BIRDY_GRAPH_RELATIONSHIP_SOURCE_INVALID:
      "sourceEntityId must contain text.",
    BIRDY_GRAPH_RELATIONSHIP_TARGET_INVALID:
      "targetEntityId must contain text.",
    BIRDY_GRAPH_RELATIONSHIP_SELF_REFERENCE_INVALID:
      "A graph relationship cannot reference the same entity twice.",
    BIRDY_GRAPH_RELATIONSHIP_TYPE_INVALID:
      "Invalid Birdy graph relationship type.",
    BIRDY_GRAPH_RELATIONSHIP_STRENGTH_INVALID:
      "strength must be between 0 and 1.",
    BIRDY_GRAPH_RELATIONSHIP_CONFIDENCE_INVALID:
      "confidence must be between 0 and 1.",
  };

  return messages[code] || "Invalid Birdy graph input.";
}

export async function GET(request: NextRequest) {
  const accessToken = getAccessToken(request);

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAuthenticatedRouteClient(accessToken);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestedProduct = request.nextUrl.searchParams.get("product");

  if (
    requestedProduct &&
    requestedProduct !== "all" &&
    !isBirdyProduct(requestedProduct)
  ) {
    return NextResponse.json(
      {
        error: "Invalid Birdy product.",
        code: "BIRDY_GRAPH_PRODUCT_INVALID",
      },
      { status: 400 },
    );
  }

  let entityQuery = supabase
    .from("birdy_graph_entities")
    .select(
      "id, product, entity_type, resource_type, resource_id, canonical_key, title, summary, sensitivity, confidence, source_type, source_reference, metadata, lifecycle_status, valid_from, valid_until, observed_at, last_verified_at, superseded_by_entity_id, created_at, updated_at",
    )
    .eq("owner_id", user.id)
    .eq("lifecycle_status", "active")
    .order("updated_at", {
      ascending: false,
    })
    .limit(250);

  if (requestedProduct && requestedProduct !== "all") {
    entityQuery = entityQuery.eq("product", requestedProduct);
  }

  const { data: entities, error: entityError } = await entityQuery;

  if (entityError) {
    console.error("Birdy graph entity lookup failed:", entityError);

    return NextResponse.json(
      {
        error: "Birdy knowledge graph is temporarily unavailable.",
        code: "BIRDY_GRAPH_ENTITY_LOOKUP_FAILED",
      },
      { status: 503 },
    );
  }

  const entityIds = (entities || []).map((entity) => entity.id);

  if (entityIds.length === 0) {
    return NextResponse.json({
      entities: [],
      relationships: [],
      evidence: [],
      confidenceAssessments: [],
      summary: {
        entityCount: 0,
        relationshipCount: 0,
        evidenceCount: 0,
        averageConfidence: 0,
      },
    });
  }

  const [relationshipResult, evidenceResult, confidenceResult] =
    await Promise.all([
      supabase
        .from("birdy_graph_relationships")
        .select(
          "id, source_entity_id, target_entity_id, relationship_type, strength, confidence, explanation, source_type, source_reference, metadata, lifecycle_status, valid_from, valid_until, observed_at, last_verified_at, created_at, updated_at",
        )
        .eq("owner_id", user.id)
        .eq("lifecycle_status", "active")
        .in("source_entity_id", entityIds)
        .in("target_entity_id", entityIds)
        .order("updated_at", {
          ascending: false,
        })
        .limit(500),

      supabase
        .from("birdy_graph_evidence")
        .select(
          "id, entity_id, relationship_id, evidence_type, resource_type, resource_id, claim, reliability, freshness, supports_claim, sensitive_data_used, source_reference, metadata, observed_at, expires_at, invalidated_at, invalidation_reason, created_at",
        )
        .eq("owner_id", user.id)
        .is("invalidated_at", null)
        .order("created_at", {
          ascending: false,
        })
        .limit(500),

      supabase
        .from("birdy_confidence_assessments")
        .select(
          "id, entity_id, relationship_id, decision_id, overall_confidence, uncertainty, factors, explanation, evidence_count, calibration_version, metadata, assessed_at, created_at",
        )
        .eq("owner_id", user.id)
        .order("assessed_at", {
          ascending: false,
        })
        .limit(500),
    ]);

  if (
    relationshipResult.error ||
    evidenceResult.error ||
    confidenceResult.error
  ) {
    console.error(
      "Birdy graph dependency lookup failed:",
      relationshipResult.error ||
        evidenceResult.error ||
        confidenceResult.error,
    );

    return NextResponse.json(
      {
        error: "Birdy knowledge graph is temporarily unavailable.",
        code: "BIRDY_GRAPH_DEPENDENCY_LOOKUP_FAILED",
      },
      { status: 503 },
    );
  }

  const relationshipIds = new Set(
    (relationshipResult.data || []).map((relationship) => relationship.id),
  );

  const entityIdSet = new Set(entityIds);

  const evidence = (evidenceResult.data || []).filter(
    (item) =>
      (item.entity_id !== null && entityIdSet.has(item.entity_id)) ||
      (item.relationship_id !== null &&
        relationshipIds.has(item.relationship_id)),
  );

  const confidenceAssessments = (confidenceResult.data || []).filter(
    (item) =>
      (item.entity_id !== null && entityIdSet.has(item.entity_id)) ||
      (item.relationship_id !== null &&
        relationshipIds.has(item.relationship_id)),
  );

  const confidenceTotal = (entities || []).reduce(
    (sum, entity) => sum + Number(entity.confidence || 0),
    0,
  );

  return NextResponse.json({
    entities: entities || [],
    relationships: relationshipResult.data || [],
    evidence,
    confidenceAssessments,
    summary: {
      entityCount: entities?.length || 0,
      relationshipCount: relationshipResult.data?.length || 0,
      evidenceCount: evidence.length,
      averageConfidence:
        entities && entities.length > 0 ? confidenceTotal / entities.length : 0,
    },
  });
}

export async function POST(request: NextRequest) {
  const accessToken = getAccessToken(request);

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAuthenticatedRouteClient(accessToken);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateGraphEntityBody | CreateGraphRelationshipBody;

  try {
    body = (await request.json()) as
      CreateGraphEntityBody | CreateGraphRelationshipBody;
  } catch {
    return NextResponse.json(
      {
        error: "Invalid JSON body",
        code: "BIRDY_GRAPH_JSON_INVALID",
      },
      { status: 400 },
    );
  }

  if (!body || (body.kind !== "entity" && body.kind !== "relationship")) {
    return NextResponse.json(
      {
        error: 'kind must be either "entity" or "relationship".',
        code: "BIRDY_GRAPH_KIND_INVALID",
      },
      { status: 400 },
    );
  }

  if (body.kind === "entity") {
    if (
      body.product === undefined ||
      body.entityType === undefined ||
      body.canonicalKey === undefined ||
      body.title === undefined
    ) {
      return NextResponse.json(
        {
          error: "product, entityType, canonicalKey, and title are required",
          code: "BIRDY_GRAPH_ENTITY_REQUIRED_FIELDS_MISSING",
        },
        { status: 400 },
      );
    }

    if (body.sourceType !== undefined && !isGraphSourceType(body.sourceType)) {
      return NextResponse.json(
        {
          error: "Invalid Birdy graph source type.",
          code: "BIRDY_GRAPH_ENTITY_SOURCE_INVALID",
        },
        { status: 400 },
      );
    }

    if (body.metadata !== undefined && !isPlainObject(body.metadata)) {
      return NextResponse.json(
        {
          error: "metadata must be an object.",
          code: "BIRDY_GRAPH_ENTITY_METADATA_INVALID",
        },
        { status: 400 },
      );
    }

    if (
      body.summary !== undefined &&
      body.summary !== null &&
      typeof body.summary !== "string"
    ) {
      return NextResponse.json(
        {
          error: "summary must be text or null.",
          code: "BIRDY_GRAPH_ENTITY_SUMMARY_INVALID",
        },
        { status: 400 },
      );
    }

    const input: BirdyGraphEntityInput = {
      product: body.product as BirdyProduct,
      entityType: body.entityType as BirdyGraphNodeType,
      canonicalKey:
        typeof body.canonicalKey === "string" ? body.canonicalKey : "",
      title: typeof body.title === "string" ? body.title : "",
      summary: typeof body.summary === "string" ? body.summary : null,
      confidence:
        typeof body.confidence === "number"
          ? body.confidence
          : body.confidence === undefined
            ? undefined
            : Number.NaN,
      resourceType:
        typeof body.resourceType === "string" ? body.resourceType : null,
      resourceId: typeof body.resourceId === "string" ? body.resourceId : null,
      sourceType: body.sourceType as GraphSourceType | undefined,
      metadata: isPlainObject(body.metadata) ? body.metadata : {},
    };

    const validationCode = validateBirdyGraphEntityInput(input);

    if (validationCode) {
      return NextResponse.json(
        {
          error: graphValidationMessage(validationCode),
          code: validationCode,
        },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("birdy_graph_entities")
      .upsert(
        {
          owner_id: user.id,
          product: input.product,
          entity_type: input.entityType,
          resource_type: input.resourceType || null,
          resource_id: input.resourceId || null,
          canonical_key: input.canonicalKey.trim(),
          title: input.title.trim(),
          summary: input.summary?.trim() || null,
          confidence: input.confidence ?? 0.5,
          source_type: input.sourceType || "user",
          metadata: input.metadata || {},
          created_by: user.id,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "owner_id,canonical_key",
        },
      )
      .select()
      .single();

    if (error) {
      console.error("Birdy graph entity write failed:", error);

      return NextResponse.json(
        {
          error: "Birdy graph entity could not be saved.",
          code: "BIRDY_GRAPH_ENTITY_WRITE_FAILED",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ entity: data }, { status: 201 });
  }

  if (
    body.sourceEntityId === undefined ||
    body.targetEntityId === undefined ||
    body.relationshipType === undefined
  ) {
    return NextResponse.json(
      {
        error:
          "sourceEntityId, targetEntityId, and relationshipType are required",
        code: "BIRDY_GRAPH_RELATIONSHIP_REQUIRED_FIELDS_MISSING",
      },
      { status: 400 },
    );
  }

  if (body.sourceType !== undefined && !isGraphSourceType(body.sourceType)) {
    return NextResponse.json(
      {
        error: "Invalid Birdy graph source type.",
        code: "BIRDY_GRAPH_RELATIONSHIP_SOURCE_TYPE_INVALID",
      },
      { status: 400 },
    );
  }

  if (body.metadata !== undefined && !isPlainObject(body.metadata)) {
    return NextResponse.json(
      {
        error: "metadata must be an object.",
        code: "BIRDY_GRAPH_RELATIONSHIP_METADATA_INVALID",
      },
      { status: 400 },
    );
  }

  if (
    body.explanation !== undefined &&
    body.explanation !== null &&
    typeof body.explanation !== "string"
  ) {
    return NextResponse.json(
      {
        error: "explanation must be text or null.",
        code: "BIRDY_GRAPH_RELATIONSHIP_EXPLANATION_INVALID",
      },
      { status: 400 },
    );
  }

  const relationshipInput: BirdyGraphRelationshipInput = {
    sourceEntityId:
      typeof body.sourceEntityId === "string" ? body.sourceEntityId : "",
    targetEntityId:
      typeof body.targetEntityId === "string" ? body.targetEntityId : "",
    relationshipType: body.relationshipType as BirdyGraphRelationshipType,
    strength:
      typeof body.strength === "number"
        ? body.strength
        : body.strength === undefined
          ? undefined
          : Number.NaN,
    confidence:
      typeof body.confidence === "number"
        ? body.confidence
        : body.confidence === undefined
          ? undefined
          : Number.NaN,
    explanation: typeof body.explanation === "string" ? body.explanation : null,
    sourceType: body.sourceType as GraphSourceType | undefined,
    metadata: isPlainObject(body.metadata) ? body.metadata : {},
  };

  const validationCode = validateBirdyGraphRelationshipInput(relationshipInput);

  if (validationCode) {
    return NextResponse.json(
      {
        error: graphValidationMessage(validationCode),
        code: validationCode,
      },
      { status: 400 },
    );
  }

  const { data: ownedEntities, error: ownershipError } = await supabase
    .from("birdy_graph_entities")
    .select("id")
    .eq("owner_id", user.id)
    .in("id", [
      relationshipInput.sourceEntityId,
      relationshipInput.targetEntityId,
    ]);

  if (ownershipError) {
    console.error("Birdy graph ownership check failed:", ownershipError);

    return NextResponse.json(
      {
        error: "Birdy graph relationship could not be verified.",
        code: "BIRDY_GRAPH_RELATIONSHIP_OWNERSHIP_CHECK_FAILED",
      },
      { status: 503 },
    );
  }

  if ((ownedEntities || []).length !== 2) {
    return NextResponse.json(
      {
        error: "Both graph entities must belong to the authenticated owner.",
        code: "BIRDY_GRAPH_RELATIONSHIP_ENTITY_NOT_OWNED",
      },
      { status: 403 },
    );
  }

  const { data, error } = await supabase
    .from("birdy_graph_relationships")
    .upsert(
      {
        owner_id: user.id,
        source_entity_id: relationshipInput.sourceEntityId,
        target_entity_id: relationshipInput.targetEntityId,
        relationship_type: relationshipInput.relationshipType,
        strength: relationshipInput.strength ?? 0.5,
        confidence: relationshipInput.confidence ?? 0.5,
        explanation: relationshipInput.explanation?.trim() || null,
        source_type: relationshipInput.sourceType || "user",
        metadata: relationshipInput.metadata || {},
        created_by: user.id,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict:
          "owner_id,source_entity_id,target_entity_id,relationship_type",
      },
    )
    .select()
    .single();

  if (error) {
    console.error("Birdy graph relationship write failed:", error);

    return NextResponse.json(
      {
        error: "Birdy graph relationship could not be saved.",
        code: "BIRDY_GRAPH_RELATIONSHIP_WRITE_FAILED",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ relationship: data }, { status: 201 });
}
