import { NextRequest, NextResponse } from "next/server";
import { createAuthenticatedRouteClient } from "../../../../lib/supabase/admin";
import {
  isBirdyPermissionLevel,
  isBirdyProduct,
  isBirdyRiskLevel,
} from "../../../../lib/platform/birdyContracts";

function getAccessToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
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

  const { data, error } = await supabase
    .from("birdy_action_permissions")
    .select("*")
    .eq("owner_id", user.id)
    .order("product")
    .order("action_key");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ permissions: data || [] });
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

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const product = body.product;
  const actionKey = body.actionKey;
  const permissionLevel = body.permissionLevel;
  const riskLevel = body.riskLevel;

  if (
    product === undefined ||
    actionKey === undefined ||
    permissionLevel === undefined ||
    riskLevel === undefined
  ) {
    return NextResponse.json(
      {
        error:
          "product, actionKey, permissionLevel, and riskLevel are required",
        code: "BIRDY_PERMISSION_REQUIRED_FIELDS_MISSING",
      },
      { status: 400 },
    );
  }

  if (!isBirdyProduct(product)) {
    return NextResponse.json(
      {
        error: "Invalid Birdy product.",
        code: "BIRDY_PERMISSION_PRODUCT_INVALID",
      },
      { status: 400 },
    );
  }

  if (typeof actionKey !== "string" || !actionKey.trim()) {
    return NextResponse.json(
      {
        error: "actionKey must contain text.",
        code: "BIRDY_PERMISSION_ACTION_KEY_INVALID",
      },
      { status: 400 },
    );
  }

  if (!isBirdyPermissionLevel(permissionLevel)) {
    return NextResponse.json(
      {
        error: "Invalid Birdy permission level.",
        code: "BIRDY_PERMISSION_LEVEL_INVALID",
      },
      { status: 400 },
    );
  }

  if (!isBirdyRiskLevel(riskLevel)) {
    return NextResponse.json(
      {
        error: "Invalid Birdy risk level.",
        code: "BIRDY_PERMISSION_RISK_INVALID",
      },
      { status: 400 },
    );
  }

  if (
    body.requiresConfirmation !== undefined &&
    typeof body.requiresConfirmation !== "boolean"
  ) {
    return NextResponse.json(
      {
        error: "requiresConfirmation must be a boolean.",
        code: "BIRDY_PERMISSION_CONFIRMATION_INVALID",
      },
      { status: 400 },
    );
  }

  if (
    body.conditions !== undefined &&
    (typeof body.conditions !== "object" ||
      body.conditions === null ||
      Array.isArray(body.conditions))
  ) {
    return NextResponse.json(
      {
        error: "conditions must be an object.",
        code: "BIRDY_PERMISSION_CONDITIONS_INVALID",
      },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("birdy_action_permissions")
    .upsert(
      {
        owner_id: user.id,
        product,
        action_key: actionKey.trim(),
        permission_level: permissionLevel,
        risk_level: riskLevel,
        requires_confirmation: body.requiresConfirmation !== false,
        conditions: body.conditions || {},
        notes: typeof body.notes === "string" ? body.notes : null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "owner_id,product,action_key",
      },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ permission: data }, { status: 201 });
}
