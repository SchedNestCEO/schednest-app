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
    .from("platform_consents")
    .select("*")
    .eq("owner_id", user.id)
    .order("consent_key");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ consents: data || [] });
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

  const body = (await request.json()) as {
    consentKey?: string;
    status?: "granted" | "not_granted" | "withdrawn";
  };

  if (!body.consentKey || !body.status) {
    return NextResponse.json(
      { error: "consentKey and status are required" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("platform_consents")
    .upsert(
      {
        owner_id: user.id,
        consent_key: body.consentKey,
        status: body.status,
        version: "1.0",
        source: "settings_privacy",
        granted_at: body.status === "granted" ? now : null,
        withdrawn_at: body.status === "withdrawn" ? now : null,
        updated_at: now,
      },
      { onConflict: "owner_id,consent_key" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ consent: data });
}
