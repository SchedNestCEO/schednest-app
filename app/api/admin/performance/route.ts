import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "../../../lib/admin/requireAdmin";
import { classifyMetric, type PerformanceThreshold } from "../../../lib/admin/performance";
import { createAuthenticatedRouteClient } from "../../../lib/supabase/admin";

function bearerToken(request: NextRequest) {
  const value = request.headers.get("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7) : null;
}

async function authorizedClient(request: NextRequest) {
  const accessToken = bearerToken(request);
  if (!accessToken) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const supabase = createAuthenticatedRouteClient(accessToken);
  const admin = await requirePlatformAdmin(supabase);

  if (!admin.ok) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: admin.error }, { status: admin.status }),
    };
  }

  return { ok: true as const, supabase, admin };
}

export async function GET(request: NextRequest) {
  const auth = await authorizedClient(request);
  if (!auth.ok) return auth.response;

  const [runsResult, metricsResult, thresholdsResult] = await Promise.all([
    auth.supabase
      .from("performance_test_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(25),
    auth.supabase
      .from("performance_metric_snapshots")
      .select("*")
      .order("captured_at", { ascending: false })
      .limit(50),
    auth.supabase
      .from("performance_thresholds")
      .select("*")
      .eq("enabled", true)
      .order("product")
      .order("metric_key"),
  ]);

  const firstError =
    runsResult.error || metricsResult.error || thresholdsResult.error;

  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  return NextResponse.json({
    runs: runsResult.data || [],
    metrics: metricsResult.data || [],
    thresholds: thresholdsResult.data || [],
  });
}

export async function POST(request: NextRequest) {
  const auth = await authorizedClient(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  if (body.action !== "capture_snapshot") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const environment =
    typeof body.environment === "string" ? body.environment : "development";

  const { data: run, error: runError } = await auth.supabase
    .from("performance_test_runs")
    .insert({
      created_by: auth.admin.user.id,
      name: "Manual platform snapshot",
      product: "platform",
      environment,
      test_type: "snapshot",
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (runError || !run) {
    return NextResponse.json(
      { error: runError?.message || "Unable to create snapshot run" },
      { status: 500 },
    );
  }

  const { data: thresholdsData, error: thresholdsError } = await auth.supabase
    .from("performance_thresholds")
    .select("*")
    .eq("enabled", true);

  if (thresholdsError) {
    return NextResponse.json({ error: thresholdsError.message }, { status: 500 });
  }

  const thresholds = (thresholdsData || []) as PerformanceThreshold[];

  const checks = [
    ["database_latency_ms", "platform_admins"],
    ["health_check_latency_ms", "platform_health_snapshots"],
  ] as const;

  const snapshots = [];

  for (const [metricKey, table] of checks) {
    const started = Date.now();
    const result = await auth.supabase
      .from(table)
      .select("id", { count: "exact", head: true });

    const value = Date.now() - started;
    const threshold = thresholds.find(
      (item) => item.product === "platform" && item.metric_key === metricKey,
    );

    snapshots.push({
      run_id: run.id,
      product: "platform",
      metric_key: metricKey,
      metric_value: value,
      unit: "ms",
      source: "manual_snapshot",
      status: result.error ? "critical" : classifyMetric(value, threshold),
      metadata: result.error
        ? { table, error: result.error.message }
        : { table, reachable: true },
    });
  }

  const { error: metricsError } = await auth.supabase
    .from("performance_metric_snapshots")
    .insert(snapshots);

  const finalStatus = metricsError ? "failed" : "passed";
  const completedAt = new Date().toISOString();

  await auth.supabase
    .from("performance_test_runs")
    .update({
      status: finalStatus,
      completed_at: completedAt,
      summary: {
        metric_count: snapshots.length,
        critical_count: snapshots.filter((item) => item.status === "critical").length,
        warning_count: snapshots.filter((item) => item.status === "warning").length,
      },
      updated_at: completedAt,
    })
    .eq("id", run.id);

  if (metricsError) {
    return NextResponse.json({ error: metricsError.message }, { status: 500 });
  }

  return NextResponse.json({ run: { ...run, status: finalStatus }, metrics: snapshots });
}
