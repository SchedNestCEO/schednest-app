import {
  existsSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";
import process from "node:process";

const root = process.cwd();

const systemMapPath = join(
  root,
  ".engineering",
  "system-map.json",
);

const matrixPath = join(
  root,
  ".engineering",
  "resilience-matrix.json",
);

const allowedStatuses =
  new Set([
    "unassessed",
    "not-applicable",
    "planned",
    "partial",
    "covered",
  ]);

function fail(message) {
  console.error(
    `Resilience verification failed: ${message}`,
  );
  process.exit(1);
}

if (!existsSync(systemMapPath)) {
  fail(
    ".engineering/system-map.json is missing.",
  );
}

if (!existsSync(matrixPath)) {
  fail(
    ".engineering/resilience-matrix.json is missing.",
  );
}

const systemMap = JSON.parse(
  readFileSync(
    systemMapPath,
    "utf8",
  ),
);

const matrix = JSON.parse(
  readFileSync(
    matrixPath,
    "utf8",
  ),
);

if (matrix.schemaVersion !== 1) {
  fail(
    `unsupported schemaVersion ${matrix.schemaVersion}`,
  );
}

if (
  !Array.isArray(
    matrix.dimensions,
  ) ||
  matrix.dimensions.length === 0
) {
  fail(
    "dimensions must be a non-empty array.",
  );
}

if (
  !Array.isArray(
    matrix.capabilities,
  )
) {
  fail(
    "capabilities must be an array.",
  );
}

const systemIds = new Set(
  systemMap.capabilities.map(
    ({ id }) => id,
  ),
);

const matrixIds = new Set(
  matrix.capabilities.map(
    ({ capabilityId }) =>
      capabilityId,
  ),
);

const missing = [
  ...systemIds,
].filter(
  (id) => !matrixIds.has(id),
);

const stale = [
  ...matrixIds,
].filter(
  (id) => !systemIds.has(id),
);

if (missing.length > 0) {
  fail(
    `missing capability rows:\n- ${missing.join("\n- ")}`,
  );
}

if (stale.length > 0) {
  fail(
    `stale capability rows:\n- ${stale.join("\n- ")}`,
  );
}

let unassessed = 0;
let planned = 0;
let partial = 0;
let covered = 0;
let notApplicable = 0;

for (
  const capability of
  matrix.capabilities
) {
  if (
    !capability.capabilityId ||
    !capability.route ||
    !capability.source
  ) {
    fail(
      `incomplete capability row: ${JSON.stringify(capability)}`,
    );
  }

  if (
    !Array.isArray(
      capability.dimensions,
    )
  ) {
    fail(
      `${capability.capabilityId} has no dimension records.`,
    );
  }

  const dimensionIds =
    new Set(
      capability.dimensions.map(
        ({ id }) => id,
      ),
    );

  for (
    const requiredDimension of
    matrix.dimensions
  ) {
    if (
      !dimensionIds.has(
        requiredDimension,
      )
    ) {
      fail(
        `${capability.capabilityId} is missing ${requiredDimension}.`,
      );
    }
  }

  for (
    const dimension of
    capability.dimensions
  ) {
    if (
      !allowedStatuses.has(
        dimension.status,
      )
    ) {
      fail(
        `${capability.capabilityId}/${dimension.id} has invalid status ${dimension.status}.`,
      );
    }

    if (
      !Array.isArray(
        dimension.evidence,
      ) ||
      !Array.isArray(
        dimension.notes,
      )
    ) {
      fail(
        `${capability.capabilityId}/${dimension.id} has invalid evidence or notes.`,
      );
    }

    switch (
      dimension.status
    ) {
      case "unassessed":
        unassessed += 1;
        break;
      case "planned":
        planned += 1;
        break;
      case "partial":
        partial += 1;
        break;
      case "covered":
        covered += 1;
        break;
      case "not-applicable":
        notApplicable += 1;
        break;
    }

    if (
      dimension.status ===
        "covered" &&
      dimension.evidence.length ===
        0
    ) {
      fail(
        `${capability.capabilityId}/${dimension.id} is covered without evidence.`,
      );
    }

    for (
      const evidencePath of
      dimension.evidence
    ) {
      if (
        !existsSync(
          join(
            root,
            evidencePath,
          ),
        )
      ) {
        fail(
          `${capability.capabilityId}/${dimension.id} references missing evidence ${evidencePath}.`,
        );
      }
    }
  }
}

console.log(
  "Resilience matrix structural verification passed.",
);

console.log(
  `Capabilities: ${matrix.capabilities.length}`,
);

console.log(
  `Assessment cells: ${
    matrix.capabilities.length *
    matrix.dimensions.length
  }`,
);

console.log(
  `Covered: ${covered}`,
);

console.log(
  `Partial: ${partial}`,
);

console.log(
  `Planned: ${planned}`,
);

console.log(
  `Unassessed: ${unassessed}`,
);

console.log(
  `Not applicable: ${notApplicable}`,
);
