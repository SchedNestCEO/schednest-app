import { readdirSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = process.cwd();
const appDirectory = join(root, "app");
const outputPath = join(root, ".engineering", "system-map.json");

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return walk(path);
    }

    return [path];
  });
}

function toWebPath(sourcePath) {
  const relativePath = relative(appDirectory, sourcePath);
  const segments = relativePath.split(sep);

  segments.pop();

  const routeSegments = segments.filter(
    (segment) => !segment.startsWith("(") && !segment.endsWith(")"),
  );

  return routeSegments.length === 0 ? "/" : `/${routeSegments.join("/")}`;
}

function classify(sourcePath) {
  if (sourcePath.endsWith(`${sep}route.ts`)) {
    return "api";
  }

  if (sourcePath.endsWith(`${sep}page.tsx`)) {
    return "page";
  }

  if (sourcePath.endsWith(`${sep}layout.tsx`)) {
    return "layout";
  }

  return null;
}

function inferArea(routePath) {
  const firstSegment = routePath.split("/").filter(Boolean)[0];

  if (!firstSegment) return "public";

  const knownAreas = new Set([
    "admin",
    "api",
    "birdy",
    "book",
    "dashboard",
    "med",
    "student",
    "teams",
    "settings",
  ]);

  return knownAreas.has(firstSegment) ? firstSegment : "public";
}

function inferAccess(routePath, type) {
  if (type === "api") {
    if (routePath.includes("/stripe/webhook")) return "webhook";
    if (
      routePath.includes("/booking-notifications") ||
      routePath.includes("/booking-reminders")
    ) {
      return "scheduled-job";
    }

    return "unknown";
  }

  if (
    routePath.startsWith("/dashboard") ||
    routePath.startsWith("/admin") ||
    routePath.startsWith("/med/dashboard") ||
    routePath.startsWith("/student/dashboard") ||
    routePath.startsWith("/teams/dashboard") ||
    routePath.startsWith("/birdy") ||
    routePath === "/activity" ||
    routePath === "/connectors" ||
    routePath === "/coordination" ||
    routePath === "/files" ||
    routePath === "/notifications" ||
    routePath === "/settings" ||
    routePath.startsWith("/settings/")
  ) {
    return "authenticated";
  }

  return "public";
}

const sourceFiles = walk(appDirectory)
  .map((sourcePath) => ({
    sourcePath,
    type: classify(sourcePath),
  }))
  .filter(({ type }) => type !== null);

const capabilities = sourceFiles
  .map(({ sourcePath, type }) => {
    const route = toWebPath(sourcePath);

    return {
      id: `${type}:${route}`,
      type,
      route,
      source: relative(root, sourcePath).split(sep).join("/"),
      area: inferArea(route),
      access: inferAccess(route, type),
      roles: [],
      states:
        type === "page"
          ? [
              "loading",
              "ready",
              "empty",
              "validation-error",
              "operation-error",
              "unauthorized",
            ]
          : ["success", "validation-error", "unauthorized", "operation-error"],
      dependencies: {
        tables: [],
        APIs: [],
        externalServices: [],
      },
      tests: [],
      coverage: "unassigned",
      notes: [],
    };
  })
  .sort((a, b) => {
    const routeComparison = a.route.localeCompare(b.route);
    return routeComparison || a.type.localeCompare(b.type);
  });

const systemMap = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  generator: "scripts/generate-system-map.mjs",
  summary: {
    total: capabilities.length,
    pages: capabilities.filter(({ type }) => type === "page").length,
    APIs: capabilities.filter(({ type }) => type === "api").length,
    layouts: capabilities.filter(({ type }) => type === "layout").length,
    assignedTests: capabilities.filter(
      ({ tests }) => Array.isArray(tests) && tests.length > 0,
    ).length,
  },
  capabilities,
};

writeFileSync(outputPath, `${JSON.stringify(systemMap, null, 2)}\n`);

console.log(
  `Generated ${systemMap.summary.total} mapped entries: ` +
    `${systemMap.summary.pages} pages, ` +
    `${systemMap.summary.APIs} APIs, ` +
    `${systemMap.summary.layouts} layouts.`,
);
console.log(`Wrote ${relative(root, outputPath)}.`);
