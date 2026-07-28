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

let uniqueBusinessName: string;
let uniqueSlug: string;
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
  "authenticated synthetic profile workflow",
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

      uniqueBusinessName =
        `Synthetic Profile Business ${suffix}`;

      uniqueSlug =
        `synthetic-profile-${suffix}`;

      uniqueDescription =
        `Synthetic public profile description ${suffix}`;

      uniqueEmail =
        `profile-${suffix}@schednest.test`;

      uniquePhone = "+15555550882";
    });

    test.afterAll(async () => {
      await cleanupSyntheticTestData();
    });

    test("Owner A can update and persist the business profile", async ({
      page,
    }) => {
      await signIn(page, ownerA);

      await page.goto("/dashboard/profile", {
        waitUntil: "domcontentloaded",
      });

      await expect(
        page.getByRole("heading", {
          name: "Manage your business identity.",
          level: 1,
        }),
      ).toBeVisible();

      const businessNameInput =
        page.getByPlaceholder(
          "Example: SchedNest Studio",
        );

      const slugInput =
        page.getByPlaceholder("schednest", {
          exact: true,
        });

      const descriptionInput =
        page.getByPlaceholder(
          "Tell customers what your business does, what you specialize in, or what they should expect.",
        );

      const contactEmailInput =
        page.getByPlaceholder(
          "business@example.com",
        );

      const contactPhoneInput =
        page.getByPlaceholder(
          "(555) 555-5555",
        );

      const timezoneSelect =
        page.getByRole("combobox").first();

      await expect(
        businessNameInput,
      ).not.toHaveValue("", {
        timeout: 20_000,
      });

      await businessNameInput.fill(
        uniqueBusinessName,
      );

      await slugInput.fill(uniqueSlug);

      await timezoneSelect.selectOption(
        "America/Denver",
      );

      await descriptionInput.fill(
        uniqueDescription,
      );

      await contactEmailInput.fill(
        uniqueEmail,
      );

      await contactPhoneInput.fill(
        uniquePhone,
      );

      await expect(
        page.getByText(
          `/book/${uniqueSlug}`,
          {
            exact: true,
          },
        ),
      ).toBeVisible();

      const saveButton =
        page.getByRole("button", {
          name: "Save Business Profile",
          exact: true,
        });

      await saveButton.click();

      await expect(
        saveButton,
      ).toBeEnabled({
        timeout: 20_000,
      });

      await page.reload({
        waitUntil: "domcontentloaded",
      });

      await expect(
        page.getByRole("heading", {
          name: "Manage your business identity.",
          level: 1,
        }),
      ).toBeVisible();

      await expect(
        businessNameInput,
      ).toHaveValue(
        uniqueBusinessName,
        {
          timeout: 20_000,
        },
      );

      await expect(
        slugInput,
      ).toHaveValue(uniqueSlug);

      await expect(
        timezoneSelect,
      ).toHaveValue("America/Denver");

      await expect(
        descriptionInput,
      ).toHaveValue(uniqueDescription);

      await expect(
        contactEmailInput,
      ).toHaveValue(uniqueEmail);

      await expect(
        contactPhoneInput,
      ).toHaveValue(uniquePhone);

      await expect(
        page.getByText(
          `/book/${uniqueSlug}`,
          {
            exact: true,
          },
        ),
      ).toBeVisible();
    });

    test("Owner B cannot see Owner A profile changes", async ({
      page,
    }) => {
      await signIn(page, ownerB);

      await page.goto("/dashboard/profile", {
        waitUntil: "domcontentloaded",
      });

      await expect(
        page.getByRole("heading", {
          name: "Manage your business identity.",
          level: 1,
        }),
      ).toBeVisible();

      const businessNameInput =
        page.getByPlaceholder(
          "Example: SchedNest Studio",
        );

      await expect(
        businessNameInput,
      ).toHaveValue(
        "SchedNest Synthetic Business B",
        {
          timeout: 20_000,
        },
      );

      await expect(
        businessNameInput,
      ).not.toHaveValue(uniqueBusinessName);

      await expect(
        page.getByPlaceholder("schednest", {
          exact: true,
        }),
      ).not.toHaveValue(uniqueSlug);

      await expect(
        page.getByPlaceholder(
          "Tell customers what your business does, what you specialize in, or what they should expect.",
        ),
      ).not.toHaveValue(uniqueDescription);

      await expect(
        page.getByPlaceholder(
          "business@example.com",
        ),
      ).not.toHaveValue(uniqueEmail);

      await expect(
        page.getByPlaceholder(
          "(555) 555-5555",
        ),
      ).not.toHaveValue(uniquePhone);

      await expect(
        page.getByText(
          `/book/${uniqueSlug}`,
          {
            exact: true,
          },
        ),
      ).toHaveCount(0);
    });
  },
);
