import { readdir } from "node:fs/promises";
import process from "node:process";
const files = (await readdir("supabase/migrations")).filter(f=>f.endsWith(".sql")).sort();
const seen = new Map(), bad = [];
for (const f of files) {
  const m = f.match(/^(\d{14})_([a-z0-9][a-z0-9_]*)\.sql$/);
  if (!m) { bad.push(f); continue; }
  const list = seen.get(m[1]) || []; list.push(f); seen.set(m[1], list);
}
const dup = [...seen].filter(([,v])=>v.length>1);
if (bad.length || dup.length) {
  for (const f of bad) console.error(`Invalid migration filename: ${f}`);
  for (const [t,v] of dup) console.error(`Duplicate timestamp ${t}: ${v.join(", ")}`);
  process.exit(1);
}
console.log(`Migration validation passed: ${files.length} migration(s).`);
