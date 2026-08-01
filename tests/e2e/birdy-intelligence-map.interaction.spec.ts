import { expect, test } from "@playwright/test";

test("Birdy intelligence modules open and close accessibly", async ({
  page,
}) => {
  await page.goto("/birdy/intelligence-map", {
    waitUntil: "networkidle",
  });

  const memoryCluster = page.getByRole("button", {
    name: "Open Memory Cluster",
  });

  await expect(memoryCluster).toBeAttached();

  await memoryCluster.click();

  const dialog = page.getByRole("dialog");

  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", {
      name: "Memory Cluster",
    }),
  ).toBeVisible();

  await expect(memoryCluster).toHaveAttribute("aria-pressed", "true");

  await page.keyboard.press("Escape");

  await expect(dialog).toBeHidden();
  await expect(memoryCluster).toHaveAttribute("aria-pressed", "false");
});

test("all Birdy intelligence modules are exposed as controls", async ({
  page,
}) => {
  await page.goto("/birdy/intelligence-map", {
    waitUntil: "networkidle",
  });

  const labels = [
    "Memory Cluster",
    "Strategic Goals",
    "People Network",
    "Project Nexus",
    "Knowledge Base",
    "Decision Pathways",
    "Activity Stream",
    "Routing Traces",
    "Birdy Confidence",
  ];

  for (const label of labels) {
    await expect(
      page.getByRole("button", {
        name: `Open ${label}`,
      }),
    ).toBeAttached();
  }
});
