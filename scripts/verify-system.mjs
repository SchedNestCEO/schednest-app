import { spawnSync } from "node:child_process";
import process from "node:process";

const gates = [
  ["Engineering foundation", "npm", ["run", "engineering:verify"]],
  ["Sprint 2 safeguards", "npm", ["run", "sprint2:verify"]],
  ["Sprint 3 performance", "npm", ["run", "sprint3:verify"]],
  ["Sprint 4 load foundation", "npm", ["run", "sprint4:verify"]],
  ["Sprint 5 booking integrity", "npm", ["run", "sprint5:verify"]],
  ["Full lint", "npm", ["run", "lint"]],
  ["TypeScript", "npm", ["run", "typecheck"]],
  ["Unit tests", "npm", ["run", "test:unit"]],
  ["Production build", "npm", ["run", "build"]],
  ["Browser regression", "npm", ["run", "test:e2e"]],
];

const startedAt = Date.now();

for (const [name, command, args] of gates) {
  console.log(`\n=== ${name} ===`);

  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });

  if (result.error) {
    console.error(`\nSystem test could not run ${name}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`\nSystem test failed at: ${name}`);
    process.exit(result.status || 1);
  }
}

const durationSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);

console.log(`\nComplete SchedNest system test passed in ${durationSeconds}s.`);
