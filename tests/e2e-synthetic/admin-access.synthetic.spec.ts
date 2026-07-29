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

let platformAdmin: SyntheticPlatformAdmin;
let businessOwner: SyntheticIdentity;

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

const adminPages = [
  {
    route: "/admin",
    heading: "SchedNest Command Center",
  },
  {
    route: "/admin/audit",
    heading: "Audit Center",
  },
  {
    route: "/admin/capabilities",
    heading: "Capability Graph",
  },
  {
    route: "/admin/engineering",
    heading: "Engineering",
  },
  {
    route: "/admin/health",
    heading: "Platform Health",
  },
  {
    route: "/admin/incidents",
    heading: "Incident Center",
  },
  {
    route: "/admin/performance",
    heading: "Performance Center",
  },
  {
    route: "/admin/subscriptions",
    heading: "Subscription Foundation",
  },
  {
    route: "/admin/support",
    heading: "Support Operations",
  },
] as const;

test.describe.serial(
  "platform-admin access boundaries",
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
    });

    test.afterAll(async () => {
      await cleanupSyntheticPlatformAdmin(
        platformAdmin,
      );
      await cleanupSyntheticTestData();
    });

    test(
      "ordinary business owner is redirected from admin routes",
      async ({ page }) => {
        await signIn(page, businessOwner);

        for (const { route, heading } of adminPages) {
          await page.goto(route, {
            waitUntil: "domcontentloaded",
          });

          await expect(page).toHaveURL(
            /\/dashboard(?:\/|$)/,
          );

          await expect(
            page.getByRole("heading", {
              name: heading,
            }),
          ).toHaveCount(0);
        }
      },
    );

    test(
      "platform admin can load every admin page",
      async ({ page }) => {
        await signIn(
          page,
          platformAdmin.identity,
        );

        for (const { route, heading } of adminPages) {
          await page.goto(route, {
            waitUntil: "domcontentloaded",
          });

          await expect(page).toHaveURL(
            new RegExp(
              `${route.replaceAll("/", "\\/")}$`,
            ),
          );

          await expect(
            page.getByRole("heading", {
              name: heading,
            }),
          ).toBeVisible({
            timeout: 20_000,
          });
        }
      },
    );
  },
);
