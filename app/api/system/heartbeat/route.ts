import { NextResponse } from "next/server";
import { createAdminClient } from "../../../lib/supabase/admin";

export const dynamic = "force-dynamic";

function requestIsAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!requestIsAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const startedAt = Date.now();
  const supabase = createAdminClient();
  const { error } = await supabase.from("businesses").select("id").limit(1);

  if (error) {
    console.error("SchedNest Supabase heartbeat failed", error);
    return NextResponse.json(
      { ok: false, service: "supabase", error: error.message },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    service: "supabase",
    checkedAt: new Date().toISOString(),
    latencyMs: Date.now() - startedAt,
  });
}
