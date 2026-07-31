import { NextRequest, NextResponse } from "next/server";
import { createAuthenticatedRouteClient } from "../../../../lib/supabase/admin";

function getAccessToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
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

  const { data: existingRequest, error: existingError } = await supabase
    .from("platform_data_requests")
    .select("*")
    .eq("owner_id", user.id)
    .eq("request_type", "export")
    .in("status", ["pending", "processing"])
    .is("product", null)
    .order("requested_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("privacy_export_lookup_failed", {
      ownerId: user.id,
      error: existingError.message,
    });

    return NextResponse.json(
      {
        error: "Could not check existing export requests.",
        code: "PRIVACY_EXPORT_LOOKUP_FAILED",
      },
      { status: 500 },
    );
  }

  if (existingRequest) {
    return NextResponse.json({
      request: existingRequest,
      idempotentReplay: true,
    });
  }

  const { data, error } = await supabase
    .from("platform_data_requests")
    .insert({
      owner_id: user.id,
      request_type: "export",
      status: "pending",
    })
    .select()
    .single();

  if (error?.code === "23505") {
    const { data: concurrentRequest } = await supabase
      .from("platform_data_requests")
      .select("*")
      .eq("owner_id", user.id)
      .eq("request_type", "export")
      .in("status", ["pending", "processing"])
      .is("product", null)
      .order("requested_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (concurrentRequest) {
      return NextResponse.json({
        request: concurrentRequest,
        idempotentReplay: true,
      });
    }
  }

  if (error) {
    console.error("privacy_export_creation_failed", {
      ownerId: user.id,
      error: error.message,
      code: error.code,
    });

    return NextResponse.json(
      {
        error: "Could not create export request.",
        code: "PRIVACY_EXPORT_CREATION_FAILED",
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      request: data,
      idempotentReplay: false,
    },
    { status: 201 },
  );
}
