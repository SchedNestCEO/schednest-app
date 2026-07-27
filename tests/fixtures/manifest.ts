import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

export const SYNTHETIC_MANIFEST_PATH = join(
  process.cwd(),
  "artifacts",
  "synthetic-test-manifest.json",
);

export type SyntheticTenantManifest = {
  actor: "business-owner-a" | "business-owner-b";
  userId: string;
  email: string;
  businessId: string;
  bookingSlug: string;
  serviceId: string;
  customerId: string;
};

export type SyntheticTestManifest = {
  schemaVersion: 1;
  marker: string;
  createdAt: string;
  updatedAt: string;
  tenants: SyntheticTenantManifest[];
};

export function createEmptySyntheticManifest(
  marker: string,
): SyntheticTestManifest {
  const now = new Date().toISOString();

  return {
    schemaVersion: 1,
    marker,
    createdAt: now,
    updatedAt: now,
    tenants: [],
  };
}

export function readSyntheticManifest(): SyntheticTestManifest | null {
  if (!existsSync(SYNTHETIC_MANIFEST_PATH)) {
    return null;
  }

  const manifest = JSON.parse(
    readFileSync(SYNTHETIC_MANIFEST_PATH, "utf8"),
  ) as SyntheticTestManifest;

  if (manifest.schemaVersion !== 1) {
    throw new Error(
      `Unsupported synthetic manifest schema: ${manifest.schemaVersion}`,
    );
  }

  return manifest;
}

export function writeSyntheticManifest(
  manifest: SyntheticTestManifest,
): void {
  const directory = dirname(SYNTHETIC_MANIFEST_PATH);
  mkdirSync(directory, { recursive: true });

  const updatedManifest: SyntheticTestManifest = {
    ...manifest,
    updatedAt: new Date().toISOString(),
  };

  const temporaryPath = `${SYNTHETIC_MANIFEST_PATH}.tmp`;

  writeFileSync(
    temporaryPath,
    `${JSON.stringify(updatedManifest, null, 2)}\n`,
  );

  renameSync(temporaryPath, SYNTHETIC_MANIFEST_PATH);
}
