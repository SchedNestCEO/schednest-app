export type PerformanceRun = {
  id: string;
  name: string;
  product: string;
  environment: string;
  test_type: string;
  status: string;
  target_virtual_users: number | null;
  duration_seconds: number | null;
  started_at: string | null;
  completed_at: string | null;
  summary: Record<string, unknown>;
  created_at: string;
};

export type PerformanceMetric = {
  id: string;
  run_id: string | null;
  product: string;
  metric_key: string;
  metric_value: number;
  unit: string;
  source: string;
  status: string;
  captured_at: string;
};

export type PerformanceThreshold = {
  id: string;
  product: string;
  metric_key: string;
  display_name: string;
  unit: string;
  comparison: "lte" | "gte";
  warning_value: number;
  critical_value: number;
  enabled: boolean;
};

export function classifyMetric(
  value: number,
  threshold: PerformanceThreshold | undefined,
) {
  if (!threshold || !threshold.enabled) return "unknown";

  if (threshold.comparison === "lte") {
    if (value >= threshold.critical_value) return "critical";
    if (value >= threshold.warning_value) return "warning";
    return "healthy";
  }

  if (value <= threshold.critical_value) return "critical";
  if (value <= threshold.warning_value) return "warning";
  return "healthy";
}
