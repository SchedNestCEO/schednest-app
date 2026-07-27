import {
  expect,
  test,
  type Page,
} from "@playwright/test";
import {
  cleanupSyntheticTestData,
} from "../fixtures/cleanup";
import {
  requireSyntheticTestEnvironment,
} from "../fixtures/environment";
import {
  createSyntheticIdentitySet,
  type SyntheticIdentity,
} from "../fixtures/identities";
import {
  seedSyntheticTestData,
} from "../fixtures/seed";
import type {
  SyntheticTestManifest,
} from "../fixtures/manifest";

let manifest: SyntheticTestManifest;
let ownerA: SyntheticIdentity;
let ownerB: SyntheticIdentity;
let serviceName: string;

async function signIn(
  page: Page,
  identity: SyntheticIdentity,
): Promise<void> {
  await page.goto("/login");

  await page.getByLabel(/email/i).fill(identity.email);
  await page.getByLabel(/password/i).fill(identity.password);

  await page
    .getByRole("button", {
      name: /log in|sign in/i,
    })
    .click();

  await expect(page).toHaveURL(/\/dashboard(?:\/|$)/);
}

function serviceContainer(
  page: Page,
  name: string,
) {
  return page
    .getByRole("heading", {
      name,
      level: 3,
    })
    .locator(
      "xpath=ancestor::*[.//button[normalize-space()='Pause service' or normalize-space()='Reactivate']][1]",
    );
}

test.describe.serial(
  "authenticated synthetic service workflow",
  () => {
    test.beforeAll(async () => {
      const environment =
        requireSyntheticTestEnvironment();

      const identities =
        createSyntheticIdentitySet(
          environment.syntheticEmailDomain,
        );

      ownerA = identities["business-owner-a"];
      ownerB = identities["business-owner-b"];

      manifest = await seedSyntheticTestData();

      expect(manifest.tenants).toHaveLength(2);

      serviceName =
        `Playwright Service ${Date.now()}`;
    });

    test.afterAll(async () => {
      await cleanupSyntheticTestData();
    });

    test("Owner A can create, pause, and reactivate a service", async ({
      page,
    }) => {
      await signIn(page, ownerA);

      await page.goto("/dashboard/services", {
        waitUntil: "domcontentloaded",
      });

      await expect(
        page.getByRole("heading", {
          name: "Manage your service menu.",
          level: 1,
        }),
      ).toBeVisible();

      const addServiceButton = page.getByRole("button", {
        name: /service menu.*add a service.*expand/i,
      });

      await expect(addServiceButton).toBeVisible();
      await addServiceButton.click();

      const form = page
        .locator("form")
        .filter({
          has: page.getByPlaceholder(
            "Example: Haircut, Consultation, Mobile Detail",
          ),
        });

      await expect(form).toBeVisible();

      await form
        .getByPlaceholder(
          "Example: Haircut, Consultation, Mobile Detail",
        )
        .fill(serviceName);

      await form
        .getByPlaceholder(
          "Briefly describe what is included.",
        )
        .fill(
          "Synthetic service created by Sprint 7 browser coverage.",
        );

      const pricingType = form
        .locator("select")
        .first();

      await pricingType.selectOption("fixed");

      await form
        .getByPlaceholder("25.00")
        .fill("85");

      await form
        .getByPlaceholder(
          "Optional, example: 60",
        )
        .fill("60");

      await form
        .locator('button[type="submit"]')
        .click();

      await expect(
        page.getByRole("heading", {
          name: serviceName,
          level: 3,
        }),
      ).toBeVisible();

      let card = serviceContainer(
        page,
        serviceName,
      );

      await expect(
        card.getByRole("button", {
          name: "Pause service",
          exact: true,
        }),
      ).toBeVisible();

      await card
        .getByRole("button", {
          name: "Pause service",
          exact: true,
        })
        .click();

      card = serviceContainer(
        page,
        serviceName,
      );

      await expect(
        card.getByRole("button", {
          name: "Reactivate",
          exact: true,
        }),
      ).toBeVisible();

      await card
        .getByRole("button", {
          name: "Reactivate",
          exact: true,
        })
        .click();

      card = serviceContainer(
        page,
        serviceName,
      );

      await expect(
        card.getByRole("button", {
          name: "Pause service",
          exact: true,
        }),
      ).toBeVisible();
    });

    test("Owner B cannot see Owner A service", async ({
      page,
    }) => {
      await signIn(page, ownerB);

      await page.goto("/dashboard/services", {
        waitUntil: "domcontentloaded",
      });

      await expect(
        page.getByRole("heading", {
          name: "Manage your service menu.",
          level: 1,
        }),
      ).toBeVisible();

      await expect(
        page.getByRole("heading", {
          name: serviceName,
          level: 3,
        }),
      ).toHaveCount(0);
    });

    test("Owner A can remove the synthetic service", async ({
      page,
    }) => {
      await signIn(page, ownerA);

      await page.goto("/dashboard/services", {
        waitUntil: "domcontentloaded",
      });

      const card = serviceContainer(
        page,
        serviceName,
      );

      await expect(card).toBeVisible();

      page.once("dialog", async (dialog) => {
        expect(dialog.type()).toBe("confirm");
        expect(dialog.message()).toContain(
          serviceName,
        );
        await dialog.accept();
      });

      await card
        .getByRole("button", {
          name: "Delete service",
          exact: true,
        })
        .click();

      await expect(
        page.getByRole("heading", {
          name: serviceName,
          level: 3,
        }),
      ).toHaveCount(0);
    });
  },
);
