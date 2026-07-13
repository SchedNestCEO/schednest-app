import { NextRequest, NextResponse } from "next/server";
import { createAuthenticatedRouteClient } from "../../../lib/supabase/admin";
import {
  buildPlatformNotification,
  type CreatePlatformNotificationInput,
} from "../../../lib/platform/notifications";

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

  const { data, error } = await supabase
    .from("platform_notifications")
    .select(
      "id, product, notification_type, severity, title, body, action_url, status, scheduled_for, sent_at, read_at, acknowledged_at, metadata, created_at"
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ notifications: data || [] });
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

  let body: Partial<CreatePlatformNotificationInput>;

  try {
    body = (await request.json()) as Partial<CreatePlatformNotificationInput>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.product || !body.notificationType || !body.title) {
    return NextResponse.json(
      {
        error:
          "product, notificationType, and title are required",
      },
      { status: 400 }
    );
  }

  const payload = buildPlatformNotification({
    ownerId: user.id,
    product: body.product,
    notificationType: body.notificationType,
    title: body.title.trim(),
    body: body.body?.trim(),
    actionUrl: body.actionUrl?.trim(),
    severity: body.severity,
    scheduledFor: body.scheduledFor,
    dedupeKey: body.dedupeKey,
    metadata: body.metadata,
  });

  const { data, error } = await supabase
    .from("platform_notifications")
    .insert({
      ...payload,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 400;

    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ notification: data }, { status: 201 });
}
