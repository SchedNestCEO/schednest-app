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
let bookingNote: string;

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

function bookingContainer(
  page: Page,
  note: string,
) {
  return page
    .getByText(note, {
      exact: true,
    })
    .locator(
      "xpath=ancestor::div[.//h4 and .//button[normalize-space()='Complete']][1]",
    );
}

test.describe.serial(
  "authenticated synthetic booking workflow",
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

      bookingNote =
        `schednest-sprint7-booking-${Date.now()}`;
    });

    test.afterAll(async () => {
      await cleanupSyntheticTestData();
    });

    test("Owner A can create and complete a manual booking", async ({
      page,
    }) => {
      await signIn(page, ownerA);

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
        const addBookingButton = page.getByRole(
          "button",
          {
            name: "Add booking",
            exact: true,
          },
        );

        await expect(addBookingButton).toBeVisible();
        await addBookingButton.click();
      }

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

      const bookingDate =
        new Date();

      bookingDate.setDate(
        bookingDate.getDate() + 7,
      );

      while (
        bookingDate.getDay() === 0 ||
        bookingDate.getDay() === 6
      ) {
        bookingDate.setDate(
          bookingDate.getDate() + 1,
        );
      }

      await form
        .locator('input[type="date"]')
        .fill(
          bookingDate
            .toISOString()
            .slice(0, 10),
        );

      await form
        .locator('input[type="time"]')
        .fill("10:00");

      const statusSelect = selects.nth(2);
      const sourceSelect = selects.nth(3);

      await statusSelect.selectOption(
        "confirmed",
      );
      await sourceSelect.selectOption(
        "manual",
      );

      await form
        .getByPlaceholder(
          "Example: Customer asked for morning appointment.",
        )
        .fill(bookingNote);

      await form
        .getByRole("button", {
          name: "Create booking",
          exact: true,
        })
        .click();

      let card = bookingContainer(
        page,
        bookingNote,
      );

      await expect(card).toBeVisible();

      await expect(
        card.getByText("Confirmed", {
          exact: true,
        }),
      ).toBeVisible();

      await card
        .getByRole("button", {
          name: "Complete",
          exact: true,
        })
        .click();

      card = bookingContainer(
        page,
        bookingNote,
      );

      await expect(
        card.getByText("Completed", {
          exact: true,
        }),
      ).toBeVisible();
    });

    test("Owner B cannot see Owner A booking", async ({
      page,
    }) => {
      await signIn(page, ownerB);

      await page.goto("/dashboard/bookings", {
        waitUntil: "domcontentloaded",
      });

      await expect(
        page.getByRole("heading", {
          name: "Manage your schedule.",
          level: 1,
        }),
      ).toBeVisible();

      await expect(
        page.getByText(bookingNote, {
          exact: true,
        }),
      ).toHaveCount(0);
    });
  },
);
