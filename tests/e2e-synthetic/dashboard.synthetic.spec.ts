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

function futureDate(daysAhead = 35): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
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

async function createPendingBooking(
  page: Page,
): Promise<void> {
  await page.goto("/dashboard/bookings", {
    waitUntil: "domcontentloaded",
  });

  const addButton = page.getByRole("button", {
    name: /add booking|new booking|create booking/i,
  });

  await expect(addButton).toBeVisible({
    timeout: 20_000,
  });
  await addButton.click();

  const form = page.locator("form").filter({
    has: page.getByRole("button", {
      name: /save booking|create booking/i,
    }),
  });

  await expect(form).toBeVisible();

  const selects = form.locator("select");

  const customerSelect = selects.nth(0);
  const serviceSelect = selects.nth(1);

  const syntheticCustomerOption =
    customerSelect.locator("option", {
      hasText: "Synthetic Customer A",
    });

  const syntheticServiceOption =
    serviceSelect.locator("option", {
      hasText: "Synthetic Consultation A",
    });

  await expect(
    syntheticCustomerOption,
  ).toHaveCount(1, {
    timeout: 20_000,
  });

  await expect(
    syntheticServiceOption,
  ).toHaveCount(1, {
    timeout: 20_000,
  });

  const customerValue =
    await syntheticCustomerOption.getAttribute(
      "value",
    );

  const serviceValue =
    await syntheticServiceOption.getAttribute(
      "value",
    );

  if (!customerValue || !serviceValue) {
    throw new Error(
      "Synthetic customer or service option is missing a value.",
    );
  }

  await customerSelect.selectOption(
    customerValue,
  );

  await serviceSelect.selectOption(
    serviceValue,
  );

  await form
    .locator('input[type="date"]')
    .fill(futureDate());

  await form
    .locator('input[type="time"]')
    .fill("13:17");

  await selects.nth(2).selectOption("pending");
  await selects.nth(3).selectOption("booking_page");

  await form
    .getByPlaceholder(
      "Example: Customer asked for morning appointment.",
    )
    .fill(uniqueNote);

  await form
    .getByRole("button", {
      name: "Create booking",
      exact: true,
    })
    .click();

  await expect(
    page.getByText(uniqueNote, {
      exact: true,
    }),
  ).toBeVisible({
    timeout: 20_000,
  });

  // Confirm the pending booking is readable through the same
  // tenant-scoped query used by the requests workflow before
  // asserting the dashboard aggregate.
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
    page.getByText(uniqueNote, {
      exact: true,
    }),
  ).toBeVisible({
    timeout: 20_000,
  });
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
      await signIn(page, ownerA);
      await createPendingBooking(page);

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
