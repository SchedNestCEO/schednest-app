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


function k6Metric(summary: Record<string, unknown>, key: string, field: string) {
  const metrics = summary.metrics as Record<string, { values?: Record<string, number> }> | undefined;
  return metrics?.[key]?.values?.[field];
}

async function ingestK6Summary(
  auth: Awaited<ReturnType<typeof authorizedClient>> & { ok: true },
  body: Record<string, unknown>,
) {
  const summary = body.summary as Record<string, unknown> | undefined;
  if (!summary) return NextResponse.json({ error: "A k6 summary is required." }, { status: 400 });
  const product = typeof body.product === "string" ? body.product : "platform";
  const environment = typeof body.environment === "string" ? body.environment : "staging";
  const p95 = k6Metric(summary, "http_req_duration", "p(95)");
  const p99 = k6Metric(summary, "http_req_duration", "p(99)");
  const failed = k6Metric(summary, "http_req_failed", "rate");
  const count = k6Metric(summary, "http_reqs", "count");
  const vus = k6Metric(summary, "vus_max", "max");
  const values = [
    ["http_req_duration_p95_ms", p95, "ms"],
    ["http_req_duration_p99_ms", p99, "ms"],
    ["http_error_rate_percent", typeof failed === "number" ? failed * 100 : undefined, "percent"],
    ["http_request_count", count, "requests"],
  ].filter((item) => typeof item[1] === "number") as [string, number, string][];
  const { data: thresholdsData } = await auth.supabase.from("performance_thresholds").select("*").eq("enabled", true);
  const thresholds = (thresholdsData || []) as PerformanceThreshold[];
  const now = new Date().toISOString();
  const { data: run, error: runError } = await auth.supabase.from("performance_test_runs").insert({ created_by: auth.admin.user.id, name: typeof body.name === "string" ? body.name : "k6 load test", product, environment, test_type: "load", status: "running", target_virtual_users: typeof vus === "number" ? Math.round(vus) : null, started_at: now, metadata: { source: "k6" } }).select("*").single();
  if (runError || !run) return NextResponse.json({ error: runError?.message || "Unable to create load-test run." }, { status: 500 });
  const snapshots = values.map(([metric_key, metric_value, unit]) => { const threshold = thresholds.find((t) => t.product === product && t.metric_key === metric_key); return { run_id: run.id, product, metric_key, metric_value, unit, source: "k6", status: classifyMetric(metric_value, threshold), metadata: { imported: true } }; });
  const { error: insertError } = await auth.supabase.from("performance_metric_snapshots").insert(snapshots);
  const critical = snapshots.filter((x) => x.status === "critical").length;
  const warning = snapshots.filter((x) => x.status === "warning").length;
  const status = insertError || critical > 0 ? "failed" : "passed";
  await auth.supabase.from("performance_test_runs").update({ status, completed_at: new Date().toISOString(), summary: { metric_count: snapshots.length, critical_count: critical, warning_count: warning, imported_from: "k6" }, updated_at: new Date().toISOString() }).eq("id", run.id);
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ run: { ...run, status }, metrics: snapshots });
}

export async function POST(request: NextRequest) {
  const auth = await authorizedClient(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));

  if (body.action === "ingest_k6_summary") {
    return ingestK6Summary(auth, body);
  }
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
