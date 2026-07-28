import {
  expect,
  test,
  type Locator,
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
import {
  seedSyntheticPendingBooking,
} from "../fixtures/bookings";
import type {
  SyntheticTestManifest,
} from "../fixtures/manifest";

let manifest: SyntheticTestManifest;
let ownerA: SyntheticIdentity;
let ownerB: SyntheticIdentity;
let uniqueNote: string;

async function signIn(
  page: Page,
  identity: SyntheticIdentity,
): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "schednest-setup-guide-dismissed",
      "true",
    );
  });

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

function metricCard(
  page: Page,
  href: string,
  label: string,
): Locator {
  return page
    .locator(`main a[href="${href}"]`)
    .filter({
      has: page.locator("p").filter({
        hasText: new RegExp(`^${label}$`),
      }),
    })
    .first();
}

test.describe.serial(
  "authenticated synthetic dashboard workflow",
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

      uniqueNote =
        `Synthetic dashboard request ${Date.now()}`;
    });

    test.afterAll(async () => {
      await cleanupSyntheticTestData();
    });

    test("Owner A dashboard shows tenant-scoped metrics and navigation", async ({
      page,
    }) => {
      const tenantA = manifest.tenants.find(
        ({ actor }) => actor === "business-owner-a",
      );

      if (!tenantA) {
        throw new Error("Synthetic tenant A is missing.");
      }

      await seedSyntheticPendingBooking({
        tenant: tenantA,
        note: uniqueNote,
      });

      await signIn(page, ownerA);

      await page.goto("/dashboard", {
        waitUntil: "domcontentloaded",
      });

      await expect(
        page.getByRole("heading", {
          name: "You have requests waiting.",
          level: 1,
        }),
      ).toBeVisible({
        timeout: 20_000,
      });

      const pendingCard = metricCard(
        page,
        "/dashboard/requests",
        "Pending Requests",
      );

      const customerCard = metricCard(
        page,
        "/dashboard/customers",
        "Customers",
      );

      const servicesCard = metricCard(
        page,
        "/dashboard/services",
        "Active Services",
      );

      await expect(
        pendingCard.locator("p").nth(1),
      ).toHaveText("1");

      await expect(
        customerCard.locator("p").nth(1),
      ).toHaveText("1");

      await expect(
        servicesCard.locator("p").nth(1),
      ).toHaveText("1");

      await expect(
        page.getByRole("link", {
          name: "Review 1 request",
          exact: true,
        }),
      ).toHaveAttribute(
        "href",
        "/dashboard/requests",
      );

      await expect(
        page.getByRole("link", {
          name: "Open settings",
          exact: true,
        }),
      ).toHaveAttribute(
        "href",
        "/dashboard/settings",
      );

      await expect(
        page.getByRole("link", {
          name: /manage account/i,
        }),
      ).toHaveAttribute(
        "href",
        "/dashboard/account",
      );

      await page
        .getByRole("button", {
          name: "Refresh",
          exact: true,
        })
        .click();

      await expect(
        pendingCard.locator("p").nth(1),
      ).toHaveText("1", {
        timeout: 20_000,
      });
    });

    test("Owner B cannot see Owner A pending-request metric", async ({
      page,
    }) => {
      await signIn(page, ownerB);

      await page.goto("/dashboard", {
        waitUntil: "domcontentloaded",
      });

      const pendingCard = metricCard(
        page,
        "/dashboard/requests",
        "Pending Requests",
      );

      await expect(
        pendingCard.locator("p").nth(1),
      ).toHaveText("0", {
        timeout: 20_000,
      });

      await expect(
        page.getByRole("heading", {
          name: "You have requests waiting.",
          level: 1,
        }),
      ).toHaveCount(0);

      await expect(
        page.getByRole("link", {
          name: "Review 1 request",
          exact: true,
        }),
      ).toHaveCount(0);

      await expect(
        page.getByText(uniqueNote, {
          exact: true,
        }),
      ).toHaveCount(0);
    });
  },
);
