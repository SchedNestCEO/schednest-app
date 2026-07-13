import { NextRequest, NextResponse } from "next/server";
import { createAuthenticatedRouteClient } from "../../../lib/supabase/admin";
import {
  buildActivityEvent,
  type CreateActivityInput,
} from "../../../lib/platform/activity";

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

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

  const product = request.nextUrl.searchParams.get("product");

  let query = supabase
    .from("platform_activity_events")
    .select(
      "id, actor_user_id, owner_id, product, event_type, action, resource_type, resource_id, title, description, severity, source, metadata, occurred_at"
    )
    .eq("owner_id", user.id)
    .order("occurred_at", { ascending: false })
    .limit(200);

  if (product && product !== "all") {
    query = query.eq("product", product);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ events: data || [] });
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

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

  let body: Partial<CreateActivityInput>;

  try {
    body = (await request.json()) as Partial<CreateActivityInput>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.product || !body.eventType || !body.action || !body.title) {
    return NextResponse.json(
      {
        error:
          "product, eventType, action, and title are required",
      },
      { status: 400 }
    );
  }

  const payload = buildActivityEvent({
    ownerId: user.id,
    product: body.product,
    eventType: body.eventType,
    action: body.action,
    title: body.title.trim(),
    description: body.description?.trim(),
    resourceType: body.resourceType?.trim(),
    resourceId: body.resourceId,
    severity: body.severity,
    source: body.source,
    metadata: body.metadata,
  });

  const { data, error } = await supabase
    .from("platform_activity_events")
    .insert({
      ...payload,
      actor_user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ event: data }, { status: 201 });
}
