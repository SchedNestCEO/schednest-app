import {
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import process from "node:process";

const root = process.cwd();
const mapPath = join(root, ".engineering", "system-map.json");

if (!existsSync(mapPath)) {
  console.error("Run npm run system:map before enriching the system map.");
  process.exit(1);
}

const systemMap = JSON.parse(readFileSync(mapPath, "utf8"));

const PUBLIC_SMOKE_TEST = "tests/e2e/public-smoke.spec.ts";
const AUTH_BEHAVIOR_TEST = "tests/e2e/auth-behavior.spec.ts";

const authBehaviorRoutes = new Set([
  "/login",
  "/forgot-password",
  "/reset-password",
  "/dashboard",
  "/dashboard/subscriptions",
]);

const criticalBusinessRoutes = new Set([
  "/book/[slug]",
  "/dashboard",
  "/dashboard/booking-page",
  "/dashboard/bookings",
  "/dashboard/customers",
  "/dashboard/requests",
  "/dashboard/services",
  "/dashboard/settings",
]);

const criticalAPIFragments = [
  "/api/booking-notifications",
  "/api/booking-reminders",
  "/api/stripe/",
];

function unique(values) {
  return [...new Set(values)].sort();
}

function extractTables(source) {
  return unique(
    [...source.matchAll(/\.from\(\s*["']([^"']+)["']\s*\)/g)].map(
      (match) => match[1],
    ),
  );
}

function extractHttpMethods(source, type) {
  if (type !== "api") {
    return [];
  }

  return [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
    "HEAD",
  ].filter((method) => {
    const pattern = new RegExp(
      `export\\s+(?:async\\s+)?function\\s+${method}\\b|` +
        `export\\s+const\\s+${method}\\b`,
    );

    return pattern.test(source);
  });
}

function extractAuthOperations(source) {
  const operations = [];

  if (/auth\.getUser\s*\(/.test(source)) {
    operations.push("get-user");
  }

  if (/auth\.getSession\s*\(/.test(source)) {
    operations.push("get-session");
  }

  if (/auth\.signInWithPassword\s*\(/.test(source)) {
    operations.push("sign-in-password");
  }

  if (/auth\.signUp\s*\(/.test(source)) {
    operations.push("sign-up");
  }

  if (/auth\.signOut\s*\(/.test(source)) {
    operations.push("sign-out");
  }

  if (/requireAdmin\s*\(/.test(source)) {
    operations.push("require-admin");
  }

  return unique(operations);
}

function inferRoles(capability, authOperations) {
  const { route, access } = capability;

  if (access === "public") {
    return ["visitor"];
  }

  if (access === "webhook") {
    return ["external-service"];
  }

  if (access === "scheduled-job") {
    return ["scheduler"];
  }

  if (
    route.startsWith("/admin") ||
    authOperations.includes("require-admin")
  ) {
    return ["platform-admin"];
  }

  if (route.startsWith("/med")) {
    return ["medical-user", "caregiver"];
  }

  if (route.startsWith("/student")) {
    return ["student"];
  }

  if (route.startsWith("/teams")) {
    return ["team-admin", "team-member"];
  }

  if (route.startsWith("/birdy")) {
    return ["authenticated-user"];
  }

  if (
    route.startsWith("/dashboard") ||
    route.startsWith("/api/stripe") ||
    route.startsWith("/api/booking")
  ) {
    return ["business-owner"];
  }

  return ["authenticated-user"];
}

function inferCriticality(capability) {
  if (criticalBusinessRoutes.has(capability.route)) {
    return "critical";
  }

  if (
    criticalAPIFragments.some((fragment) =>
      capability.route.startsWith(fragment),
    )
  ) {
    return "critical";
  }

  if (
    capability.route.startsWith("/admin") ||
    capability.route.includes("/privacy") ||
    capability.route === "/security"
  ) {
    return "high";
  }

  if (capability.type === "layout") {
    return "structural";
  }

  return "standard";
}

function inferSyntheticActors(capability) {
  const actors = new Set(capability.roles);

  if (capability.route === "/book/[slug]") {
    actors.add("public-customer");
    actors.add("business-owner");
  }

  if (capability.route.startsWith("/dashboard/customers")) {
    actors.add("business-customer");
  }

  if (
    capability.route.startsWith("/dashboard/bookings") ||
    capability.route.startsWith("/dashboard/requests")
  ) {
    actors.add("public-customer");
    actors.add("business-customer");
  }

  return [...actors].sort();
}

function applyRouteOverrides(capability) {
  if (capability.route === "/dashboard/subscriptions") {
    capability.criticality = "structural";
    capability.notes = unique([
      ...(capability.notes || []),
      "Redirect alias to /admin/subscriptions; contains no independent subscription UI.",
    ]);
    capability.redirect = {
      destination: "/admin/subscriptions",
      permanent: false,
    };
  }

  if (capability.route === "/admin/subscriptions") {
    capability.notes = unique([
      ...(capability.notes || []),
      "Canonical subscription-management interface reached through /dashboard/subscriptions.",
    ]);
  }
}

function assignExistingTests(capability) {
  const tests = new Set(capability.tests || []);

  if (
    capability.type === "page" &&
    capability.access === "public" &&
    capability.route !== "/book/[slug]"
  ) {
    tests.add(PUBLIC_SMOKE_TEST);
  }

  if (authBehaviorRoutes.has(capability.route)) {
    tests.add(AUTH_BEHAVIOR_TEST);
  }

  return [...tests].sort();
}

for (const capability of systemMap.capabilities) {
  const sourcePath = join(root, capability.source);
  const source = readFileSync(sourcePath, "utf8");

  const authOperations = extractAuthOperations(source);
  const tables = extractTables(source);

  capability.dependencies = {
    ...(capability.dependencies || {}),
    tables,
    APIs: capability.dependencies?.APIs || [],
    externalServices:
      capability.dependencies?.externalServices || [],
  };

  capability.auth = {
    operations: authOperations,
    authenticated:
      capability.access === "authenticated" ||
      authOperations.includes("get-user") ||
      authOperations.includes("get-session") ||
      authOperations.includes("require-admin"),
  };

  capability.httpMethods = extractHttpMethods(
    source,
    capability.type,
  );
  capability.roles = inferRoles(capability, authOperations);
  capability.criticality = inferCriticality(capability);
  capability.syntheticActors = inferSyntheticActors(capability);
  capability.tests = assignExistingTests(capability);
  capability.coverage =
    capability.tests.length > 0 ? "partial" : "unassigned";
}

systemMap.enrichedAt = new Date().toISOString();
systemMap.enricher = relative(
  root,
  join(root, "scripts", "enrich-system-map.mjs"),
);

systemMap.summary = {
  ...systemMap.summary,
  assignedTests: systemMap.capabilities.filter(
    ({ tests }) => tests.length > 0,
  ).length,
  unassignedTests: systemMap.capabilities.filter(
    ({ tests }) => tests.length === 0,
  ).length,
  critical: systemMap.capabilities.filter(
    ({ criticality }) => criticality === "critical",
  ).length,
  high: systemMap.capabilities.filter(
    ({ criticality }) => criticality === "high",
  ).length,
};

writeFileSync(mapPath, `${JSON.stringify(systemMap, null, 2)}\n`);

console.log("System map enrichment complete.");
console.log(`Mapped entries: ${systemMap.capabilities.length}`);
console.log(
  `Entries with current test assignments: ${systemMap.summary.assignedTests}`,
);
console.log(
  `Entries awaiting tests: ${systemMap.summary.unassignedTests}`,
);
console.log(`Critical entries: ${systemMap.summary.critical}`);
