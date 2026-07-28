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
let requestNote: string;

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

function requestContainer(
  page: Page,
  note: string,
): Locator {
  return page
    .getByText(note, {
      exact: true,
    })
    .locator(
      "xpath=ancestor::div[.//button[normalize-space()='View details'] and .//button[normalize-space()='Approve']][1]",
    );
}

test.describe.serial(
  "authenticated synthetic request workflow",
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

      requestNote =
        `schednest-sprint7-request-${Date.now()}`;
    });

    test.afterAll(async () => {
      await cleanupSyntheticTestData();
    });

    test("Owner A can approve a pending request", async ({
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
        note: requestNote,
      });

      await signIn(page, ownerA);

      await page.goto("/dashboard/requests", {
        waitUntil: "domcontentloaded",
      });

      await expect(
        page.getByRole("heading", {
          name: "Review booking requests.",
          level: 1,
        }),
      ).toBeVisible();

      const card = requestContainer(
        page,
        requestNote,
      );

      await expect(card).toBeVisible();

      await expect(
        card.getByText("Pending", {
          exact: true,
        }),
      ).toBeVisible();

      await card
        .getByRole("button", {
          name: "Approve",
          exact: true,
        })
        .click();

      await expect(
        page.getByText(requestNote, {
          exact: true,
        }),
      ).toHaveCount(0);
    });

    test("Owner B cannot see Owner A request", async ({
      page,
    }) => {
      await signIn(page, ownerB);

      await page.goto("/dashboard/requests", {
        waitUntil: "domcontentloaded",
      });

      await expect(
        page.getByRole("heading", {
          name: "Review booking requests.",
          level: 1,
        }),
      ).toBeVisible();

      await expect(
        page.getByText(requestNote, {
          exact: true,
        }),
      ).toHaveCount(0);
    });
  },
);
