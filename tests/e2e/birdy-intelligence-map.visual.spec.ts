import { expect, test } from "@playwright/test";

test.use({
  viewport: {
    width: 1280,
    height: 720,
  },
});

test("Birdy Intelligence Map preserves the approved resting composition", async ({
  page,
}) => {
  await page.emulateMedia({
    reducedMotion: "reduce",
  });

  await page.goto("/birdy/intelligence-map", {
    waitUntil: "networkidle",
  });

  const referenceImage = page.getByRole("img", {
    name: "Birdy Intelligence Map",
  });

  await expect(referenceImage).toBeVisible();

  await referenceImage.evaluate((element) => {
    const image = element as HTMLImageElement;

    if (image.complete && image.naturalWidth > 0) {
      return;
    }

    return new Promise<void>((resolve, reject) => {
      image.addEventListener("load", () => resolve(), {
        once: true,
      });

      image.addEventListener(
        "error",
        () =>
          reject(
            new Error("Birdy Intelligence Map reference image failed to load."),
          ),
        {
          once: true,
        },
      );
    });
  });

  await expect(page).toHaveScreenshot("birdy-intelligence-map-desktop.png", {
    animations: "disabled",
    caret: "hide",
    fullPage: false,
    maxDiffPixelRatio: 0.001,
  });
});
