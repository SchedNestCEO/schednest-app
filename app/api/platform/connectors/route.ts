import { NextRequest, NextResponse } from "next/server";
import { createAuthenticatedRouteClient } from "../../../lib/supabase/admin";

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
    .from("platform_connectors")
    .select("*")
    .eq("owner_id", user.id)
    .order("provider");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ connectors: data || [] });
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
    provider?: string;
    connectorType?: string;
    product?: string;
    displayName?: string;
  };

  if (
    !body.provider ||
    !body.connectorType ||
    !body.product ||
    !body.displayName
  ) {
    return NextResponse.json(
      {
        error:
          "provider, connectorType, product, and displayName are required",
      },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("platform_connectors")
    .upsert(
      {
        owner_id: user.id,
        provider: body.provider,
        connector_type: body.connectorType,
        product: body.product,
        display_name: body.displayName,
        status: "disconnected",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "owner_id,provider,product",
      }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ connector: data }, { status: 201 });
}
