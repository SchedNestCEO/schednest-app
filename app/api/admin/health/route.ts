import { NextRequest, NextResponse } from "next/server";
import { assessHealth } from "../../../lib/admin/health";
import { requirePlatformAdmin } from "../../../lib/admin/requireAdmin";
import { createAuthenticatedRouteClient } from "../../../lib/supabase/admin";

function token(request: NextRequest) {
  const value = request.headers.get("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7) : null;
}

export async function GET(request: NextRequest) {
  const accessToken = token(request);

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAuthenticatedRouteClient(accessToken);
  const admin = await requirePlatformAdmin(supabase);

  if (!admin.ok) {
    return NextResponse.json(
      { error: admin.error },
      { status: admin.status },
    );
  }

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
    const { data: history, error: historyError } = await supabase
      .from("platform_health_snapshots")
      .select("latency_ms")
      .eq("service_key", serviceKey)
      .eq("status", "healthy")
      .not("latency_ms", "is", null)
      .order("checked_at", { ascending: false })
      .limit(20);

    const started = Date.now();
    const result = await supabase
      .from(table)
      .select("id", { count: "exact", head: true });

    const latencyMs = Date.now() - started;
    const historicalLatencies = historyError
      ? []
      : (history || [])
          .map((item) => item.latency_ms)
          .filter((value): value is number => typeof value === "number");

    const assessment = assessHealth({
      latencyMs,
      recentHealthyLatencies: historicalLatencies,
      reachable: !result.error,
    });

    checks.push({
      serviceKey,
      serviceName,
      product: "platform",
      status: assessment.status,
      latencyMs,
      targetLatencyMs: assessment.targetLatencyMs,
      latencyChangePercent: assessment.latencyChangePercent,
      sampleCount: assessment.sampleCount,
      message: result.error
        ? result.error.message
        : assessment.reason,
      metadata: {
        table,
        target_latency_ms: assessment.targetLatencyMs,
        latency_change_percent: assessment.latencyChangePercent,
        baseline_sample_count: assessment.sampleCount,
        history_query_error: historyError?.message || null,
      },
    });
  }

  const { error: snapshotError } = await supabase
    .from("platform_health_snapshots")
    .insert(
      checks.map((check) => ({
        service_key: check.serviceKey,
        service_name: check.serviceName,
        product: check.product,
        status: check.status,
        latency_ms: check.latencyMs,
        message: check.message,
        metadata: check.metadata,
      })),
    );

  if (snapshotError) {
    return NextResponse.json(
      { error: snapshotError.message },
      { status: 500 },
    );
  }

  const overall = checks.some((item) => item.status === "down")
    ? "down"
    : checks.some((item) => item.status === "degraded")
      ? "degraded"
      : "healthy";

  return NextResponse.json({
    overall,
    checks,
    checkedAt: new Date().toISOString(),
  });
}
