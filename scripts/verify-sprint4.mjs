import { access, readFile } from "node:fs/promises";
import process from "node:process";
const files=["tests/load/lib/guard.js","tests/load/lib/summary.js","tests/load/business-public.js","tests/load/business-authenticated.js","tests/load/student.js","tests/load/teams.js","tests/load/medical.js","tests/load/life.js","tests/load/combined-five-products.js","scripts/ingest-k6-summary.mjs","docs/performance/LOAD_TESTING.md","docs/engineering/SPRINT_4.md","supabase/migrations/20260714100000_performance_load_thresholds_v1.sql"];
const missing=[];for(const f of files){try{await access(f)}catch{missing.push(f)}}if(missing.length){missing.forEach(f=>console.error(`Missing ${f}`));process.exit(1)}
const c=await readFile("tests/load/combined-five-products.js","utf8");for(const p of ["business","student","teams","medical","life"]){if(!c.includes(`${p}_100`)){console.error(`Missing ${p}_100`);process.exit(1)}}
console.log("Engineering Phase 1 Sprint 4 verification passed.");
