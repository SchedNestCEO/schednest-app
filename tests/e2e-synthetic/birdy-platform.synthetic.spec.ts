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
  "schednest-invalid-birdy-platform-token";

const MEMORY_TITLE =
  "Synthetic Birdy platform memory";

const MEMORY_CONTENT =
  "Prefer early afternoon planning sessions.";

const OPTIMIZER_ITEM_TITLE =
  "Synthetic unscheduled optimizer item";

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

async function expectJsonError(
  response: Awaited<
    ReturnType<APIRequestContext["get"]>
  >,
  expectedStatus: number,
  expectedMessage: string,
): Promise<void> {
  expect(response.status()).toBe(
    expectedStatus,
  );

  const body = (await response.json()) as {
    error?: unknown;
  };

  expect(body.error).toBe(expectedMessage);
}

test.describe.serial(
  "Birdy platform controls",
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
          "Birdy platform suite requires both synthetic owners.",
        );
      }

      ownerAUserId = tenantA.userId;
      ownerBUserId = tenantB.userId;

      ownerAToken =
        await accessTokenFor(ownerA);

      ownerBToken =
        await accessTokenFor(ownerB);
    });

    test.afterAll(async () => {
      const { admin } =
        createSyntheticSupabaseClients();

      const ownerIds = [
        ownerAUserId,
        ownerBUserId,
      ];

      for (const table of [
        "birdy_action_decisions",
        "birdy_action_permissions",
        "birdy_memories",
        "birdy_memory_settings",
        "coordination_conflicts",
        "coordination_items",
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
      "Birdy APIs enforce authentication and required fields",
      async ({ request }) => {
        const routes = [
          "/api/platform/birdy/decisions",
          "/api/platform/birdy/memory",
          "/api/platform/birdy/optimizer",
          "/api/platform/birdy/permissions",
        ];

        for (const route of routes) {
          const missing =
            await request.get(route);

          await expectJsonError(
            missing,
            401,
            "Unauthorized",
          );

          const invalid =
            await request.get(route, {
              headers: {
                authorization:
                  `Bearer ${INVALID_TOKEN}`,
              },
            });

          await expectJsonError(
            invalid,
            401,
            "Unauthorized",
          );
        }

        const incompleteMemory =
          await request.post(
            "/api/platform/birdy/memory",
            {
              headers: {
                authorization:
                  `Bearer ${ownerAToken}`,
              },
              data: {},
            },
          );

        await expectJsonError(
          incompleteMemory,
          400,
          "product, memoryType, title, and content are required",
        );

        const incompletePermission =
          await request.post(
            "/api/platform/birdy/permissions",
            {
              headers: {
                authorization:
                  `Bearer ${ownerAToken}`,
              },
              data: {},
            },
          );

        await expectJsonError(
          incompletePermission,
          400,
          "product, actionKey, permissionLevel, and riskLevel are required",
        );

        const incompleteDecision =
          await request.patch(
            "/api/platform/birdy/decisions",
            {
              headers: {
                authorization:
                  `Bearer ${ownerAToken}`,
              },
              data: {},
            },
          );

        await expectJsonError(
          incompleteDecision,
          400,
          "decisionId and status are required",
        );
      },
    );

    test(
      "Owner A can add, confirm, archive, and configure Birdy memory",
      async ({ page, request }) => {
        await signIn(page, ownerA);

        await page.goto("/birdy/memory", {
          waitUntil: "domcontentloaded",
        });

        await expect(
          page.getByRole("heading", {
            name: "Memory",
            level: 1,
          }),
        ).toBeVisible();

        const addMemoryForm = page
          .locator("form")
          .filter({
            has: page.getByRole("heading", {
              name: "Add memory",
              level: 2,
            }),
          });

        await addMemoryForm
          .getByPlaceholder("Memory title")
          .fill(MEMORY_TITLE);

        await addMemoryForm
          .getByPlaceholder(
            "What should Birdy remember?",
          )
          .fill(MEMORY_CONTENT);

        await addMemoryForm
          .getByRole("button", {
            name: "Add memory",
          })
          .click();

        await expect(
          page.getByText("Memory added.", {
            exact: true,
          }),
        ).toBeVisible();

        const memoryHeading = page.getByRole(
          "heading",
          {
            name: MEMORY_TITLE,
            level: 3,
          },
        );

        const memoryCard = memoryHeading.locator(
          "xpath=ancestor::article[1]",
        );

        await expect(memoryCard).toBeVisible();

        const confirmButton =
          memoryCard.getByRole("button", {
            name: "Confirm",
          });

        if (await confirmButton.count()) {
          await confirmButton.click();

          await expect(
            memoryCard.getByRole("button", {
              name: "Confirm",
            }),
          ).toHaveCount(0);
        }

        await page
          .getByLabel("Sensitive memory")
          .check();

        await page
          .getByLabel(
            "Auto-confirm low-risk memories",
          )
          .check();

        await page
          .getByLabel("Retention days")
          .fill("90");

        await page
          .getByRole("button", {
            name: "Save controls",
          })
          .click();

        await expect(
          page.getByText(
            "Memory settings saved.",
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        await page.reload({
          waitUntil: "domcontentloaded",
        });

        await expect(
          page.getByLabel("Sensitive memory"),
        ).toBeChecked();

        await expect(
          page.getByLabel(
            "Auto-confirm low-risk memories",
          ),
        ).toBeChecked();

        await expect(
          page.getByLabel("Retention days"),
        ).toHaveValue("90");

        const ownerBResponse =
          await request.get(
            "/api/platform/birdy/memory",
            {
              headers: {
                authorization:
                  `Bearer ${ownerBToken}`,
              },
            },
          );

        expect(
          ownerBResponse.status(),
        ).toBe(200);

        const ownerBBody =
          (await ownerBResponse.json()) as {
            memories?: Array<{
              title?: string;
            }>;
          };

        expect(
          ownerBBody.memories || [],
        ).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              title: MEMORY_TITLE,
            }),
          ]),
        );

        const reloadedMemoryCard = page
          .getByRole("heading", {
            name: MEMORY_TITLE,
            level: 3,
          })
          .locator(
            "xpath=ancestor::article[1]",
          );

        await reloadedMemoryCard
          .getByRole("button", {
            name: "Archive",
          })
          .click();

        await expect(
          page.getByRole("heading", {
            name: MEMORY_TITLE,
            level: 3,
          }),
        ).toHaveCount(0);
      },
    );

    test(
      "Owner A can persist an independent Birdy permission",
      async ({ page, request }) => {
        await signIn(page, ownerA);

        await page.goto(
          "/birdy/permissions",
          {
            waitUntil:
              "domcontentloaded",
          },
        );

        await expect(
          page.getByRole("heading", {
            name: "Action Permissions",
            level: 1,
          }),
        ).toBeVisible();

        const enabledPermissionSelect =
          page
            .locator("article select:not(:disabled)")
            .first();

        await expect(
          enabledPermissionSelect,
        ).toBeVisible();

        await enabledPermissionSelect
          .selectOption("ask");

        await expect(
          page.getByText(
            "Birdy permission saved.",
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        const ownerAResponse =
          await request.get(
            "/api/platform/birdy/permissions",
            {
              headers: {
                authorization:
                  `Bearer ${ownerAToken}`,
              },
            },
          );

        expect(
          ownerAResponse.status(),
        ).toBe(200);

        const ownerABody =
          (await ownerAResponse.json()) as {
            permissions?: Array<{
              owner_id?: string;
              permission_level?: string;
            }>;
          };

        expect(
          ownerABody.permissions || [],
        ).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              owner_id: ownerAUserId,
              permission_level: "ask",
            }),
          ]),
        );

        const ownerBResponse =
          await request.get(
            "/api/platform/birdy/permissions",
            {
              headers: {
                authorization:
                  `Bearer ${ownerBToken}`,
              },
            },
          );

        expect(
          ownerBResponse.status(),
        ).toBe(200);

        const ownerBBody =
          (await ownerBResponse.json()) as {
            permissions?: Array<{
              owner_id?: string;
            }>;
          };

        expect(
          ownerBBody.permissions || [],
        ).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              owner_id: ownerAUserId,
            }),
          ]),
        );
      },
    );

    test(
      "optimizer generates an owner-scoped recommendation",
      async ({ request, page }) => {
        const { admin } =
          createSyntheticSupabaseClients();

        const dueAt = new Date(
          Date.now() +
            3 * 24 * 60 * 60 * 1000,
        ).toISOString();

        const {
          data: coordinationItem,
          error: coordinationError,
        } = await admin
          .from("coordination_items")
          .insert({
            owner_id: ownerAUserId,
            created_by: ownerAUserId,
            product: "platform",
            item_type: "task",
            title: OPTIMIZER_ITEM_TITLE,
            due_at: dueAt,
            timezone:
              "America/Los_Angeles",
            priority: 3,
            flexibility: "movable",
            expected_duration_minutes: 60,
            user_locked: false,
          })
          .select("id")
          .single();

        if (
          coordinationError ||
          !coordinationItem
        ) {
          throw new Error(
            `Unable to seed optimizer item: ${
              coordinationError?.message ||
              "No row returned"
            }`,
          );
        }

        const optimizerResponse =
          await request.post(
            "/api/platform/birdy/optimizer",
            {
              headers: {
                authorization:
                  `Bearer ${ownerAToken}`,
              },
            },
          );

        expect(
          optimizerResponse.status(),
        ).toBe(200);

        const optimizerBody =
          (await optimizerResponse.json()) as {
            generated?: number;
            mode?: string;
          };

        expect(
          optimizerBody.generated,
        ).toBeGreaterThanOrEqual(1);

        expect(optimizerBody.mode).toBe(
          "recommendations_only",
        );

        const recommendation =
          `Schedule "${OPTIMIZER_ITEM_TITLE}" before its due date.`;

        const ownerBResponse =
          await request.get(
            "/api/platform/birdy/optimizer",
            {
              headers: {
                authorization:
                  `Bearer ${ownerBToken}`,
              },
            },
          );

        expect(
          ownerBResponse.status(),
        ).toBe(200);

        const ownerBBody =
          (await ownerBResponse.json()) as {
            recommendations?: Array<{
              recommendation?: string;
            }>;
          };

        expect(
          ownerBBody.recommendations || [],
        ).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              recommendation,
            }),
          ]),
        );

        await signIn(page, ownerA);

        await page.goto(
          "/birdy/optimizer",
          {
            waitUntil:
              "domcontentloaded",
          },
        );

        await expect(
          page.getByRole("heading", {
            name: "Schedule Optimizer",
            level: 1,
          }),
        ).toBeVisible();

        await expect(
          page.getByRole("heading", {
            name: recommendation,
            level: 3,
          }),
        ).toBeVisible();
      },
    );

    test(
      "Owner A can approve the optimizer decision while Owner B remains isolated",
      async ({ request, page }) => {
        const ownerADecisionsResponse =
          await request.get(
            "/api/platform/birdy/decisions?status=pending",
            {
              headers: {
                authorization:
                  `Bearer ${ownerAToken}`,
              },
            },
          );

        expect(
          ownerADecisionsResponse.status(),
        ).toBe(200);

        const ownerADecisionsBody =
          (await ownerADecisionsResponse.json()) as {
            decisions?: Array<{
              id?: string;
              recommendation?: string;
              status?: string;
            }>;
          };

        const decision =
          ownerADecisionsBody.decisions?.find(
            (item) =>
              item.recommendation?.includes(
                OPTIMIZER_ITEM_TITLE,
              ),
          );

        if (!decision?.id) {
          throw new Error(
            "Unable to find the synthetic optimizer decision.",
          );
        }

        const ownerBDecisionsResponse =
          await request.get(
            "/api/platform/birdy/decisions?status=all",
            {
              headers: {
                authorization:
                  `Bearer ${ownerBToken}`,
              },
            },
          );

        expect(
          ownerBDecisionsResponse.status(),
        ).toBe(200);

        const ownerBDecisionsBody =
          (await ownerBDecisionsResponse.json()) as {
            decisions?: Array<{
              id?: string;
            }>;
          };

        expect(
          ownerBDecisionsBody.decisions || [],
        ).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: decision.id,
            }),
          ]),
        );

        await signIn(page, ownerA);

        await page.goto(
          "/birdy/decisions",
          {
            waitUntil:
              "domcontentloaded",
          },
        );

        await expect(
          page.getByRole("heading", {
            name: "Decision Center",
            level: 1,
          }),
        ).toBeVisible();

        const decisionHeading =
          page.getByRole("heading", {
            name:
              decision.recommendation,
            level: 3,
          });

        const decisionCard =
          decisionHeading.locator(
            "xpath=ancestor::article[1]",
          );

        await expect(
          decisionCard,
        ).toBeVisible();

        await decisionCard
          .getByRole("button", {
            name: "Approve",
          })
          .click();

        await expect(
          page.getByText(
            "Decision approved.",
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        await page
          .getByRole("combobox")
          .selectOption("all");

        await expect(
          decisionCard.getByText(
            "approved",
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        const approvedResponse =
          await request.get(
            "/api/platform/birdy/decisions?status=all",
            {
              headers: {
                authorization:
                  `Bearer ${ownerAToken}`,
              },
            },
          );

        expect(
          approvedResponse.status(),
        ).toBe(200);

        const approvedBody =
          (await approvedResponse.json()) as {
            decisions?: Array<{
              id?: string;
              status?: string;
            }>;
          };

        expect(
          approvedBody.decisions || [],
        ).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: decision.id,
              status: "approved",
            }),
          ]),
        );
      },
    );
  },
);
