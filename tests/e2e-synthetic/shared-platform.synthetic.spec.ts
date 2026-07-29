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
  "schednest-invalid-shared-platform-token";

const ACTIVITY_TITLE =
  "Synthetic shared-platform activity";

const CONNECTOR_NAME =
  "Google Calendar";

const COORDINATION_ITEM_A =
  "Synthetic overlap item A";

const COORDINATION_ITEM_B =
  "Synthetic overlap item B";

const FILE_NAME =
  "schednest-shared-platform-test.txt";

const NOTIFICATION_TITLE =
  "Synthetic platform notification";

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

async function expectOwnerScopedList(
  request: APIRequestContext,
  route: string,
  token: string,
  property:
    | "events"
    | "connectors"
    | "items"
    | "conflicts"
    | "files"
    | "notifications",
): Promise<Array<Record<string, unknown>>> {
  const response = await request.get(route, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  expect(response.status()).toBe(200);

  const body = (await response.json()) as Record<
    string,
    unknown
  >;

  expect(Array.isArray(body[property])).toBe(
    true,
  );

  return body[property] as Array<
    Record<string, unknown>
  >;
}

test.describe.serial(
  "shared platform surfaces",
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
          "Shared-platform suite requires both synthetic tenants.",
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

      const { data: fileRows, error: fileQueryError } =
        await admin
          .from("platform_files")
          .select("storage_path")
          .in("owner_id", ownerIds);

      if (fileQueryError) {
        throw new Error(
          `Unable to inspect synthetic file paths: ${fileQueryError.message}`,
        );
      }

      const storagePaths = (fileRows || [])
        .map(({ storage_path }) => storage_path)
        .filter(
          (value): value is string =>
            typeof value === "string",
        );

      if (storagePaths.length > 0) {
        const { error: storageError } =
          await admin.storage
            .from("platform-files")
            .remove(storagePaths);

        if (storageError) {
          throw new Error(
            `Unable to remove synthetic storage objects: ${storageError.message}`,
          );
        }
      }

      for (const table of [
        "platform_notification_deliveries",
        "platform_notifications",
        "platform_notification_preferences",
        "platform_activity_events",
        "platform_connector_sync_runs",
        "platform_connectors",
        "coordination_conflicts",
        "coordination_items",
        "platform_file_shares",
        "platform_files",
      ]) {
        const ownerColumn =
          table ===
          "platform_notification_deliveries"
            ? null
            : "owner_id";

        if (!ownerColumn) {
          continue;
        }

        const { error } = await admin
          .from(table)
          .delete()
          .in(ownerColumn, ownerIds);

        if (error) {
          throw new Error(
            `Unable to clean ${table}: ${error.message}`,
          );
        }
      }

      await cleanupSyntheticTestData();
    });

    test(
      "shared platform APIs reject missing and invalid authentication",
      async ({ request }) => {
        const routes = [
          "/api/platform/activity",
          "/api/platform/connectors",
          "/api/platform/coordination/conflicts",
          "/api/platform/coordination/items",
          "/api/platform/files",
          "/api/platform/notifications",
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
      },
    );

    test(
      "activity API creation appears on Owner A timeline only",
      async ({ request, page }) => {
        const createResponse =
          await request.post(
            "/api/platform/activity",
            {
              headers: {
                authorization:
                  `Bearer ${ownerAToken}`,
              },
              data: {
                product: "platform",
                eventType:
                  "synthetic.shared_platform",
                action: "created",
                title: ACTIVITY_TITLE,
                description:
                  "Synthetic activity coverage",
                severity: "success",
                source: "user",
              },
            },
          );

        expect(
          createResponse.status(),
        ).toBe(201);

        const ownerAEvents =
          await expectOwnerScopedList(
            request,
            "/api/platform/activity",
            ownerAToken,
            "events",
          );

        expect(ownerAEvents).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              owner_id: ownerAUserId,
              title: ACTIVITY_TITLE,
            }),
          ]),
        );

        const ownerBEvents =
          await expectOwnerScopedList(
            request,
            "/api/platform/activity",
            ownerBToken,
            "events",
          );

        expect(ownerBEvents).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              title: ACTIVITY_TITLE,
            }),
          ]),
        );

        await signIn(page, ownerA);
        await page.goto("/activity", {
          waitUntil: "domcontentloaded",
        });

        await expect(
          page.getByRole("heading", {
            name: "Activity Timeline",
            level: 1,
          }),
        ).toBeVisible();

        await expect(
          page.getByText(ACTIVITY_TITLE, {
            exact: true,
          }),
        ).toBeVisible();

        const filters =
          page.getByRole("combobox");

        await filters
          .nth(0)
          .selectOption("platform");

        await filters
          .nth(1)
          .selectOption("user");

        await expect(
          page.getByText(ACTIVITY_TITLE, {
            exact: true,
          }),
        ).toBeVisible();
      },
    );

    test(
      "Owner A can add and revoke a connector without leaking it to Owner B",
      async ({ page, request }) => {
        await signIn(page, ownerA);
        await page.goto("/connectors", {
          waitUntil: "domcontentloaded",
        });

        await expect(
          page.getByRole("heading", {
            name: "Connected Apps",
            level: 1,
          }),
        ).toBeVisible();

        const connectorCard = page
          .locator("article")
          .filter({
            has: page.getByRole("heading", {
              name: CONNECTOR_NAME,
              level: 3,
            }),
          });

        await connectorCard
          .getByRole("button", {
            name: "Add connector",
          })
          .click();

        await expect(
          page.getByText(
            `${CONNECTOR_NAME} added to connector registry.`,
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        await expect(
          connectorCard.getByText(
            "disconnected",
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        const ownerBConnectors =
          await expectOwnerScopedList(
            request,
            "/api/platform/connectors",
            ownerBToken,
            "connectors",
          );

        expect(ownerBConnectors).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              display_name:
                CONNECTOR_NAME,
            }),
          ]),
        );

        await connectorCard
          .getByRole("button", {
            name: "Revoke",
          })
          .click();

        await expect(
          page.getByText(
            "Connector revoked.",
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        await expect(
          connectorCard.getByText(
            "revoked",
            {
              exact: true,
            },
          ),
        ).toBeVisible();
      },
    );

    test(
      "Owner A can create overlapping coordination items and detect a conflict",
      async ({ page, request }) => {
        await signIn(page, ownerA);
        await page.goto("/coordination", {
          waitUntil: "domcontentloaded",
        });

        await expect(
          page.getByRole("heading", {
            name: "Coordination Engine",
            level: 1,
          }),
        ).toBeVisible();

        const form = page
          .locator("form")
          .filter({
            has: page.getByRole("heading", {
              name: "Add coordination item",
            }),
          });

        async function addItem(
          title: string,
          start: string,
          end: string,
        ) {
          await form
            .getByPlaceholder("Title")
            .fill(title);

          await form
            .locator(
              'input[type="datetime-local"]',
            )
            .nth(0)
            .fill(start);

          await form
            .locator(
              'input[type="datetime-local"]',
            )
            .nth(1)
            .fill(end);

          await form
            .getByRole("button", {
              name: "Add item",
            })
            .click();

          await expect(
            page.getByText(
              "Coordination item added.",
              {
                exact: true,
              },
            ),
          ).toBeVisible();

          await expect(
            page.getByText(title, {
              exact: true,
            }),
          ).toBeVisible();
        }

        await addItem(
          COORDINATION_ITEM_A,
          "2026-08-04T10:00",
          "2026-08-04T11:30",
        );

        await addItem(
          COORDINATION_ITEM_B,
          "2026-08-04T11:00",
          "2026-08-04T12:00",
        );

        await page
          .getByRole("button", {
            name: "Detect conflicts",
          })
          .click();

        await expect(
          page.getByText(
            /conflict record\(s\) checked\./,
          ),
        ).toBeVisible();

        await expect(
          page.getByText(
            new RegExp(
              `(?:${COORDINATION_ITEM_A} overlaps with ${COORDINATION_ITEM_B}` +
                `|${COORDINATION_ITEM_B} overlaps with ${COORDINATION_ITEM_A})`,
            ),
          ),
        ).toBeVisible();

        const ownerBItems =
          await expectOwnerScopedList(
            request,
            "/api/platform/coordination/items",
            ownerBToken,
            "items",
          );

        expect(ownerBItems).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              title:
                COORDINATION_ITEM_A,
            }),
          ]),
        );

        const ownerBConflicts =
          await expectOwnerScopedList(
            request,
            "/api/platform/coordination/conflicts",
            ownerBToken,
            "conflicts",
          );

        expect(ownerBConflicts).toHaveLength(
          0,
        );
      },
    );

    test(
      "Owner A can upload and archive a private platform file",
      async ({ page, request }) => {
        await signIn(page, ownerA);
        await page.goto("/files", {
          waitUntil: "domcontentloaded",
        });

        await expect(
          page.getByRole("heading", {
            name: "Universal Files",
            level: 1,
          }),
        ).toBeVisible();

        await page
          .locator('input[type="file"]')
          .setInputFiles({
            name: FILE_NAME,
            mimeType: "text/plain",
            buffer: Buffer.from(
              "SchedNest synthetic shared-platform file.",
            ),
          });

        await page
          .getByRole("button", {
            name: "Upload file",
          })
          .click();

        await expect(
          page.getByText(
            "File uploaded.",
            {
              exact: true,
            },
          ),
        ).toBeVisible({
          timeout: 20_000,
        });

        const fileCard = page
          .locator("article")
          .filter({
            has: page.getByRole("heading", {
              name: FILE_NAME,
              level: 3,
            }),
          });

        await expect(fileCard).toBeVisible();

        const ownerBFiles =
          await expectOwnerScopedList(
            request,
            "/api/platform/files",
            ownerBToken,
            "files",
          );

        expect(ownerBFiles).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              original_name: FILE_NAME,
            }),
          ]),
        );

        await fileCard
          .getByRole("button", {
            name: "Archive",
          })
          .click();

        await expect(fileCard).toHaveCount(0);
      },
    );

    test(
      "Owner A can manage notifications and persist preferences without tenant leakage",
      async ({ request, page }) => {
        const createResponse =
          await request.post(
            "/api/platform/notifications",
            {
              headers: {
                authorization:
                  `Bearer ${ownerAToken}`,
              },
              data: {
                product: "platform",
                notificationType:
                  "synthetic.shared_platform",
                title:
                  NOTIFICATION_TITLE,
                body:
                  "Synthetic notification body",
                severity: "critical",
                dedupeKey:
                  "synthetic-shared-platform-notification",
              },
            },
          );

        expect(
          createResponse.status(),
        ).toBe(201);

        const ownerBNotifications =
          await expectOwnerScopedList(
            request,
            "/api/platform/notifications",
            ownerBToken,
            "notifications",
          );

        expect(
          ownerBNotifications,
        ).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              title:
                NOTIFICATION_TITLE,
            }),
          ]),
        );

        await signIn(page, ownerA);
        await page.goto("/notifications", {
          waitUntil: "domcontentloaded",
        });

        await expect(
          page.getByRole("heading", {
            name: "Notifications",
            level: 1,
          }),
        ).toBeVisible();

        const inbox = page
          .locator("article")
          .filter({
            has: page.getByRole("heading", {
              name: "Inbox",
              level: 2,
            }),
          });

        const notificationCard = inbox
          .locator(":scope > div.mt-6 > article")
          .filter({
            has: page.getByRole("heading", {
              name: NOTIFICATION_TITLE,
              level: 3,
            }),
          });

        await expect(
          notificationCard,
        ).toBeVisible();

        await notificationCard
          .getByRole("button", {
            name: "Mark read",
          })
          .click();

        await expect(
          notificationCard.getByRole(
            "button",
            {
              name: "Mark read",
            },
          ),
        ).toHaveCount(0);

        await notificationCard
          .getByRole("button", {
            name: "Acknowledge",
          })
          .click();

        await expect(
          notificationCard.getByRole(
            "button",
            {
              name: "Acknowledge",
            },
          ),
        ).toHaveCount(0);

        await page
          .getByLabel("SMS")
          .check();

        await page
          .getByLabel("Push")
          .check();

        await page
          .getByLabel("Quiet hours")
          .check();

        await page
          .getByLabel("Digest mode")
          .selectOption("daily");

        await page
          .getByLabel("Time zone")
          .fill(
            "America/Los_Angeles",
          );

        await page
          .getByRole("button", {
            name: "Save preferences",
          })
          .click();

        await expect(
          page.getByText(
            "Notification preferences saved.",
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        await page.reload({
          waitUntil: "domcontentloaded",
        });

        await expect(
          page.getByLabel("SMS"),
        ).toBeChecked();

        await expect(
          page.getByLabel("Push"),
        ).toBeChecked();

        await expect(
          page.getByLabel("Quiet hours"),
        ).toBeChecked();

        await expect(
          page.getByLabel("Digest mode"),
        ).toHaveValue("daily");

        await expect(
          page.getByLabel("Time zone"),
        ).toHaveValue(
          "America/Los_Angeles",
        );
      },
    );
  },
);
