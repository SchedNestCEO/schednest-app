import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import process from "node:process";
const bin = process.platform === "win32" ? "node_modules\\.bin\\eslint.cmd" : "node_modules/.bin/eslint";
const r = spawnSync(bin, [".","--format","json"], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
const report = JSON.parse(r.stdout || "[]");
const totals = report.reduce((a,f)=>({errors:a.errors+(f.errorCount||0),warnings:a.warnings+(f.warningCount||0)}),{errors:0,warnings:0});
await writeFile(".engineering/lint-baseline.json", JSON.stringify({...totals,generatedAt:new Date().toISOString()},null,2)+"\n");
console.log(`Updated lint baseline to ${totals.errors} errors and ${totals.warnings} warnings.`);
