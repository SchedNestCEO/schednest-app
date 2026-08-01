import { NextRequest, NextResponse } from "next/server";
import { createAuthenticatedRouteClient } from "../../../../lib/supabase/admin";
import {
  isBirdyPermissionLevel,
  isBirdyRiskLevel,
} from "../../../../lib/platform/birdyContracts";
import { resolveBirdyPolicy } from "../../../../lib/platform/birdyPolicy";

const OPTIMIZER_PRODUCT = "platform";
const OPTIMIZER_ACTION_KEY = "generate_schedule_recommendations";

function getAccessToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
}

export async function POST(request: NextRequest) {
  const accessToken = getAccessToken(request);

  if (!accessToken) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        code: "BIRDY_OPTIMIZER_UNAUTHORIZED",
      },
      { status: 401 },
    );
  }

  const supabase = createAuthenticatedRouteClient(accessToken);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        code: "BIRDY_OPTIMIZER_UNAUTHORIZED",
      },
      { status: 401 },
    );
  }

  const [privacyResult, permissionResult] = await Promise.all([
    supabase
      .from("platform_privacy_settings")
      .select("allow_birdy_learning")
      .eq("owner_id", user.id)
      .maybeSingle(),
    supabase
      .from("birdy_action_permissions")
      .select("permission_level, risk_level, requires_confirmation")
      .eq("owner_id", user.id)
      .eq("product", OPTIMIZER_PRODUCT)
      .eq("action_key", OPTIMIZER_ACTION_KEY)
      .maybeSingle(),
  ]);

  if (privacyResult.error) {
    console.error("birdy_optimizer_privacy_lookup_failed", {
      ownerId: user.id,
      error: privacyResult.error,
    });

    return NextResponse.json(
      {
        error: "Birdy settings could not be verified.",
        code: "BIRDY_OPTIMIZER_SETTINGS_UNAVAILABLE",
      },
      { status: 503 },
    );
  }

  if (permissionResult.error) {
    console.error("birdy_optimizer_permission_lookup_failed", {
      ownerId: user.id,
      error: permissionResult.error,
    });

    return NextResponse.json(
      {
        error: "Birdy permissions could not be verified.",
        code: "BIRDY_OPTIMIZER_PERMISSION_UNAVAILABLE",
      },
      { status: 503 },
    );
  }

  const permission = permissionResult.data;

  const permissionLevel =
    permission && isBirdyPermissionLevel(permission.permission_level)
      ? permission.permission_level
      : null;

  const riskLevel =
    permission && isBirdyRiskLevel(permission.risk_level)
      ? permission.risk_level
      : null;

  const policy = resolveBirdyPolicy({
    product: OPTIMIZER_PRODUCT,
    actionKey: OPTIMIZER_ACTION_KEY,
    learningAllowed: privacyResult.data?.allow_birdy_learning ?? true,
    permissionLevel,
    riskLevel,
    requiresConfirmation: permission?.requires_confirmation ?? null,
  });

  if (!policy.allowed) {
    return NextResponse.json(
      {
        error: "Birdy is not allowed to generate schedule recommendations.",
        code: policy.reasonCode,
        policy: {
          permissionLevel: policy.permissionLevel,
          riskLevel: policy.riskLevel,
          requiresConfirmation: policy.requiresConfirmation,
        },
      },
      { status: 403 },
    );
  }

  const { data, error } = await supabase.rpc(
    "generate_birdy_schedule_recommendations",
    {
      target_owner_id: user.id,
    },
  );

  if (error) {
    console.error("birdy_optimizer_generation_failed", {
      ownerId: user.id,
      error,
    });

    return NextResponse.json(
      {
        error: "Birdy could not generate recommendations.",
        code: "BIRDY_OPTIMIZER_GENERATION_FAILED",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    generated: data || 0,
    mode: "recommendations_only",
    policy: {
      permissionLevel: policy.permissionLevel,
      riskLevel: policy.riskLevel,
      requiresConfirmation: policy.requiresConfirmation,
    },
  });
}

export async function GET(request: NextRequest) {
  const accessToken = getAccessToken(request);

  if (!accessToken) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        code: "BIRDY_OPTIMIZER_UNAUTHORIZED",
      },
      { status: 401 },
    );
  }

  const supabase = createAuthenticatedRouteClient(accessToken);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        code: "BIRDY_OPTIMIZER_UNAUTHORIZED",
      },
      { status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("birdy_action_decisions")
    .select(
      "id, product, action_key, recommendation, explanation, confidence, alternatives, constraints, status, created_at",
    )
    .eq("owner_id", user.id)
    .in("action_key", [
      "resolve_schedule_conflict",
      "schedule_unscheduled_item",
    ])
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error("birdy_optimizer_recommendations_lookup_failed", {
      ownerId: user.id,
      error,
    });

    return NextResponse.json(
      {
        error: "Birdy recommendations could not be loaded.",
        code: "BIRDY_OPTIMIZER_RECOMMENDATIONS_UNAVAILABLE",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    recommendations: data || [],
  });
}
