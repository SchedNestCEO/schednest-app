import {
  expect,
  test,
  type APIRequestContext,
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

const INVALID_TOKEN =
  "schednest-invalid-admin-access-token";

let platformAdmin: SyntheticPlatformAdmin;
let businessOwner: SyntheticIdentity;
let ownerAccessToken: string;
let adminAccessToken: string;

const createdHealthSnapshotIds = new Set<string>();

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

async function expectJsonError(
  response: Awaited<
    ReturnType<APIRequestContext["get"]>
  >,
  expectedStatus: number,
  expectedMessage: string,
): Promise<void> {
  expect(response.status()).toBe(expectedStatus);

  const body = (await response.json()) as {
    error?: unknown;
  };

  expect(body.error).toBe(expectedMessage);
}

test.describe.serial(
  "admin API security boundaries",
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

      await seedSyntheticTestData();

      platformAdmin =
        await seedSyntheticPlatformAdmin();

      ownerAccessToken =
        await accessTokenFor(businessOwner);

      adminAccessToken =
        await accessTokenFor(
          platformAdmin.identity,
        );
    });

    test.afterAll(async () => {
      const { admin } =
        createSyntheticSupabaseClients();

      if (createdHealthSnapshotIds.size > 0) {
        const { error } = await admin
          .from("platform_health_snapshots")
          .delete()
          .in(
            "id",
            [...createdHealthSnapshotIds],
          );

        if (error) {
          throw new Error(
            `Unable to clean synthetic health snapshots: ${error.message}`,
          );
        }
      }

      await cleanupSyntheticPlatformAdmin(
        platformAdmin,
      );

      await cleanupSyntheticTestData();
    });

    test(
      "health rejects missing and invalid tokens",
      async ({ request }) => {
        const missing = await request.get(
          "/api/admin/health",
        );

        await expectJsonError(
          missing,
          401,
          "Unauthorized",
        );

        const invalid = await request.get(
          "/api/admin/health",
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
      },
    );

    test(
      "performance rejects missing and invalid tokens",
      async ({ request }) => {
        const missing = await request.get(
          "/api/admin/performance",
        );

        await expectJsonError(
          missing,
          401,
          "Unauthorized",
        );

        const invalid = await request.get(
          "/api/admin/performance",
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
      },
    );

    test(
      "ordinary owner is forbidden from admin APIs",
      async ({ request }) => {
        for (const route of [
          "/api/admin/health",
          "/api/admin/performance",
        ]) {
          const response = await request.get(
            route,
            {
              headers: {
                authorization:
                  `Bearer ${ownerAccessToken}`,
              },
            },
          );

          await expectJsonError(
            response,
            403,
            "Forbidden",
          );
        }
      },
    );

    test(
      "platform admin can run a health assessment",
      async ({ request }) => {
        const response = await request.get(
          "/api/admin/health",
          {
            headers: {
              authorization:
                `Bearer ${adminAccessToken}`,
            },
          },
        );

        expect(response.status()).toBe(200);

        const body = (await response.json()) as {
          overall?: unknown;
          checks?: unknown;
          snapshotIds?: unknown;
          checkedAt?: unknown;
        };

        expect([
          "healthy",
          "degraded",
          "down",
        ]).toContain(body.overall);

        expect(Array.isArray(body.checks)).toBe(true);
        expect(body.checks).toHaveLength(7);

        expect(
          Array.isArray(body.snapshotIds),
        ).toBe(true);

        const snapshotIds =
          body.snapshotIds as unknown[];

        expect(snapshotIds).toHaveLength(7);

        for (const id of snapshotIds) {
          expect(typeof id).toBe("string");
          createdHealthSnapshotIds.add(
            String(id),
          );
        }

        expect(
          typeof body.checkedAt,
        ).toBe("string");
      },
    );

    test(
      "platform admin can read performance data",
      async ({ request }) => {
        const response = await request.get(
          "/api/admin/performance",
          {
            headers: {
              authorization:
                `Bearer ${adminAccessToken}`,
            },
          },
        );

        expect(response.status()).toBe(200);

        const body = (await response.json()) as {
          runs?: unknown;
          metrics?: unknown;
          thresholds?: unknown;
        };

        expect(Array.isArray(body.runs)).toBe(true);
        expect(
          Array.isArray(body.metrics),
        ).toBe(true);
        expect(
          Array.isArray(body.thresholds),
        ).toBe(true);
      },
    );

    test(
      "performance rejects an unsupported admin action",
      async ({ request }) => {
        const response = await request.post(
          "/api/admin/performance",
          {
            headers: {
              authorization:
                `Bearer ${adminAccessToken}`,
            },
            data: {
              action:
                "schednest-synthetic-unsupported",
            },
          },
        );

        await expectJsonError(
          response,
          400,
          "Unsupported action",
        );
      },
    );
  },
);
