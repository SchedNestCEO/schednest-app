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
let questionLabel: string;

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

function questionContainer(
  page: Page,
  label: string,
) {
  return page
    .getByText(label, {
      exact: true,
    })
    .locator(
      "xpath=ancestor::div[.//button[normalize-space()='Pause' or normalize-space()='Reactivate'] and .//button[normalize-space()='Remove']][1]",
    );
}

test.describe.serial(
  "authenticated synthetic booking-page workflow",
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

      questionLabel =
        `Synthetic intake question ${Date.now()}`;
    });

    test.afterAll(async () => {
      await cleanupSyntheticTestData();
    });

    test("Owner A can update booking mode and manage an intake question", async ({
      page,
    }) => {
      const tenantA = manifest.tenants.find(
        ({ actor }) =>
          actor === "business-owner-a",
      );

      if (!tenantA) {
        throw new Error(
          "Synthetic Tenant A manifest is missing.",
        );
      }

      await signIn(page, ownerA);

      await page.goto("/dashboard/booking-page", {
        waitUntil: "domcontentloaded",
      });

      await expect(
        page.getByRole("heading", {
          name: "Control how customers request time.",
          level: 1,
        }),
      ).toBeVisible();

      await expect(
        page.getByText(
          new RegExp(
            `/book/${tenantA.bookingSlug}$`,
          ),
        ),
      ).toBeVisible();

      const flexibleModeButton =
        page.getByRole("button", {
          name: /flexible appointment requests/i,
        });

      await expect(
        flexibleModeButton,
      ).toBeVisible();

      await flexibleModeButton.click();

      await page
        .getByRole("button", {
          name: "Save Booking Mode",
          exact: true,
        })
        .click();

      await expect(
        page.getByText(
          "Booking page settings saved.",
          {
            exact: true,
          },
        ),
      ).toBeVisible();

      const questionInput =
        page.getByPlaceholder(
          "Example: What is the service address?",
        );

      await expect(questionInput).toBeVisible();
      await questionInput.fill(questionLabel);

      const questionSection = page
        .getByRole("heading", {
          name: "Ask customers for the details you need.",
          level: 2,
        })
        .locator("xpath=ancestor::section[1]");

      const selects =
        questionSection.locator("select");

      await selects.nth(0).selectOption(
        "short_text",
      );
      await selects.nth(1).selectOption(
        "all",
      );

      await questionSection
        .getByText("Required", {
          exact: true,
        })
        .locator("input")
        .check();

      await questionSection
        .getByRole("button", {
          name: "Add question",
          exact: true,
        })
        .click();

      let card = questionContainer(
        page,
        questionLabel,
      );

      await expect(card).toBeVisible();

      await expect(
        card.getByText("Active", {
          exact: true,
        }),
      ).toBeVisible();

      await card
        .getByRole("button", {
          name: "Pause",
          exact: true,
        })
        .click();

      card = questionContainer(
        page,
        questionLabel,
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

      card = questionContainer(
        page,
        questionLabel,
      );

      await expect(
        card.getByRole("button", {
          name: "Pause",
          exact: true,
        }),
      ).toBeVisible();
    });

    test("Owner B cannot see Owner A intake question", async ({
      page,
    }) => {
      await signIn(page, ownerB);

      await page.goto("/dashboard/booking-page", {
        waitUntil: "domcontentloaded",
      });

      await expect(
        page.getByRole("heading", {
          name: "Control how customers request time.",
          level: 1,
        }),
      ).toBeVisible();

      await expect(
        page.getByText(questionLabel, {
          exact: true,
        }),
      ).toHaveCount(0);
    });

    test("Owner A can remove the synthetic intake question", async ({
      page,
    }) => {
      await signIn(page, ownerA);

      await page.goto("/dashboard/booking-page", {
        waitUntil: "domcontentloaded",
      });

      const card = questionContainer(
        page,
        questionLabel,
      );

      await expect(card).toBeVisible();

      page.once("dialog", async (dialog) => {
        expect(dialog.type()).toBe("confirm");
        expect(dialog.message()).toContain(
          questionLabel,
        );
        await dialog.accept();
      });

      await card
        .getByRole("button", {
          name: "Remove",
          exact: true,
        })
        .click();

      await expect(
        page.getByText(questionLabel, {
          exact: true,
        }),
      ).toHaveCount(0);
    });
  },
);
