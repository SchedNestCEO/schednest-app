import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "CHANGELOG.md", "VERSION.md", "ROADMAP.md", "CONTRIBUTING.md",
  "docs/engineering/README.md", "docs/engineering/STANDARDS.md",
  "docs/engineering/BRANCHING.md", "docs/engineering/RELEASE_PROCESS.md",
  "docs/engineering/TESTING.md", "docs/engineering/DEFINITION_OF_DONE.md",
  "docs/engineering/OWNERSHIP.md", "docs/adr/README.md", "docs/adr/TEMPLATE.md",
  "docs/adr/ADR-0001-platform-events.md", "docs/adr/ADR-0002-birdy-approval-model.md",
  "docs/adr/ADR-0003-protected-main.md", "docs/architecture/ENGINEERING_FOUNDATION.md",
  "app/admin/engineering/page.tsx", ".github/workflows/quality.yml"
];

const missing = [];
for (const file of requiredFiles) {
  try { await access(file); } catch { missing.push(file); }
}
if (missing.length) {
  console.error("Engineering Foundation verification failed.");
  missing.forEach((file) => console.error(`- Missing: ${file}`));
  process.exit(1);
}
const pkg = JSON.parse(await readFile("package.json", "utf8"));
for (const script of ["engineering:verify", "typecheck", "quality"]) {
  if (!pkg.scripts?.[script]) {
    console.error(`Missing package script: ${script}`);
    process.exit(1);
  }
}
console.log("Engineering Foundation v1.0 verification passed.");
