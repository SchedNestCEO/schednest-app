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

function getFutureDateValue(daysAhead = 35): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(
    2,
    "0",
  );
  const day = String(date.getDate()).padStart(
    2,
    "0",
  );

  return `${year}-${month}-${day}`;
}

function requestContainer(
  page: Page,
  note: string,
) {
  return page
    .getByText(note, {
      exact: true,
    })
    .locator(
      "xpath=ancestor::div[.//button[normalize-space()='View details'] and .//button[normalize-space()='Approve']][1]",
    );
}

async function createPendingBooking(
  page: Page,
): Promise<void> {
  await page.goto("/dashboard/bookings", {
    waitUntil: "domcontentloaded",
  });

  await expect(
    page.getByRole("heading", {
      name: "Manage your schedule.",
      level: 1,
    }),
  ).toBeVisible();

  const form = page
    .locator("form")
    .filter({
      has: page.getByRole("button", {
        name: "Create booking",
        exact: true,
      }),
    });

  if (!(await form.isVisible())) {
    await page
      .getByRole("button", {
        name: "Add booking",
        exact: true,
      })
      .click();
  }

  await expect(form).toBeVisible();

  const selects = form.locator("select");
  const customerSelect = selects.nth(0);
  const serviceSelect = selects.nth(1);
  const statusSelect = selects.nth(2);
  const sourceSelect = selects.nth(3);

  const customerOption =
    customerSelect.locator("option", {
      hasText: "Synthetic Customer A",
    });

  const serviceOption =
    serviceSelect.locator("option", {
      hasText: "Synthetic Consultation A",
    });

  await expect(customerOption).toHaveCount(1, {
    timeout: 20_000,
  });

  await expect(serviceOption).toHaveCount(1, {
    timeout: 20_000,
  });

  const customerValue =
    await customerOption.getAttribute("value");
  const serviceValue =
    await serviceOption.getAttribute("value");

  if (!customerValue || !serviceValue) {
    throw new Error(
      "Synthetic booking form options are missing values.",
    );
  }

  await customerSelect.selectOption(customerValue);
  await serviceSelect.selectOption(serviceValue);

  await form
    .locator('input[type="date"]')
    .fill(getFutureDateValue());

  await form
    .locator('input[type="time"]')
    .fill("11:23");

  await statusSelect.selectOption("pending");
  await sourceSelect.selectOption("booking_page");

  await form
    .getByPlaceholder(
      "Example: Customer asked for morning appointment.",
    )
    .fill(requestNote);

  await form
    .getByRole("button", {
      name: "Create booking",
      exact: true,
    })
    .click();

  await expect(
    page.getByText(requestNote, {
      exact: true,
    }),
  ).toBeVisible();
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
      await signIn(page, ownerA);
      await createPendingBooking(page);

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
