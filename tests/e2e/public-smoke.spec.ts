import { expect, test } from "@playwright/test";
import criticalRoutes from "../../.engineering/critical-routes.json";

for (const path of criticalRoutes.publicSmokePaths) {
  test(`public route ${path} renders successfully`, async ({ page }) => {
    const response = await page.goto(path, {
      waitUntil: "domcontentloaded",
    });

    expect(response, `${path} should return a browser response`).not.toBeNull();
    expect(
      response?.status(),
      `${path} should return a successful HTTP status`
    ).toBeLessThan(400);

    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText("Application error", { exact: false })).toHaveCount(0);
    await expect(page.getByText("Internal Server Error", { exact: false })).toHaveCount(0);
  });
}
