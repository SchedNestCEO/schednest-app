import { access, readFile } from "node:fs/promises";
import process from "node:process";

const required = [
  "app/admin/performance/page.tsx",
  "app/api/admin/performance/route.ts",
  "app/lib/admin/performance.ts",
  "docs/performance/PERFORMANCE_CENTER_CORE.md",
  "docs/engineering/SPRINT_3.md",
  "supabase/migrations/20260713100000_performance_center_core_v1.sql",
];

const missing = [];
for (const file of required) {
  try {
    await access(file);
  } catch {
    missing.push(file);
  }
}

if (missing.length) {
  for (const file of missing) console.error(`Missing ${file}`);
  process.exit(1);
}

const migration = await readFile(
  "supabase/migrations/20260713100000_performance_center_core_v1.sql",
  "utf8",
);

for (const table of [
  "performance_test_runs",
  "performance_metric_snapshots",
  "performance_thresholds",
]) {
  if (!migration.includes(table)) {
    console.error(`Migration is missing ${table}`);
    process.exit(1);
  }
}

console.log("Engineering Phase 1 Sprint 3 verification passed.");
