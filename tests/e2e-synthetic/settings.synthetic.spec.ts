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
let uniqueDescription: string;
let uniqueEmail: string;
let uniquePhone: string;

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

test.describe.serial(
  "authenticated synthetic settings workflow",
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

      const suffix = Date.now();

      uniqueDescription =
        `Synthetic settings description ${suffix}`;

      uniqueEmail =
        `settings-${suffix}@schednest.test`;

      uniquePhone = "+15555550991";
    });

    test.afterAll(async () => {
      await cleanupSyntheticTestData();
    });

    test("Owner A can update and persist business settings", async ({
      page,
    }) => {
      await signIn(page, ownerA);

      await page.goto("/dashboard/settings", {
        waitUntil: "domcontentloaded",
      });

      await expect(
        page.getByRole("heading", {
          name: "Manage your SchedNest settings.",
          level: 1,
        }),
      ).toBeVisible();

      const businessNameInput =
        page.getByPlaceholder("SchedNest LLC");

      const timezoneInput =
        page.getByPlaceholder(
          "America/Los_Angeles",
        );

      const contactEmailInput =
        page.getByPlaceholder(
          "hello@schednest.com",
        );

      const contactPhoneInput =
        page.getByPlaceholder(
          "(555) 555-5555",
        );

      const descriptionInput =
        page.getByPlaceholder(
          "Describe what your business offers and who you help.",
        );

      await expect(
        businessNameInput,
      ).toHaveValue(
        "SchedNest Synthetic Business A",
        {
          timeout: 20_000,
        },
      );

      await timezoneInput.fill(
        "America/Los_Angeles",
      );

      await contactEmailInput.fill(
        uniqueEmail,
      );

      await contactPhoneInput.fill(
        uniquePhone,
      );

      await descriptionInput.fill(
        uniqueDescription,
      );

      await page
        .getByRole("button", {
          name: "Save business info",
          exact: true,
        })
        .click();

      await expect(
        page.getByText(
          "Business settings saved.",
          {
            exact: true,
          },
        ),
      ).toBeVisible();

      await page.reload({
        waitUntil: "domcontentloaded",
      });

      await expect(
        page.getByRole("heading", {
          name: "Manage your SchedNest settings.",
          level: 1,
        }),
      ).toBeVisible();

      await expect(
        contactEmailInput,
      ).toHaveValue(uniqueEmail, {
        timeout: 20_000,
      });

      await expect(
        contactPhoneInput,
      ).toHaveValue(uniquePhone);

      await expect(
        descriptionInput,
      ).toHaveValue(uniqueDescription);

      await expect(
        timezoneInput,
      ).toHaveValue(
        "America/Los_Angeles",
      );
    });

    test("Owner B cannot see Owner A business settings", async ({
      page,
    }) => {
      await signIn(page, ownerB);

      await page.goto("/dashboard/settings", {
        waitUntil: "domcontentloaded",
      });

      await expect(
        page.getByRole("heading", {
          name: "Manage your SchedNest settings.",
          level: 1,
        }),
      ).toBeVisible();

      await expect(
        page.getByPlaceholder(
          "SchedNest LLC",
        ),
      ).toHaveValue(
        "SchedNest Synthetic Business B",
        {
          timeout: 20_000,
        },
      );

      await expect(
        page.getByText(uniqueDescription, {
          exact: true,
        }),
      ).toHaveCount(0);

      await expect(
        page.getByPlaceholder(
          "hello@schednest.com",
        ),
      ).not.toHaveValue(uniqueEmail);

      await expect(
        page.getByPlaceholder(
          "(555) 555-5555",
        ),
      ).not.toHaveValue(uniquePhone);
    });
  },
);
