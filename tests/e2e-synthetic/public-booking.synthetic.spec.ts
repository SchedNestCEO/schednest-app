import {
  expect,
  test,
  type Page,
} from "@playwright/test";
import {
  cleanupSyntheticTestData,
  assertSyntheticManifestIsComplete,
} from "../fixtures/cleanup";
import {
  requireSyntheticTestEnvironment,
} from "../fixtures/environment";
import {
  SYNTHETIC_MARKER,
  createSyntheticIdentitySet,
} from "../fixtures/identities";
import {
  seedSyntheticTestData,
} from "../fixtures/seed";
import {
  createSyntheticSupabaseClients,
} from "../fixtures/supabase";
import type {
  SyntheticTenantManifest,
  SyntheticTestManifest,
} from "../fixtures/manifest";

let manifest: SyntheticTestManifest;
let tenantA: SyntheticTenantManifest;
let tenantB: SyntheticTenantManifest;

function nextOpenWeekday(daysAhead = 7): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);

  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

async function chooseFirstAvailableTime(page: Page): Promise<void> {
  const timeSelect = page.locator("select").filter({
    has: page.locator("option"),
  }).last();

  await expect(timeSelect).toBeEnabled({
    timeout: 20_000,
  });

  await expect
    .poll(async () => {
      return timeSelect.locator("option").count();
    })
    .toBeGreaterThan(1);

  const availableValue = await timeSelect
    .locator("option")
    .evaluateAll((elements) => {
      const options =
        elements as HTMLOptionElement[];

      const match = options.find(
        (option) =>
          option.value &&
          !option.disabled,
      );

      return match?.value || "";
    });

  expect(availableValue).not.toBe("");

  await timeSelect.selectOption(availableValue);
}

test.describe.serial(
  "public synthetic booking workflow",
  () => {
    test.beforeAll(async () => {
      requireSyntheticTestEnvironment();

      manifest = await seedSyntheticTestData();
      assertSyntheticManifestIsComplete(manifest);

      tenantA = manifest.tenants.find(
        ({ actor }) => actor === "business-owner-a",
      )!;
      tenantB = manifest.tenants.find(
        ({ actor }) => actor === "business-owner-b",
      )!;

      expect(tenantA).toBeTruthy();
      expect(tenantB).toBeTruthy();
    });

    test.afterAll(async () => {
      await cleanupSyntheticTestData();
    });

    test(
      "Owner A public page exposes only Owner A tenant data",
      async ({ page }) => {
        await page.goto(`/book/${tenantA.bookingSlug}`, {
          waitUntil: "domcontentloaded",
        });

        await expect(
          page.getByRole("heading", {
            name: "Book with SchedNest Synthetic Business A",
            level: 1,
          }),
        ).toBeVisible({
          timeout: 20_000,
        });

        await expect(
          page.getByText(
            "Synthetic Consultation A",
            {
              exact: true,
            },
          ).first(),
        ).toBeVisible();

        await expect(
          page.getByText(
            "SchedNest Synthetic Business B",
            {
              exact: true,
            },
          ),
        ).toHaveCount(0);

        await expect(
          page.getByText(
            "Synthetic Consultation B",
            {
              exact: true,
            },
          ),
        ).toHaveCount(0);
      },
    );

    test(
      "unknown public booking slug displays an unavailable state",
      async ({ page }) => {
        await page.goto(
          `/book/${SYNTHETIC_MARKER}-missing-page`,
          {
            waitUntil: "domcontentloaded",
          },
        );

        await expect(
          page.getByText(
            /booking page not found/i,
          ),
        ).toBeVisible({
          timeout: 20_000,
        });
      },
    );

    test(
      "public customer can submit a tenant-scoped pending request",
      async ({ page }) => {
        const environment =
          requireSyntheticTestEnvironment();

        const identities =
          createSyntheticIdentitySet(
            environment.syntheticEmailDomain,
          );

        const customer =
          identities["public-customer-a"];

        const bookingNote =
          `${SYNTHETIC_MARKER}-public-booking-${Date.now()}`;

        await page.route(
          "**/api/booking-notifications",
          async (route) => {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({
                ok: true,
                intercepted: true,
              }),
            });
          },
        );

        await page.goto(`/book/${tenantA.bookingSlug}`, {
          waitUntil: "domcontentloaded",
        });

        await expect(
          page.getByText(
            "Synthetic Consultation A",
            {
              exact: true,
            },
          ).first(),
        ).toBeVisible({
          timeout: 20_000,
        });

        await page
          .getByPlaceholder("Your full name")
          .fill("Synthetic Public Customer A");

        await page
          .getByPlaceholder("Email address")
          .fill(customer.email);

        await page
          .locator('input[type="date"]')
          .fill(nextOpenWeekday());

        await chooseFirstAvailableTime(page);

        await page
          .getByPlaceholder(
            "Anything the business should know?",
          )
          .fill(bookingNote);

        await page
          .getByRole("button", {
            name: /send booking request/i,
          })
          .click();

        await expect(
          page.getByText(
            "Request Received",
            {
              exact: true,
            },
          ),
        ).toBeVisible({
          timeout: 30_000,
        });

        await expect(
          page.getByText(
            bookingNote,
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        const { admin } =
          createSyntheticSupabaseClients();

        await expect
          .poll(
            async () => {
              const { data, error } = await admin
                .from("bookings")
                .select(
                  "id, business_id, owner_id, service_id, status, notes",
                )
                .eq("business_id", tenantA.businessId)
                .eq("notes", bookingNote)
                .maybeSingle();

              if (error) {
                throw new Error(error.message);
              }

              return data;
            },
            {
              timeout: 20_000,
            },
          )
          .toMatchObject({
            business_id: tenantA.businessId,
            owner_id: tenantA.userId,
            service_id: tenantA.serviceId,
            status: "pending",
            notes: bookingNote,
          });

        const { data: crossTenantBooking, error } =
          await admin
            .from("bookings")
            .select("id")
            .eq("business_id", tenantB.businessId)
            .eq("notes", bookingNote)
            .maybeSingle();

        expect(error).toBeNull();
        expect(crossTenantBooking).toBeNull();
      },
    );
  },
);
