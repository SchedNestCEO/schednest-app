import {
  expect,
  test,
  type Page,
} from "@playwright/test";
import {
  cleanupSyntheticPlatformAdmin,
  seedSyntheticPlatformAdmin,
  type SyntheticPlatformAdmin,
} from "../fixtures/admin";
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
  createAuthenticatedSyntheticClient,
  createSyntheticSupabaseClients,
} from "../fixtures/supabase";

const LIVE_DESCRIPTION =
  "Synthetic live founder architecture review";

const MANUAL_DESCRIPTION =
  "Synthetic offline durability planning";

const REVENUE_CLIENTS = {
  estimated: "Synthetic Estimated Client",
  confirmed: "Synthetic Confirmed Client",
  verified: "Synthetic Verified Client",
} as const;

let platformAdmin: SyntheticPlatformAdmin;
let businessOwner: SyntheticIdentity;
let businessOwnerUserId: string;

async function signIn(
  page: Page,
  identity: SyntheticIdentity,
): Promise<void> {
  await page.context().clearCookies();
  await page.goto("/login");

  await page
    .getByLabel(/email/i)
    .fill(identity.email);

  await page
    .getByLabel(/password/i)
    .fill(identity.password);

  await page
    .getByRole("button", {
      name: /log in|sign in/i,
    })
    .click();

  await expect(page).toHaveURL(
    /\/dashboard(?:\/|$)/,
  );
}

function sectionWithHeading(
  page: Page,
  heading: string,
) {
  return page
    .getByRole("heading", {
      name: heading,
    })
    .locator("xpath=ancestor::section[1]");
}

async function addRevenueImpact(
  page: Page,
  input: {
    clientName: string;
    missed: string;
    increased: string;
    evidence:
      | "estimated"
      | "client_confirmed"
      | "verified";
    source:
      | "manual"
      | "appointment_analysis"
      | "client_report"
      | "integration";
    periodStart: string;
    periodEnd: string;
    notes: string;
  },
): Promise<void> {
  await page
    .getByLabel("Client or business")
    .fill(input.clientName);

  await page
    .getByLabel("Missed revenue identified")
    .fill(input.missed);

  await page
    .getByLabel("Revenue increased")
    .fill(input.increased);

  await page
    .getByLabel("Evidence level")
    .selectOption(input.evidence);

  await page
    .getByLabel("Source")
    .selectOption(input.source);

  await page
    .getByLabel("Period start")
    .fill(input.periodStart);

  await page
    .getByLabel("Period end")
    .fill(input.periodEnd);

  await page
    .getByLabel(
      "Notes or supporting evidence",
    )
    .fill(input.notes);

  await page
    .getByRole("button", {
      name: "Add to Platform Impact",
    })
    .click();

  await expect(
    page.getByText(
      "Client revenue impact added to the company-wide totals.",
      {
        exact: true,
      },
    ),
  ).toBeVisible();
}

