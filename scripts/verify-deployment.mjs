import { spawnSync } from "node:child_process";
import process from "node:process";
if (!process.env.DEPLOYMENT_URL) { console.error("DEPLOYMENT_URL is required."); process.exit(1); }
const r = spawnSync(process.execPath,["scripts/smoke-test.mjs"],{stdio:"inherit",env:{...process.env,BASE_URL:process.env.DEPLOYMENT_URL}});
process.exit(r.status ?? 1);
