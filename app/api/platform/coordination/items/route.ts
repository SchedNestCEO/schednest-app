import { NextRequest, NextResponse } from "next/server";
import { createAuthenticatedRouteClient } from "../../../../lib/supabase/admin";
import {
  buildCoordinationItem,
  type CreateCoordinationItemInput,
} from "../../../../lib/platform/coordination";

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

  const product = request.nextUrl.searchParams.get("product");

  let query = supabase
    .from("coordination_items")
    .select("*")
    .eq("owner_id", user.id)
    .neq("status", "archived")
    .order("starts_at", { ascending: true, nullsFirst: false })
    .order("due_at", { ascending: true, nullsFirst: false });

  if (product && product !== "all") {
    query = query.eq("product", product);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ items: data || [] });
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

  let body: Partial<CreateCoordinationItemInput>;

  try {
    body = (await request.json()) as Partial<CreateCoordinationItemInput>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.product || !body.itemType || !body.title) {
    return NextResponse.json(
      { error: "product, itemType, and title are required" },
      { status: 400 }
    );
  }

  const payload = buildCoordinationItem({
    ownerId: user.id,
    product: body.product,
    itemType: body.itemType,
    title: body.title.trim(),
    description: body.description?.trim(),
    startsAt: body.startsAt,
    endsAt: body.endsAt,
    dueAt: body.dueAt,
    timezone: body.timezone,
    priority: body.priority,
    flexibility: body.flexibility,
    expectedDurationMinutes: body.expectedDurationMinutes,
    minimumDurationMinutes: body.minimumDurationMinutes,
    maximumDurationMinutes: body.maximumDurationMinutes,
    earliestStart: body.earliestStart,
    latestEnd: body.latestEnd,
    location: body.location?.trim(),
    participants: body.participants,
    dependencies: body.dependencies,
    sourceTable: body.sourceTable,
    sourceId: body.sourceId,
    aiGenerated: body.aiGenerated,
    userLocked: body.userLocked,
    confidence: body.confidence,
    metadata: body.metadata,
  });

  const { data, error } = await supabase
    .from("coordination_items")
    .insert({
      ...payload,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ item: data }, { status: 201 });
}
