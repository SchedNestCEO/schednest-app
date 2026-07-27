import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "tests/integration/synthetic/**/*.synthetic.test.ts",
    ],
    exclude: [
      "node_modules/**",
      ".next/**",
      "playwright-report/**",
      "test-results/**",
    ],
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
