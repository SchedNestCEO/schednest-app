import { NextRequest, NextResponse } from "next/server";
import { createAuthenticatedRouteClient } from "../../../../lib/supabase/admin";

function getAccessToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  return authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;
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
    typeof product !== "string" ||
    typeof actionKey !== "string" ||
    typeof permissionLevel !== "string" ||
    typeof riskLevel !== "string"
  ) {
    return NextResponse.json(
      {
        error:
          "product, actionKey, permissionLevel, and riskLevel are required",
      },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("birdy_action_permissions")
    .upsert(
      {
        owner_id: user.id,
        product,
        action_key: actionKey,
        permission_level: permissionLevel,
        risk_level: riskLevel,
        requires_confirmation: body.requiresConfirmation !== false,
        conditions: body.conditions || {},
        notes: typeof body.notes === "string" ? body.notes : null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "owner_id,product,action_key",
      }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ permission: data }, { status: 201 });
}
