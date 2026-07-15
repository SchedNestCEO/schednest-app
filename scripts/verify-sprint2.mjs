import { access } from "node:fs/promises";
import process from "node:process";
const required = [
 ".engineering/critical-routes.json",".engineering/lint-baseline.json",
 "scripts/validate-env.mjs","scripts/validate-migrations.mjs","scripts/validate-routes.mjs",
 "scripts/validate-vercel-config.mjs","scripts/lint-budget.mjs","scripts/smoke-test.mjs",
 "scripts/verify-deployment.mjs","docs/engineering/CI_CD.md","docs/engineering/SPRINT_2.md"
];
const missing=[];
for (const f of required) { try { await access(f); } catch { missing.push(f); } }
if (missing.length) { missing.forEach(f=>console.error(`Missing ${f}`)); process.exit(1); }
console.log("Engineering Phase 1 Sprint 2 verification passed.");
