import { readFile } from "node:fs/promises";
import process from "node:process";
const base = (process.env.BASE_URL || "").replace(/\/$/,"");
if (!base) { console.error("BASE_URL is required."); process.exit(1); }
const manifest = JSON.parse(await readFile(".engineering/critical-routes.json","utf8"));
const failures = [];
for (const path of manifest.publicSmokePaths) {
  try {
    const res = await fetch(base+path,{redirect:"manual",signal:AbortSignal.timeout(10000)});
    if (res.status < 200 || res.status >= 400) failures.push(`${path}: ${res.status}`);
    else console.log(`PASS ${path}: ${res.status}`);
  } catch (e) { failures.push(`${path}: ${e.message}`); }
}
if (failures.length) { failures.forEach(x=>console.error(x)); process.exit(1); }
console.log("Smoke test passed.");
