import { describe, expect, it } from "vitest";
import { assessHealth } from "./health";

describe("assessHealth", () => {
  it("marks an unreachable service as down", () => {
    const result = assessHealth({
      latencyMs: 25,
      recentHealthyLatencies: [20, 21, 22, 23, 24],
      reachable: false,
    });

    expect(result.status).toBe("down");
  });

  it("forms a target from the faster end of recent healthy history", () => {
    const result = assessHealth({
      latencyMs: 110,
      recentHealthyLatencies: [100, 105, 110, 115, 120],
      reachable: true,
    });

    expect(result.targetLatencyMs).toBe(105);
    expect(result.status).toBe("healthy");
  });

  it("detects an early slowdown against the adaptive target", () => {
    const result = assessHealth({
      latencyMs: 190,
      recentHealthyLatencies: [100, 105, 110, 115, 120],
      reachable: true,
    });

    expect(result.status).toBe("degraded");
    expect(result.reason).toContain("Early slowdown");
  });

  it("detects a severe slowdown against the adaptive target", () => {
    const result = assessHealth({
      latencyMs: 400,
      recentHealthyLatencies: [100, 105, 110, 115, 120],
      reachable: true,
    });

    expect(result.status).toBe("degraded");
    expect(result.reason).toContain("Severe slowdown");
  });

  it("uses startup limits before enough healthy history exists", () => {
    const result = assessHealth({
      latencyMs: 600,
      recentHealthyLatencies: [100, 110],
      reachable: true,
    });

    expect(result.targetLatencyMs).toBeNull();
    expect(result.status).toBe("degraded");
  });

  it("does not let invalid history form the target", () => {
    const result = assessHealth({
      latencyMs: 100,
      recentHealthyLatencies: [100, Number.NaN, -1],
      reachable: true,
    });

    expect(result.targetLatencyMs).toBeNull();
    expect(result.status).toBe("healthy");
  });
});
