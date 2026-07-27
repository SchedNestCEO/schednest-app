import {
  existsSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { join, relative, sep } from "node:path";
import process from "node:process";

const root = process.cwd();
const appDirectory = join(root, "app");
const mapPath = join(root, ".engineering", "system-map.json");

function fail(message) {
  console.error(`Sprint 7 verification failed: ${message}`);
  process.exit(1);
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function classify(sourcePath) {
  if (sourcePath.endsWith(`${sep}page.tsx`)) return "page";
  if (sourcePath.endsWith(`${sep}route.ts`)) return "api";
  if (sourcePath.endsWith(`${sep}layout.tsx`)) return "layout";
  return null;
}

if (!existsSync(mapPath)) {
  fail(".engineering/system-map.json does not exist.");
}

let systemMap;

try {
  systemMap = JSON.parse(readFileSync(mapPath, "utf8"));
} catch (error) {
  fail(`system map is not valid JSON: ${error.message}`);
}

if (systemMap.schemaVersion !== 1) {
  fail(`unsupported schemaVersion: ${systemMap.schemaVersion}`);
}

if (!Array.isArray(systemMap.capabilities)) {
  fail("capabilities must be an array.");
}

const discoveredSources = walk(appDirectory)
  .filter((sourcePath) => classify(sourcePath))
  .map((sourcePath) => relative(root, sourcePath).split(sep).join("/"))
  .sort();

const mappedSources = systemMap.capabilities
  .map((capability) => capability.source)
  .sort();

const discoveredSet = new Set(discoveredSources);
const mappedSet = new Set(mappedSources);

const unmapped = discoveredSources.filter((source) => !mappedSet.has(source));
const missing = mappedSources.filter((source) => !discoveredSet.has(source));

if (unmapped.length > 0) {
  fail(`unmapped application files:\n- ${unmapped.join("\n- ")}`);
}

if (missing.length > 0) {
  fail(`mapped files no longer exist:\n- ${missing.join("\n- ")}`);
}

const duplicateIds = systemMap.capabilities
  .map((capability) => capability.id)
  .filter((id, index, all) => all.indexOf(id) !== index);

if (duplicateIds.length > 0) {
  fail(`duplicate capability IDs: ${[...new Set(duplicateIds)].join(", ")}`);
}

for (const capability of systemMap.capabilities) {
  if (!capability.id || !capability.type || !capability.route || !capability.source) {
    fail(`incomplete capability record: ${JSON.stringify(capability)}`);
  }

  if (!Array.isArray(capability.states) || capability.states.length === 0) {
    fail(`${capability.id} has no mapped states.`);
  }

  if (!Array.isArray(capability.tests)) {
    fail(`${capability.id} tests must be an array.`);
  }

  for (const testPath of capability.tests) {
    if (!existsSync(join(root, testPath))) {
      fail(`${capability.id} references missing test: ${testPath}`);
    }
  }
}

const pages = systemMap.capabilities.filter(({ type }) => type === "page");
const APIs = systemMap.capabilities.filter(({ type }) => type === "api");
const assigned = systemMap.capabilities.filter(
  ({ tests }) => tests.length > 0,
);

console.log("Sprint 7 system-map foundation verification passed.");
console.log(`Mapped pages: ${pages.length}`);
console.log(`Mapped APIs: ${APIs.length}`);
console.log(`Entries with assigned tests: ${assigned.length}`);
console.log(
  `Entries awaiting explicit test assignment: ${
    systemMap.capabilities.length - assigned.length
  }`,
);
