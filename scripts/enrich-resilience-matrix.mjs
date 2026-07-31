import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const root = process.cwd();
const matrixPath = join(root, ".engineering", "resilience-matrix.json");

if (!existsSync(matrixPath)) {
  console.error("Missing resilience matrix. Run npm run resilience:map first.");
  process.exit(1);
}

const matrix = JSON.parse(readFileSync(matrixPath, "utf8"));

const evidence = {
  auth: "tests/e2e/auth-behavior.spec.ts",
  adminAccess: "tests/e2e-synthetic/admin-access.synthetic.spec.ts",
  adminApi: "tests/e2e-synthetic/admin-api-security.synthetic.spec.ts",
  criticalApi: "tests/e2e-synthetic/critical-api-security.synthetic.spec.ts",
  publicBooking: "tests/e2e-synthetic/public-booking.synthetic.spec.ts",
  fullSystem: "tests/integration/synthetic/full-system.synthetic.test.ts",
  bookingConcurrency: "tests/load/business-booking-concurrency.js",
  sprint5: "scripts/verify-sprint5.mjs",
  sharedPlatform: "tests/e2e-synthetic/shared-platform.synthetic.spec.ts",
  platformPrivacy:
    "tests/e2e-synthetic/platform-settings-privacy.synthetic.spec.ts",
  birdy: "tests/e2e-synthetic/birdy.synthetic.spec.ts",
  birdyPlatform: "tests/e2e-synthetic/birdy-platform.synthetic.spec.ts",
  founder: "tests/e2e-synthetic/founder-operations.synthetic.spec.ts",
  student: "tests/e2e-synthetic/student.synthetic.spec.ts",
  teams: "tests/e2e-synthetic/teams.synthetic.spec.ts",
  medBrowser: "tests/e2e-synthetic/med.synthetic.spec.ts",
  medIntegration: "tests/integration/synthetic/med.synthetic.test.ts",
};

function unique(values) {
  return [...new Set(values)].sort();
}

function findDimension(capability, id) {
  return capability.dimensions.find((dimension) => dimension.id === id);
}

function classify(capability, id, status, options = {}) {
  const dimension = findDimension(capability, id);

  if (!dimension) {
    throw new Error(`${capability.capabilityId} is missing ${id}`);
  }

  const rank = {
    unassessed: 0,
    planned: 1,
    partial: 2,
    covered: 3,
    "not-applicable": 4,
  };

  if (
    rank[status] < rank[dimension.status] &&
    dimension.status !== "not-applicable"
  ) {
    return;
  }

  dimension.status = status;
  dimension.evidence = unique([
    ...(dimension.evidence || []),
    ...(options.evidence || []),
  ]);
  dimension.notes = unique([
    ...(dimension.notes || []),
    ...(options.notes || []),
  ]);

  if (options.containmentBoundary) {
    dimension.containmentBoundary = options.containmentBoundary;
  }

  if (options.recoveryBehavior) {
    dimension.recoveryBehavior = options.recoveryBehavior;
  }

  if (options.observabilitySignal) {
    dimension.observabilitySignal = options.observabilitySignal;
  }
}

function isBirdyCapability(capability) {
  return (
    capability.route === "/dashboard/birdy" ||
    capability.route.startsWith("/birdy") ||
    capability.route.startsWith("/api/platform/birdy")
  );
}

function isPublicCapability(capability) {
  return capability.permissions?.roles?.includes("visitor");
}

