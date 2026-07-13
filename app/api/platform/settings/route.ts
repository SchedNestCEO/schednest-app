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

  const [profile, privacy, accessibility, products] = await Promise.all([
    supabase
      .from("platform_profiles")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle(),
    supabase
      .from("platform_privacy_settings")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle(),
    supabase
      .from("platform_accessibility_settings")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle(),
    supabase
      .from("platform_product_settings")
      .select("*")
      .eq("owner_id", user.id)
      .order("product"),
  ]);

  const firstError =
    profile.error ||
    privacy.error ||
    accessibility.error ||
    products.error;

  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 400 });
  }

  return NextResponse.json({
    profile: profile.data,
    privacy: privacy.data,
    accessibility: accessibility.data,
    products: products.data || [],
  });
}