test.describe.serial(
  "founder operations and revenue impact",
  () => {
    test.beforeAll(async () => {
      const environment =
        requireSyntheticTestEnvironment();

      const identities =
        createSyntheticIdentitySet(
          environment.syntheticEmailDomain,
        );

      businessOwner =
        identities["business-owner-a"];

      const manifest =
        await seedSyntheticTestData();

      const ownerTenant =
        manifest.tenants.find(
          ({ actor }) =>
            actor === "business-owner-a",
        );

      if (!ownerTenant) {
        throw new Error(
          "Founder operations suite requires business-owner-a.",
        );
      }

      businessOwnerUserId =
        ownerTenant.userId;

      platformAdmin =
        await seedSyntheticPlatformAdmin();
    });

    test.afterAll(async () => {
      const { admin } =
        createSyntheticSupabaseClients();

      const {
        error: founderCleanupError,
      } = await admin
        .from("founder_time_entries")
        .delete()
        .eq(
          "user_id",
          platformAdmin.user.id,
        );

      if (founderCleanupError) {
        throw new Error(
          `Unable to clean founder time entries: ${founderCleanupError.message}`,
        );
      }

      const {
        error: revenueCleanupError,
      } = await admin
        .from("client_revenue_impact")
        .delete()
        .eq(
          "recorded_by",
          platformAdmin.user.id,
        );

      if (revenueCleanupError) {
        throw new Error(
          `Unable to clean revenue impact entries: ${revenueCleanupError.message}`,
        );
      }

      await cleanupSyntheticPlatformAdmin(
        platformAdmin,
      );

      await cleanupSyntheticTestData();
    });

    test(
      "ordinary owner is denied by both the UI and database policies",
      async ({ page }) => {
        await signIn(
          page,
          businessOwner,
        );

        for (const route of [
          "/dashboard/founder-time",
          "/dashboard/revenue-impact",
        ]) {
          await page.goto(route, {
            waitUntil:
              "domcontentloaded",
          });

          await expect(
            page.getByRole("heading", {
              name: "Admin access required",
              level: 1,
            }),
          ).toBeVisible();
        }

        const ownerClient =
          await createAuthenticatedSyntheticClient(
            businessOwner,
          );

        const {
          error: founderInsertError,
        } = await ownerClient
          .from("founder_time_entries")
          .insert({
            user_id:
              businessOwnerUserId,
            category:
              "Founder / Executive",
            description:
              "Unauthorized synthetic founder entry",
            clock_in:
              new Date().toISOString(),
            hourly_rate: 50,
          });

        expect(
          founderInsertError,
        ).not.toBeNull();

        const {
          error: revenueInsertError,
        } = await ownerClient
          .from("client_revenue_impact")
          .insert({
            recorded_by:
              businessOwnerUserId,
            client_name:
              "Unauthorized Synthetic Client",
            missed_revenue_identified:
              100,
            increased_revenue_realized:
              50,
            evidence_status:
              "estimated",
            source_type: "manual",
          });

        expect(
          revenueInsertError,
        ).not.toBeNull();

        const {
          data: founderRows,
          error: founderReadError,
        } = await ownerClient
          .from("founder_time_entries")
          .select("id");

        expect(
          founderReadError,
        ).toBeNull();

        expect(
          founderRows || [],
        ).toHaveLength(0);

        const {
          data: revenueRows,
          error: revenueReadError,
        } = await ownerClient
          .from("client_revenue_impact")
          .select("id");

        expect(
          revenueReadError,
        ).toBeNull();

        expect(
          revenueRows || [],
        ).toHaveLength(0);
      },
    );

    test(
      "platform admin can clock time and persist manual founder contributions",
      async ({ page }) => {
        await signIn(
          page,
          platformAdmin.identity,
        );

        await page.goto(
          "/dashboard/founder-time",
          {
            waitUntil:
              "domcontentloaded",
          },
        );

        await expect(
          page.getByRole("heading", {
            name:
              "Founder Time & Compensation",
            level: 1,
          }),
        ).toBeVisible();

        await page
          .getByPlaceholder(
            "Example: Revising onboarding and conflict-detection flow",
          )
          .fill(LIVE_DESCRIPTION);

        await page
          .getByRole("button", {
            name: "Clock In",
          })
          .click();

        await expect(
          page.getByText(
            "Clocked in. Your founder session is now being tracked.",
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        await expect(
          page.getByRole("heading", {
            name:
              "Currently clocked in",
          }),
        ).toBeVisible();

        await page
          .getByRole("button", {
            name: "Clock Out",
          })
          .click();

        await expect(
          page.getByText(
            "Clocked out. The session was added to your founder contribution record.",
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        const liveRow = page
          .getByText(
            LIVE_DESCRIPTION,
            {
              exact: true,
            },
          )
          .locator(
            "xpath=ancestor::tr[1]",
          );

        await expect(
          liveRow,
        ).toBeVisible();

        const manualSection =
          sectionWithHeading(
            page,
            "Add forgotten or offline work",
          );

        await manualSection
          .locator(
            'input[type="date"]',
          )
          .fill("2026-07-28");

        await manualSection
          .getByPlaceholder("Hours")
          .fill("2.5");

        await manualSection
          .getByPlaceholder(
            "What was completed?",
          )
          .fill(MANUAL_DESCRIPTION);

        await manualSection
          .getByRole("button", {
            name: "Add Manual Entry",
          })
          .click();

        await expect(
          page.getByText(
            "Manual founder time entry added.",
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        const manualRow = page
          .getByText(
            MANUAL_DESCRIPTION,
            {
              exact: true,
            },
          )
          .locator(
            "xpath=ancestor::tr[1]",
          );

        await expect(
          manualRow,
        ).toContainText("2.50");

        await expect(
          manualRow,
        ).toContainText("$125.00");

        const openingSection =
          sectionWithHeading(
            page,
            "Add your work to date",
          );

        await openingSection
          .getByRole("button", {
            name:
              "Add 204-Hour Opening Balance",
          })
          .click();

        await expect(
          page.getByText(
            "204 historical hours and $10,200 in estimated value were added.",
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        await openingSection
          .getByRole("button", {
            name:
              "Add 204-Hour Opening Balance",
          })
          .click();

        await expect(
          page.getByText(
            "The 204-hour opening balance is already included.",
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        const founderMetrics = page
          .getByText("Lifetime hours", {
            exact: true,
          })
          .locator(
            "xpath=ancestor::section[1]",
          );

        await expect(
          founderMetrics
            .getByText("Lifetime hours", {
              exact: true,
            })
            .locator(".."),
        ).toContainText("206.5");

        await expect(
          founderMetrics
            .getByText("Estimated value", {
              exact: true,
            })
            .locator(".."),
        ).toContainText("$10,325.");
      },
    );

    test(
      "platform admin can record classified revenue impact and see accurate totals",
      async ({ page }) => {
        await signIn(
          page,
          platformAdmin.identity,
        );

        await page.goto(
          "/dashboard/revenue-impact",
          {
            waitUntil:
              "domcontentloaded",
          },
        );

        await expect(
          page.getByRole("heading", {
            name:
              "Client Revenue Impact",
            level: 1,
          }),
        ).toBeVisible();

        await page
          .getByLabel(
            "Client or business",
          )
          .fill(
            "Synthetic Validation Client",
          );

        await page
          .getByRole("button", {
            name:
              "Add to Platform Impact",
          })
          .click();

        await expect(
          page.getByText(
            "Enter missed revenue, increased revenue, or both.",
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        await addRevenueImpact(page, {
          clientName:
            REVENUE_CLIENTS.estimated,
          missed: "100",
          increased: "50",
          evidence: "estimated",
          source: "manual",
          periodStart: "2026-07-01",
          periodEnd: "2026-07-07",
          notes:
            "Synthetic estimated impact evidence.",
        });

        await addRevenueImpact(page, {
          clientName:
            REVENUE_CLIENTS.confirmed,
          missed: "200",
          increased: "100",
          evidence:
            "client_confirmed",
          source: "client_report",
          periodStart: "2026-07-08",
          periodEnd: "2026-07-14",
          notes:
            "Synthetic client-confirmed evidence.",
        });

        await addRevenueImpact(page, {
          clientName:
            REVENUE_CLIENTS.verified,
          missed: "300",
          increased: "150",
          evidence: "verified",
          source:
            "appointment_analysis",
          periodStart: "2026-07-15",
          periodEnd: "2026-07-21",
          notes:
            "Synthetic verified impact evidence.",
        });

        await expect(
          page.getByText("$900", {
            exact: true,
          }).first(),
        ).toBeVisible();

        const revenueMetrics = page
          .locator("section")
          .filter({
            hasText: "Businesses measured",
          })
          .filter({
            hasText: "Confirmed impact",
          });

        await expect(
          revenueMetrics
            .getByText(
              "Missed revenue identified",
              {
                exact: true,
              },
            )
            .locator(".."),
        ).toContainText("$600");

        await expect(
          revenueMetrics
            .getByText("Revenue increased", {
              exact: true,
            })
            .locator(".."),
        ).toContainText("$300");

        await expect(
          revenueMetrics
            .getByText("Confirmed impact", {
              exact: true,
            })
            .locator(".."),
        ).toContainText("$750");

        await expect(
          revenueMetrics
            .getByText(
              "Businesses measured",
              {
                exact: true,
              },
            )
            .locator(".."),
        ).toContainText("3");

        for (const clientName of Object.values(
          REVENUE_CLIENTS,
        )) {
          await expect(
            page.getByText(
              clientName,
              {
                exact: true,
              },
            ),
          ).toBeVisible();
        }

        const verifiedRow = page
          .getByText(
            REVENUE_CLIENTS.verified,
            {
              exact: true,
            },
          )
          .locator(
            "xpath=ancestor::tr[1]",
          );

        await expect(
          verifiedRow,
        ).toContainText("$300");

        await expect(
          verifiedRow,
        ).toContainText("$150");

        await expect(
          verifiedRow,
        ).toContainText("$450");

        await expect(
          verifiedRow,
        ).toContainText("Verified");

        await expect(
          page.getByText(
            "Verified only",
            {
              exact: true,
          })
            .locator(
              "xpath=ancestor::div[1]",
            ),
        ).toContainText("$450");
      },
    );
  },
);
