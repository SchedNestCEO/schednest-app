import { NextRequest, NextResponse } from "next/server";
import { createAuthenticatedRouteClient } from "../../../lib/supabase/admin";
import { requirePlatformAdmin } from "../../../lib/admin/requireAdmin";

function token(request: NextRequest) {
  const value = request.headers.get("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7) : null;
}

export async function GET(request: NextRequest) {
  const accessToken = token(request);
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAuthenticatedRouteClient(accessToken);
  const admin = await requirePlatformAdmin(supabase);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const services = [
    ["database", "Database", "platform_admins"],
    ["coordination", "Coordination Engine", "coordination_items"],
    ["birdy", "Birdy Decisions", "birdy_action_decisions"],
    ["notifications", "Notifications", "platform_notifications"],
    ["activity", "Activity Feed", "platform_activity"],
    ["files", "Universal Files", "platform_files"],
    ["connectors", "Connectors", "platform_connectors"],
  ] as const;

  const checks = [];
  for (const [serviceKey, serviceName, table] of services) {
    const started = Date.now();
    const result = await supabase.from(table).select("id", { count: "exact", head: true });
    checks.push({
      serviceKey,
      serviceName,
      product: "platform",
      status: result.error ? "degraded" : "healthy",
      latencyMs: Date.now() - started,
      message: result.error ? result.error.message : `${serviceName} is reachable.`,
    });
  }

  await supabase.from("platform_health_snapshots").insert(checks.map((check) => ({
    service_key: check.serviceKey,
    service_name: check.serviceName,
    product: check.product,
    status: check.status,
    latency_ms: check.latencyMs,
    message: check.message,
  })));

  const overall = checks.some((item) => item.status === "degraded") ? "degraded" : "healthy";
  return NextResponse.json({ overall, checks });
}
