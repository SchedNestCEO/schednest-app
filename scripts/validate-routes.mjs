import { access, readFile } from "node:fs/promises";
import process from "node:process";
const manifest = JSON.parse(await readFile(".engineering/critical-routes.json","utf8"));
const missing = [];
for (const f of [...manifest.pages, ...manifest.apiRoutes]) {
  try { await access(f); } catch { missing.push(f); }
}
if (missing.length) { missing.forEach(f=>console.error(`Missing route file: ${f}`)); process.exit(1); }
console.log("Critical route validation passed.");
