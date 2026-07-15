const blocked = ["schednest.com", "www.schednest.com"];
export function requireSafeBaseUrl() {
  if (__ENV.ALLOW_LOAD_TEST !== "true") throw new Error("Set ALLOW_LOAD_TEST=true for an approved environment.");
  const base = (__ENV.BASE_URL || "").replace(/\/$/, "");
  if (!base) throw new Error("BASE_URL is required.");
  const prodAllowed = __ENV.ALLOW_PRODUCTION_LOAD_TEST === "true";
  if (!prodAllowed && blocked.some((x) => base.toLowerCase().includes(x))) {
    throw new Error("Production load testing is blocked by default.");
  }
  return base;
}
export function thresholds() {
  return { http_req_failed: ["rate<0.05"], http_req_duration: ["p(95)<1500", "p(99)<3000"], checks: ["rate>0.95"] };
}
