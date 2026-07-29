import {
  expect,
  test,
  type APIRequestContext,
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
  createAuthenticatedSyntheticClient,
  createSyntheticSupabaseClients,
} from "../fixtures/supabase";

const INVALID_TOKEN =
  "schednest-invalid-platform-settings-token";

let ownerA: SyntheticIdentity;
let ownerB: SyntheticIdentity;
let ownerAUserId: string;
let ownerBUserId: string;
let ownerAToken: string;
let ownerBToken: string;

async function accessTokenFor(
  identity: SyntheticIdentity,
): Promise<string> {
  const client =
    await createAuthenticatedSyntheticClient(identity);

  const {
    data: { session },
    error,
  } = await client.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error(
      `Unable to resolve access token for ${identity.actor}: ${
        error?.message || "No session returned"
      }`,
    );
  }

  return session.access_token;
}

async function signIn(
  page: Page,
  identity: SyntheticIdentity,
): Promise<void> {
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

async function expectJsonError(
  response: Awaited<
    ReturnType<APIRequestContext["get"]>
  >,
  status: number,
  message: string,
): Promise<void> {
  expect(response.status()).toBe(status);

  const body = (await response.json()) as {
    error?: unknown;
  };

  expect(body.error).toBe(message);
}

test.describe.serial(
  "platform settings and privacy controls",
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

      const manifest =
        await seedSyntheticTestData();

      const tenantA = manifest.tenants.find(
        ({ actor }) =>
          actor === "business-owner-a",
      );

      const tenantB = manifest.tenants.find(
        ({ actor }) =>
          actor === "business-owner-b",
      );

      if (!tenantA || !tenantB) {
        throw new Error(
          "Synthetic settings suite requires both tenant owners.",
        );
      }

      ownerAUserId = tenantA.userId;
      ownerBUserId = tenantB.userId;

      ownerAToken = await accessTokenFor(ownerA);
      ownerBToken = await accessTokenFor(ownerB);
    });

    test.afterAll(async () => {
      const { admin } =
        createSyntheticSupabaseClients();

      const ownerIds = [
        ownerAUserId,
        ownerBUserId,
      ];

      for (const table of [
        "platform_data_requests",
        "platform_consents",
        "platform_product_settings",
        "platform_accessibility_settings",
        "platform_privacy_settings",
        "platform_profiles",
      ]) {
        const { error } = await admin
          .from(table)
          .delete()
          .in("owner_id", ownerIds);

        if (error) {
          throw new Error(
            `Unable to clean ${table}: ${error.message}`,
          );
        }
      }

      await cleanupSyntheticTestData();
    });

    test(
      "Owner A can save and reload unified settings",
      async ({ page }) => {
        await signIn(page, ownerA);

        await page.goto("/settings", {
          waitUntil: "domcontentloaded",
        });

        await expect(
          page.getByRole("heading", {
            name: "Unified Settings",
            level: 1,
          }),
        ).toBeVisible();

        const profileSection = page
          .locator("article")
          .filter({
            has: page.getByRole("heading", {
              name: "Profile",
            }),
          });

        await profileSection
          .getByPlaceholder("Display name")
          .fill("Synthetic Platform Owner A");

        await profileSection
          .getByPlaceholder("Preferred name")
          .fill("Platform A");

        await profileSection
          .getByPlaceholder("Phone")
          .fill("310-555-0188");

        await profileSection
          .getByPlaceholder("Timezone")
          .fill("America/Los_Angeles");

        await profileSection
          .getByRole("combobox")
          .nth(0)
          .selectOption({
            label: "Spanish",
          });

        await profileSection
          .getByRole("combobox")
          .nth(1)
          .selectOption("24h");

        await page
          .getByLabel("Cross-product context")
          .check();

        await page
          .getByLabel("Sensitive memory")
          .check();

        await page
          .getByLabel("Large text")
          .check();

        await page
          .getByLabel("Reduced motion")
          .check();

        const privacySection = page
          .locator("article")
          .filter({
            has: page.getByRole("heading", {
              name: "Privacy and Birdy",
            }),
          });

        await privacySection
          .getByRole("combobox")
          .selectOption("approved_people");

        await page
          .getByRole("button", {
            name: "Save all settings",
          })
          .click();

        await expect(
          page.getByText("Settings saved.", {
            exact: true,
          }),
        ).toBeVisible();

        await page.reload({
          waitUntil: "domcontentloaded",
        });

        await expect(
          profileSection.getByPlaceholder(
            "Display name",
          ),
        ).toHaveValue(
          "Synthetic Platform Owner A",
        );

        await expect(
          profileSection.getByPlaceholder(
            "Preferred name",
          ),
        ).toHaveValue("Platform A");

        await expect(
          page.getByLabel(
            "Cross-product context",
          ),
        ).toBeChecked();

        await expect(
          page.getByLabel("Sensitive memory"),
        ).toBeChecked();

        await expect(
          page.getByLabel("Large text"),
        ).toBeChecked();

        await expect(
          privacySection.getByRole("combobox"),
        ).toHaveValue("approved_people");
      },
    );

    test(
      "Owner B cannot see Owner A settings",
      async ({ page }) => {
        await signIn(page, ownerB);

        await page.goto("/settings", {
          waitUntil: "domcontentloaded",
        });

        await expect(
          page.getByPlaceholder("Display name"),
        ).not.toHaveValue(
          "Synthetic Platform Owner A",
        );

        await expect(
          page.getByPlaceholder("Preferred name"),
        ).not.toHaveValue("Platform A");

        await expect(
          page.getByLabel(
            "Cross-product context",
          ),
        ).not.toBeChecked();

        await expect(
          page.getByLabel("Sensitive memory"),
        ).not.toBeChecked();
      },
    );

    test(
      "settings API enforces authentication and tenant scope",
      async ({ request }) => {
        const missing = await request.get(
          "/api/platform/settings",
        );

        await expectJsonError(
          missing,
          401,
          "Unauthorized",
        );

        const invalid = await request.get(
          "/api/platform/settings",
          {
            headers: {
              authorization:
                `Bearer ${INVALID_TOKEN}`,
            },
          },
        );

        await expectJsonError(
          invalid,
          401,
          "Unauthorized",
        );

        const ownerAResponse = await request.get(
          "/api/platform/settings",
          {
            headers: {
              authorization:
                `Bearer ${ownerAToken}`,
            },
          },
        );

        expect(ownerAResponse.status()).toBe(200);

        const ownerABody =
          (await ownerAResponse.json()) as {
            profile?: {
              owner_id?: string;
              display_name?: string;
            } | null;
            privacy?: {
              owner_id?: string;
              default_sharing_scope?: string;
            } | null;
            accessibility?: {
              owner_id?: string;
              large_text?: boolean;
            } | null;
            products?: unknown;
          };

        expect(ownerABody.profile?.owner_id)
          .toBe(ownerAUserId);

        expect(
          ownerABody.profile?.display_name,
        ).toBe("Synthetic Platform Owner A");

        expect(
          ownerABody.privacy?.owner_id,
        ).toBe(ownerAUserId);

        expect(
          ownerABody.accessibility?.owner_id,
        ).toBe(ownerAUserId);

        expect(
          Array.isArray(ownerABody.products),
        ).toBe(true);

        const ownerBResponse = await request.get(
          "/api/platform/settings",
          {
            headers: {
              authorization:
                `Bearer ${ownerBToken}`,
            },
          },
        );

        expect(ownerBResponse.status()).toBe(200);

        const ownerBBody =
          (await ownerBResponse.json()) as {
            profile?: {
              display_name?: string;
            } | null;
          };

        expect(
          ownerBBody.profile?.display_name,
        ).not.toBe(
          "Synthetic Platform Owner A",
        );
      },
    );

    test(
      "Owner A can grant and withdraw consent without leaking to Owner B",
      async ({ page }) => {
        await signIn(page, ownerA);

        await page.goto("/settings/privacy", {
          waitUntil: "domcontentloaded",
        });

        await expect(
          page.getByRole("heading", {
            name: "Privacy controls",
            level: 1,
          }),
        ).toBeVisible();

        const analyticsSection = page
          .locator("section")
          .filter({
            has: page.getByRole("heading", {
              name: "Analytics",
            }),
          });

        const analyticsSelect =
          analyticsSection.getByRole("combobox");

        await analyticsSelect.selectOption(
          "granted",
        );

        await expect(
          analyticsSelect,
        ).toHaveValue("granted");

        await analyticsSelect.selectOption(
          "withdrawn",
        );

        await expect(
          analyticsSelect,
        ).toHaveValue("withdrawn");

        await page.reload({
          waitUntil: "domcontentloaded",
        });

        await expect(
          analyticsSection.getByRole(
            "combobox",
          ),
        ).toHaveValue("withdrawn");

        await page.goto("/logout", {
          waitUntil: "domcontentloaded",
        });

        await signIn(page, ownerB);

        await page.goto("/settings/privacy", {
          waitUntil: "domcontentloaded",
        });

        const ownerBAnalyticsSection = page
          .locator("section")
          .filter({
            has: page.getByRole("heading", {
              name: "Analytics",
            }),
          });

        await expect(
          ownerBAnalyticsSection.getByRole(
            "combobox",
          ),
        ).toHaveValue("not_granted");
      },
    );

    test(
      "privacy APIs validate requests and create owner-scoped exports",
      async ({ request }) => {
        for (const route of [
          "/api/platform/privacy/consent",
          "/api/platform/privacy/export",
        ]) {
          const missing =
            route.endsWith("/consent")
              ? await request.get(route)
              : await request.post(route);

          await expectJsonError(
            missing,
            401,
            "Unauthorized",
          );
        }

        const invalidConsent =
          await request.get(
            "/api/platform/privacy/consent",
            {
              headers: {
                authorization:
                  `Bearer ${INVALID_TOKEN}`,
              },
            },
          );

        await expectJsonError(
          invalidConsent,
          401,
          "Unauthorized",
        );

        const incomplete =
          await request.post(
            "/api/platform/privacy/consent",
            {
              headers: {
                authorization:
                  `Bearer ${ownerAToken}`,
              },
              data: {},
            },
          );

        await expectJsonError(
          incomplete,
          400,
          "consentKey and status are required",
        );

        const consentResponse =
          await request.post(
            "/api/platform/privacy/consent",
            {
              headers: {
                authorization:
                  `Bearer ${ownerAToken}`,
              },
              data: {
                consentKey:
                  "usage_improvement",
                status: "granted",
              },
            },
          );

        expect(
          consentResponse.status(),
        ).toBe(200);

        const consentBody =
          (await consentResponse.json()) as {
            consent?: {
              owner_id?: string;
              consent_key?: string;
              status?: string;
            };
          };

        expect(
          consentBody.consent?.owner_id,
        ).toBe(ownerAUserId);

        expect(
          consentBody.consent?.consent_key,
        ).toBe("usage_improvement");

        expect(
          consentBody.consent?.status,
        ).toBe("granted");

        const ownerBConsentResponse =
          await request.get(
            "/api/platform/privacy/consent",
            {
              headers: {
                authorization:
                  `Bearer ${ownerBToken}`,
              },
            },
          );

        expect(
          ownerBConsentResponse.status(),
        ).toBe(200);

        const ownerBConsentBody =
          (await ownerBConsentResponse.json()) as {
            consents?: Array<{
              owner_id?: string;
              consent_key?: string;
            }>;
          };

        expect(
          ownerBConsentBody.consents || [],
        ).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              owner_id: ownerAUserId,
              consent_key:
                "usage_improvement",
            }),
          ]),
        );

        const exportResponse =
          await request.post(
            "/api/platform/privacy/export",
            {
              headers: {
                authorization:
                  `Bearer ${ownerAToken}`,
              },
            },
          );

        expect(
          exportResponse.status(),
        ).toBe(201);

        const exportBody =
          (await exportResponse.json()) as {
            request?: {
              id?: string;
              owner_id?: string;
              request_type?: string;
              status?: string;
            };
          };

        expect(
          typeof exportBody.request?.id,
        ).toBe("string");

        expect(
          exportBody.request?.owner_id,
        ).toBe(ownerAUserId);

        expect(
          exportBody.request?.request_type,
        ).toBe("export");

        expect(
          exportBody.request?.status,
        ).toBe("pending");
      },
    );
  },
);
