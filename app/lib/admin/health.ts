export type HealthStatus = "healthy" | "degraded" | "down" | "unknown";

export type HealthAssessment = {
  status: HealthStatus;
  targetLatencyMs: number | null;
  latencyChangePercent: number | null;
  sampleCount: number;
  reason: string;
};

const MINIMUM_TARGET_SAMPLES = 5;
const MAXIMUM_TARGET_SAMPLES = 20;

const STARTUP_WARNING_MS = 500;
const STARTUP_CRITICAL_MS = 1500;

const RELATIVE_WARNING_MULTIPLIER = 1.75;
const RELATIVE_CRITICAL_MULTIPLIER = 3;

const MINIMUM_WARNING_GAP_MS = 75;
const MINIMUM_CRITICAL_GAP_MS = 250;

function percentile(values: number[], percentileValue: number) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.floor((sorted.length - 1) * percentileValue);

  return sorted[index];
}

export function assessHealth({
  latencyMs,
  recentHealthyLatencies,
  reachable,
}: {
  latencyMs: number;
  recentHealthyLatencies: number[];
  reachable: boolean;
}): HealthAssessment {
  const validHistory = recentHealthyLatencies
    .filter((value) => Number.isFinite(value) && value >= 0)
    .slice(0, MAXIMUM_TARGET_SAMPLES);

  const targetLatencyMs =
    validHistory.length >= MINIMUM_TARGET_SAMPLES
      ? percentile(validHistory, 0.25)
      : null;

  const latencyChangePercent =
    targetLatencyMs !== null && targetLatencyMs > 0
      ? Math.round(((latencyMs - targetLatencyMs) / targetLatencyMs) * 100)
      : null;

  if (!reachable) {
    return {
      status: "down",
      targetLatencyMs,
      latencyChangePercent,
      sampleCount: validHistory.length,
      reason: "Service could not be reached.",
    };
  }

  if (targetLatencyMs === null) {
    if (latencyMs >= STARTUP_CRITICAL_MS) {
      return {
        status: "degraded",
        targetLatencyMs,
        latencyChangePercent,
        sampleCount: validHistory.length,
        reason: `Latency exceeded the ${STARTUP_CRITICAL_MS} ms startup critical limit.`,
      };
    }

    if (latencyMs >= STARTUP_WARNING_MS) {
      return {
        status: "degraded",
        targetLatencyMs,
        latencyChangePercent,
        sampleCount: validHistory.length,
        reason: `Latency exceeded the ${STARTUP_WARNING_MS} ms startup warning limit.`,
      };
    }

    return {
      status: "healthy",
      targetLatencyMs,
      latencyChangePercent,
      sampleCount: validHistory.length,
      reason: "Service is reachable; adaptive performance target is still forming.",
    };
  }

  const warningLatencyMs = Math.max(
    targetLatencyMs * RELATIVE_WARNING_MULTIPLIER,
    targetLatencyMs + MINIMUM_WARNING_GAP_MS,
  );

  const criticalLatencyMs = Math.max(
    targetLatencyMs * RELATIVE_CRITICAL_MULTIPLIER,
    targetLatencyMs + MINIMUM_CRITICAL_GAP_MS,
  );

  if (latencyMs >= criticalLatencyMs) {
    return {
      status: "degraded",
      targetLatencyMs,
      latencyChangePercent,
      sampleCount: validHistory.length,
      reason: "Severe slowdown detected against the adaptive performance target.",
    };
  }

  if (latencyMs >= warningLatencyMs) {
    return {
      status: "degraded",
      targetLatencyMs,
      latencyChangePercent,
      sampleCount: validHistory.length,
      reason: "Early slowdown detected against the adaptive performance target.",
    };
  }

  return {
    status: "healthy",
    targetLatencyMs,
    latencyChangePercent,
    sampleCount: validHistory.length,
    reason: "Service is performing near its adaptive performance target.",
  };
}
