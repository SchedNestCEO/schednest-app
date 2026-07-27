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

function customerContainer(
  page: Page,
  customerName: string,
) {
  return page
    .getByText(customerName, { exact: true })
    .locator(
      "xpath=ancestor::*[.//button[normalize-space()='Archive' or normalize-space()='Restore' or normalize-space()='Block']][1]",
    );
}

test.describe.serial(
  "authenticated synthetic customer workflow",
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

    test("Owner A can add, search, archive, and restore a customer", async ({
      page,
    }) => {
      const uniqueSuffix = Date.now();
      const customerName =
        `Playwright Customer ${uniqueSuffix}`;
      const customerEmail =
        `playwright-${uniqueSuffix}@schednest.test`;

      await signIn(page, ownerA);
      await page.goto("/dashboard/customers", {
        waitUntil: "domcontentloaded",
      });

      console.log("Customers page URL:", page.url());
      console.log("Customers page title:", await page.title());

      await expect(page).toHaveURL(/\/dashboard\/customers\/?$/);

      await expect(
        page.getByText("Verifying your account...", {
          exact: true,
        }),
      ).toHaveCount(0, {
        timeout: 20_000,
      });

      await expect(
        page.getByRole("heading", {
          name: "Manage your customer base.",
          level: 1,
        }),
      ).toBeVisible();

      const addCustomerButton = page.getByRole(
        "button",
        {
          name: /add customer/i,
        },
      );

      if (await addCustomerButton.isVisible()) {
        await addCustomerButton.click();
      }

      const form = page
        .locator("form")
        .filter({
          has: page.getByPlaceholder(
            "Customer name",
          ),
        });

      await expect(form).toBeVisible();

      await form
        .getByPlaceholder("Customer name")
        .fill(customerName);

      await form
        .getByPlaceholder(
          "customer@example.com",
        )
        .fill(customerEmail);

      await form
        .getByPlaceholder("Phone number")
        .fill("+15555550177");

      await form
        .getByPlaceholder("Optional note")
        .fill(
          "schednest-sprint7-synthetic browser test",
        );

      await form
        .locator('button[type="submit"]')
        .click();

      const search = page.getByPlaceholder(
        "Search by name, email, phone, notes, or status...",
      );

      await expect(search).toBeVisible();
      await search.fill(customerEmail);

      await expect(
        page.getByRole("heading", {
          name: customerName,
          level: 3,
        }),
      ).toBeVisible();

      const activeCustomer =
        customerContainer(page, customerName);

      await activeCustomer
        .getByRole("button", {
          name: "Archive",
          exact: true,
        })
        .click();

      await expect(
        page.getByText(customerName, {
          exact: true,
        }),
      ).toHaveCount(0);

      const statusFilter = page
        .locator("select")
        .filter({
          has: page.locator(
            'option[value="archived"]',
          ),
        });

      await statusFilter.selectOption("archived");

      await expect(
        page.getByText(customerName, {
          exact: true,
        }),
      ).toBeVisible();

      const archivedCustomer =
        customerContainer(page, customerName);

      await archivedCustomer
        .getByRole("button", {
          name: "Restore",
          exact: true,
        })
        .click();

      await statusFilter.selectOption("active");

      await expect(
        page.getByText(customerName, {
          exact: true,
        }),
      ).toBeVisible();
    });

    test("Owner B cannot see Owner A customer records", async ({
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

      await signIn(page, ownerB);
      await page.goto("/dashboard/customers");

      const search = page.getByPlaceholder(
        "Search by name, email, phone, notes, or status...",
      );

      await search.fill(tenantA.email);

      await expect(
        page.getByText(tenantA.email, {
          exact: false,
        }),
      ).toHaveCount(0);
    });
  },
);
