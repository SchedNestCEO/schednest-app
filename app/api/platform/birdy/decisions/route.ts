import { NextRequest, NextResponse } from "next/server";
import { createAuthenticatedRouteClient } from "../../../../lib/supabase/admin";
import { isBirdyDecisionStatus } from "../../../../lib/platform/birdyContracts";

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

  const status = request.nextUrl.searchParams.get("status");

  let query = supabase
    .from("birdy_action_decisions")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ decisions: data || [] });
}

export async function PATCH(request: NextRequest) {
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
    return NextResponse.json(
      {
        error: "Invalid JSON body.",
        code: "BIRDY_DECISION_JSON_INVALID",
      },
      { status: 400 },
    );
  }

  const decisionId = body.decisionId;
  const status = body.status;

  if (decisionId === undefined || status === undefined) {
    return NextResponse.json(
      {
        error: "decisionId and status are required",
        code: "BIRDY_DECISION_REQUIRED_FIELDS_MISSING",
      },
      { status: 400 },
    );
  }

  if (typeof decisionId !== "string" || !decisionId.trim()) {
    return NextResponse.json(
      {
        error: "decisionId must contain text.",
        code: "BIRDY_DECISION_ID_INVALID",
      },
      { status: 400 },
    );
  }

  if (!isBirdyDecisionStatus(status)) {
    return NextResponse.json(
      {
        error: "Invalid Birdy decision status.",
        code: "BIRDY_DECISION_STATUS_INVALID",
      },
      { status: 400 },
    );
  }

  if (
    status !== "approved" &&
    status !== "rejected" &&
    status !== "cancelled"
  ) {
    return NextResponse.json(
      {
        error: "Only approved, rejected, or cancelled transitions are allowed.",
        code: "BIRDY_DECISION_TRANSITION_UNSUPPORTED",
      },
      { status: 400 },
    );
  }

  const { error } = await supabase.rpc("decide_birdy_action", {
    target_decision_id: decisionId.trim(),
    decision_status: status,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
