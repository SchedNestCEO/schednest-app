import { rm } from "node:fs/promises";

await rm(".next", {
  recursive: true,
  force: true,
});

console.log("Removed stale Next.js build artifacts.");
