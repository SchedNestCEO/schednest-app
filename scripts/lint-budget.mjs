import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import process from "node:process";
const baseline = JSON.parse(await readFile(".engineering/lint-baseline.json","utf8"));
const bin = process.platform === "win32" ? "node_modules\\.bin\\eslint.cmd" : "node_modules/.bin/eslint";
const r = spawnSync(bin, [".","--format","json"], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
if (r.error) { console.error(r.error.message); process.exit(1); }
let report;
try { report = JSON.parse(r.stdout || "[]"); } catch { console.error("Invalid ESLint JSON output"); process.exit(1); }
const totals = report.reduce((a,f)=>({errors:a.errors+(f.errorCount||0),warnings:a.warnings+(f.warningCount||0)}),{errors:0,warnings:0});
console.log(`Lint budget current ${totals.errors}/${totals.warnings}; baseline ${baseline.errors}/${baseline.warnings}.`);
if (totals.errors > baseline.errors || totals.warnings > baseline.warnings) { console.error("Lint debt increased."); process.exit(1); }
console.log("Lint no-regression budget passed.");
