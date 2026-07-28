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

function billingSummary(page: Page) {
  return page
    .getByRole("heading", {
      name: "Account details",
      level: 2,
    })
    .locator("xpath=ancestor::div[1]");
}

test.describe.serial(
  "authenticated synthetic account workflow",
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
    });

    test.afterAll(async () => {
      await cleanupSyntheticTestData();
    });

    test("Owner A can review and refresh account details", async ({
      page,
    }) => {
      let stripeRequests = 0;

      page.on("request", (request) => {
        if (
          request.url().includes(
            "/api/stripe/",
          )
        ) {
          stripeRequests += 1;
        }
      });

      await signIn(page, ownerA);

      await page.goto("/dashboard/account", {
        waitUntil: "domcontentloaded",
      });

      await expect(
        page.getByRole("heading", {
          name: "Manage your account and billing.",
          level: 1,
        }),
      ).toBeVisible();

      await expect(
        page.getByText("Subscription", {
          exact: true,
        }).first(),
      ).toBeVisible();

      await expect(
        page.getByRole("heading", {
          name: "Account details",
          level: 2,
        }),
      ).toBeVisible();

      const summary = billingSummary(page);

      await expect(
        summary.getByText(
          "SchedNest Synthetic Business A",
          {
            exact: true,
          },
        ),
      ).toBeVisible({
        timeout: 20_000,
      });

      await expect(
        page.getByRole("heading", {
          name: "Choose the level that fits the business.",
          level: 2,
        }),
      ).toBeVisible();

      await expect(
        page.getByRole("heading", {
          name: "Billing automation status",
          level: 3,
        }),
      ).toBeVisible();

      await expect(
        page.getByRole("heading", {
          name: "Stripe connection status",
          level: 3,
        }),
      ).toBeVisible();

      await expect(
        page.getByRole("link", {
          name: "Email billing",
          exact: true,
        }),
      ).toHaveAttribute(
        "href",
        "mailto:billing@schednest.com",
      );

      await page
        .getByRole("button", {
          name: "Refresh account",
          exact: true,
        })
        .click();

      await expect(
        summary.getByText(
          "SchedNest Synthetic Business A",
          {
            exact: true,
          },
        ),
      ).toBeVisible({
        timeout: 20_000,
      });

      expect(stripeRequests).toBe(0);
    });

    test("Owner B cannot see Owner A account details", async ({
      page,
    }) => {
      let stripeRequests = 0;

      page.on("request", (request) => {
        if (
          request.url().includes(
            "/api/stripe/",
          )
        ) {
          stripeRequests += 1;
        }
      });

      await signIn(page, ownerB);

      await page.goto("/dashboard/account", {
        waitUntil: "domcontentloaded",
      });

      await expect(
        page.getByRole("heading", {
          name: "Manage your account and billing.",
          level: 1,
        }),
      ).toBeVisible();

      const summary = billingSummary(page);

      await expect(
        summary.getByText(
          "SchedNest Synthetic Business B",
          {
            exact: true,
          },
        ),
      ).toBeVisible({
        timeout: 20_000,
      });

      await expect(
        page.getByText(
          "SchedNest Synthetic Business A",
          {
            exact: true,
          },
        ),
      ).toHaveCount(0);

      expect(stripeRequests).toBe(0);
    });
  },
);
