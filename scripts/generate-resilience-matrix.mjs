import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";

const root = process.cwd();

const systemMapPath = join(
  root,
  ".engineering",
  "system-map.json",
);

const outputPath = join(
  root,
  ".engineering",
  "resilience-matrix.json",
);

const dimensions = [
  "authorization-denial",
  "tenant-isolation",
  "dependency-outage",
  "timeout",
  "retry-safety",
  "idempotency",
  "duplicate-delivery",
  "partial-write",
  "rollback-compensation",
  "concurrent-mutation",
  "stale-session-permissions",
  "revocation",
  "orphaned-relationships",
  "invalid-state-transition",
  "degraded-ui",
  "failure-observability",
  "recovery",
  "cross-module-containment",
  "birdy-data-safety",
];

if (!existsSync(systemMapPath)) {
  console.error(
    "Missing .engineering/system-map.json. Run npm run system:map:enrich first.",
  );
  process.exit(1);
}

const systemMap = JSON.parse(
  readFileSync(systemMapPath, "utf8"),
);

if (!Array.isArray(systemMap.capabilities)) {
  console.error(
    "System map capabilities must be an array.",
  );
  process.exit(1);
}

let previousMatrix = null;

if (existsSync(outputPath)) {
  try {
    previousMatrix = JSON.parse(
      readFileSync(outputPath, "utf8"),
    );
  } catch {
    previousMatrix = null;
  }
}

const previousByCapability = new Map(
  (
    previousMatrix?.capabilities ||
    []
  ).map((entry) => [
    entry.capabilityId,
    entry,
  ]),
);

const capabilities =
  systemMap.capabilities.map(
    (capability) => {
      const previous =
        previousByCapability.get(
          capability.id,
        );

      const previousDimensions =
        new Map(
          (
            previous?.dimensions ||
            []
          ).map((dimension) => [
            dimension.id,
            dimension,
          ]),
        );

      return {
        capabilityId:
          capability.id,
        route: capability.route,
        source:
          capability.source,
        type: capability.type,
        criticality:
          capability.criticality,
        module:
          capability.route
            .split("/")
            .filter(Boolean)[0] ||
          "root",
        dependencies:
          capability.dependencies ||
          {
            tables: [],
          },
        permissions: {
          roles:
            capability.roles || [],
          auth:
            capability.auth || {
              operations: [],
            },
        },
        assignedTests:
          capability.tests || [],
        dimensions:
          dimensions.map((id) => {
            const existing =
              previousDimensions.get(id);

            return (
              existing || {
                id,
                status:
                  "unassessed",
                evidence: [],
                containmentBoundary:
                  "",
                recoveryBehavior: "",
                observabilitySignal:
                  "",
                notes: [],
              }
            );
          }),
      };
    },
  );

const matrix = {
  schemaVersion: 1,
  generatedAt:
    new Date().toISOString(),
  source:
    ".engineering/system-map.json",
  dimensions,
  summary: {
    capabilities:
      capabilities.length,
    dimensionsPerCapability:
      dimensions.length,
    totalAssessments:
      capabilities.length *
      dimensions.length,
  },
  capabilities,
};

mkdirSync(
  dirname(outputPath),
  {
    recursive: true,
  },
);

writeFileSync(
  outputPath,
  `${JSON.stringify(
    matrix,
    null,
    2,
  )}\n`,
);

console.log(
  `Generated resilience matrix for ${capabilities.length} capabilities.`,
);

console.log(
  `Assessment cells: ${matrix.summary.totalAssessments}`,
);

console.log(
  `Output: ${outputPath}`,
);
