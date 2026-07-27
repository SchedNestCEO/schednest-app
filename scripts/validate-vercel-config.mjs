import { access, readFile } from "node:fs/promises";
import process from "node:process";
let cfg;
try { cfg = JSON.parse(await readFile("vercel.json","utf8")); } catch { console.error("Invalid vercel.json"); process.exit(1); }
for (const cron of cfg.crons || []) {
  if (!cron.path?.startsWith("/api/") || !cron.schedule) { console.error("Invalid Vercel cron entry"); process.exit(1); }
  try { await access(`app${cron.path}/route.ts`); } catch { console.error(`Missing cron route: app${cron.path}/route.ts`); process.exit(1); }
}
console.log(`Vercel config validation passed: ${(cfg.crons||[]).length} cron(s).`);
