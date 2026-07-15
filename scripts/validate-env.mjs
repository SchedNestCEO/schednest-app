import { readFile } from "node:fs/promises";
import process from "node:process";
const file = process.argv[2] || ".env.local.example";
const text = await readFile(file, "utf8").catch(() => "");
if (!text) { console.error(`Missing ${file}`); process.exit(1); }
const keys = new Set(text.split(/\r?\n/).map(x=>x.trim()).filter(x=>x && !x.startsWith("#") && x.includes("=")).map(x=>x.split("=")[0]));
const missing = [];
if (!keys.has("NEXT_PUBLIC_SUPABASE_URL")) missing.push("NEXT_PUBLIC_SUPABASE_URL");
if (!keys.has("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") && !keys.has("NEXT_PUBLIC_SUPABASE_ANON_KEY")) missing.push("a Supabase public key");
if (missing.length) { console.error("Environment validation failed: " + missing.join(", ")); process.exit(1); }
console.log("Environment contract validation passed.");