function performsMutation(capability) {
  const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

  if (capability.type === "api") {
    return (capability.httpMethods || []).some((method) =>
      mutationMethods.has(method),
    );
  }

  if (capability.type === "layout") {
    return false;
  }

  const sourcePath = join(root, capability.source);

  if (!existsSync(sourcePath)) {
    return false;
  }

  const source = readFileSync(sourcePath, "utf8");

  return [
    /\.insert\s*\(/,
    /\.update\s*\(/,
    /\.upsert\s*\(/,
    /\.delete\s*\(/,
    /storage[\s\S]*?\.upload\s*\(/,
    /storage[\s\S]*?\.remove\s*\(/,
    /fetch\s*\([^)]*,\s*\{[\s\S]*?method\s*:\s*["'](?:POST|PUT|PATCH|DELETE)["']/,
    /router\.refresh\s*\(/,
  ].some((pattern) => pattern.test(source));
}

function markReadOnlyNotApplicable(capability) {
  if (performsMutation(capability)) {
    return;
  }

  for (const dimension of [
    "retry-safety",
    "idempotency",
    "duplicate-delivery",
    "partial-write",
    "rollback-compensation",
    "concurrent-mutation",
    "orphaned-relationships",
    "invalid-state-transition",
  ]) {
    classify(capability, dimension, "not-applicable", {
      notes: [
        "Capability does not independently perform a persistent mutation.",
      ],
    });
  }
}

function markPublicNotApplicable(capability) {
  if (!isPublicCapability(capability)) {
    return;
  }

  for (const dimension of ["stale-session-permissions", "revocation"]) {
    classify(capability, dimension, "not-applicable", {
      notes: [
        "Public visitor capability does not depend on a persistent authenticated permission grant.",
      ],
    });
  }
}

for (const capability of matrix.capabilities) {
  const tests = new Set(capability.assignedTests || []);

  if (!isBirdyCapability(capability)) {
    classify(capability, "birdy-data-safety", "not-applicable", {
      notes: [
        "Capability does not independently produce or authorize Birdy recommendations.",
      ],
    });
  }

  markPublicNotApplicable(capability);
  markReadOnlyNotApplicable(capability);

  if (capability.type === "layout") {
    for (const id of [
      "idempotency",
      "duplicate-delivery",
      "partial-write",
      "rollback-compensation",
      "concurrent-mutation",
      "orphaned-relationships",
      "invalid-state-transition",
    ]) {
      classify(capability, id, "not-applicable", {
        notes: [
          "Structural layout does not independently perform this mutation workflow.",
        ],
      });
    }
  }

  if (tests.has(evidence.auth)) {
    classify(capability, "authorization-denial", "partial", {
      evidence: [evidence.auth],
    });

    classify(capability, "stale-session-permissions", "partial", {
      evidence: [evidence.auth],
    });
  }

  if (
    tests.has(evidence.adminAccess) ||
    tests.has(evidence.adminApi) ||
    tests.has(evidence.criticalApi) ||
    tests.has(evidence.founder)
  ) {
    classify(capability, "authorization-denial", "covered", {
      evidence: [...tests].filter((test) =>
        [
          evidence.adminAccess,
          evidence.adminApi,
          evidence.criticalApi,
          evidence.founder,
        ].includes(test),
      ),
    });
  }

  if (tests.has(evidence.platformPrivacy)) {
    classify(capability, "authorization-denial", "covered", {
      evidence: [evidence.platformPrivacy],
    });

    classify(capability, "tenant-isolation", "covered", {
      evidence: [evidence.platformPrivacy],
    });
  }

  if (tests.has(evidence.sharedPlatform)) {
    classify(capability, "tenant-isolation", "covered", {
      evidence: [evidence.sharedPlatform],
    });
  }

  if (tests.has(evidence.student)) {
    classify(capability, "tenant-isolation", "covered", {
      evidence: [evidence.student],
    });

    classify(capability, "authorization-denial", "partial", {
      evidence: [evidence.student],
    });
  }

  if (tests.has(evidence.teams)) {
    classify(capability, "tenant-isolation", "covered", {
      evidence: [evidence.teams],
    });

    classify(capability, "authorization-denial", "partial", {
      evidence: [evidence.teams],
    });
  }

  if (tests.has(evidence.medBrowser) || tests.has(evidence.medIntegration)) {
    classify(capability, "tenant-isolation", "covered", {
      evidence: [evidence.medBrowser, evidence.medIntegration],
    });

    classify(capability, "authorization-denial", "covered", {
      evidence: [evidence.medBrowser, evidence.medIntegration],
    });
  }

  if (tests.has(evidence.birdy) || tests.has(evidence.birdyPlatform)) {
    classify(capability, "tenant-isolation", "covered", {
      evidence: [...tests].filter((test) =>
        [evidence.birdy, evidence.birdyPlatform].includes(test),
      ),
    });

    classify(capability, "birdy-data-safety", "partial", {
      evidence: [...tests].filter((test) =>
        [evidence.birdy, evidence.birdyPlatform].includes(test),
      ),
    });
  }

  if (
    capability.route === "/book/[slug]" ||
    capability.route === "/dashboard/bookings"
  ) {
    classify(capability, "idempotency", "covered", {
      evidence: [evidence.fullSystem, evidence.sprint5],
      recoveryBehavior:
        "Repeated booking submissions resolve to the original persisted booking instead of creating duplicates.",
    });

    classify(capability, "retry-safety", "partial", {
      evidence: [evidence.fullSystem, evidence.sprint5],
    });

    classify(capability, "concurrent-mutation", "covered", {
      evidence: [evidence.bookingConcurrency, evidence.sprint5],
      containmentBoundary:
        "Concurrent booking writes are constrained by protected RPC and lock-timeout behavior.",
    });

    classify(capability, "duplicate-delivery", "partial", {
      evidence: [evidence.fullSystem],
    });
  }

  if (capability.route === "/book/[slug]") {
    classify(capability, "degraded-ui", "covered", {
      evidence: [evidence.publicBooking],
      notes: [
        "Unknown or unavailable booking slugs display an explicit unavailable state.",
      ],
    });

    classify(capability, "invalid-state-transition", "partial", {
      evidence: [evidence.publicBooking],
      notes: [
        "Invalid and unavailable booking states are rejected; broader lifecycle-transition testing remains planned.",
      ],
    });
  }

  if (
    capability.route === "/student/dashboard/import" ||
    capability.route === "/api/student/imports/process"
  ) {
    classify(capability, "dependency-outage", "partial", {
      evidence: [evidence.student],
    });

    classify(capability, "degraded-ui", "covered", {
      evidence: [evidence.student],
    });

    classify(capability, "invalid-state-transition", "partial", {
      evidence: [evidence.student],
    });
  }

  if (
    capability.route === "/connectors" ||
    capability.route === "/api/platform/connectors"
  ) {
    classify(capability, "revocation", "covered", {
      evidence: [evidence.sharedPlatform],
      recoveryBehavior:
        "Revoked connector access is removed without exposing another owner's connector state.",
    });

    classify(capability, "stale-session-permissions", "partial", {
      evidence: [evidence.sharedPlatform],
      notes: [
        "Connector revocation is exercised; expired provider tokens and stale browser sessions remain planned.",
      ],
    });
  }

  if (
    capability.route === "/med/dashboard/family" ||
    capability.route === "/med/dashboard/family/[owner_id]" ||
    capability.route === "/med/dashboard/caregivers"
  ) {
    classify(capability, "revocation", "covered", {
      evidence: [evidence.medBrowser, evidence.medIntegration],
      recoveryBehavior: "Revocation removes caregiver visibility immediately.",
    });

    classify(capability, "stale-session-permissions", "covered", {
      evidence: [evidence.medBrowser, evidence.medIntegration],
    });

    classify(capability, "degraded-ui", "covered", {
      evidence: [evidence.medBrowser],
    });
  }

  for (const dimension of capability.dimensions) {
    if (dimension.status === "unassessed") {
      dimension.status = "planned";
      dimension.notes = unique([
        ...(dimension.notes || []),
        "Dedicated resilience evidence is required before this assessment can be marked partial or covered.",
      ]);
    }
  }
}

matrix.enrichedAt = new Date().toISOString();
matrix.enricher = "scripts/enrich-resilience-matrix.mjs";

writeFileSync(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`);

const totals = {};

for (const capability of matrix.capabilities) {
  for (const dimension of capability.dimensions) {
    totals[dimension.status] = (totals[dimension.status] || 0) + 1;
  }
}

console.log("Resilience matrix enrichment complete.");
console.log(totals);
