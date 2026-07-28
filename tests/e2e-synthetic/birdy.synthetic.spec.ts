import {
  expect,
  test,
  type Locator,
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

const suggestionTitle =
  "Your booking setup is ready";

async function signIn(
  page: Page,
  identity: SyntheticIdentity,
): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "schednest-setup-guide-dismissed",
      "true",
    );
  });

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

function suggestionCard(
  page: Page,
  title: string,
): Locator {
  return page
    .locator("main div")
    .filter({
      has: page.getByRole("heading", {
        name: title,
        level: 3,
      }),
    })
    .filter({
      has: page.getByRole("button", {
        name: "Mark done",
        exact: true,
      }),
    })
    .first();
}

test.describe.serial(
  "authenticated synthetic Birdy workflow",
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

    test("Owner A can generate, reload, and complete a saved suggestion", async ({
      page,
    }) => {
      await signIn(page, ownerA);

      await page.goto("/dashboard/birdy", {
        waitUntil: "domcontentloaded",
      });

      await expect(
        page.getByRole("heading", {
          name: "Your business assistant is standing by.",
          level: 1,
        }),
      ).toBeVisible();

      await expect(
        page.getByText(
          "Watching activity for SchedNest Synthetic Business A.",
          {
            exact: true,
          },
        ),
      ).toBeVisible();

      await expect(
        page.getByText("0 active", {
          exact: true,
        }),
      ).toBeVisible({
        timeout: 20_000,
      });

      await page
        .getByRole("button", {
          name: "Generate suggestions",
          exact: true,
        })
        .click();

      await expect(
        page.getByText(
          /Birdy created 1 suggestion\./,
        ),
      ).toBeVisible({
        timeout: 20_000,
      });

      let card = suggestionCard(
        page,
        suggestionTitle,
      );

      await expect(card).toBeVisible();

      await expect(
        card.getByText("Low priority", {
          exact: true,
        }),
      ).toBeVisible();

      await expect(
        card.getByText("Rule based", {
          exact: true,
        }),
      ).toBeVisible();

      await expect(
        card.getByRole("link", {
          name: "Manage booking page",
          exact: true,
        }),
      ).toHaveAttribute(
        "href",
        "/dashboard/booking-page",
      );

      await page.reload({
        waitUntil: "domcontentloaded",
      });

      card = suggestionCard(
        page,
        suggestionTitle,
      );

      await expect(card).toBeVisible({
        timeout: 20_000,
      });

      await expect(
        page.getByText("1 active", {
          exact: true,
        }),
      ).toBeVisible();

      await card
        .getByRole("button", {
          name: "Mark done",
          exact: true,
        })
        .click();

      await expect(card).toHaveCount(0);

      await expect(
        page.getByText("0 active", {
          exact: true,
        }),
      ).toBeVisible();

      await expect(
        page.getByText(
          "No active suggestions yet.",
          {
            exact: true,
          },
        ),
      ).toBeVisible();
    });

    test("Owner B cannot see Owner A completed suggestion", async ({
      page,
    }) => {
      await signIn(page, ownerB);

      await page.goto("/dashboard/birdy", {
        waitUntil: "domcontentloaded",
      });

      await expect(
        page.getByRole("heading", {
          name: "Your business assistant is standing by.",
          level: 1,
        }),
      ).toBeVisible();

      await expect(
        page.getByText(
          "Watching activity for SchedNest Synthetic Business B.",
          {
            exact: true,
          },
        ),
      ).toBeVisible();

      await expect(
        page.getByRole("heading", {
          name: suggestionTitle,
          level: 3,
        }),
      ).toHaveCount(0);

      await expect(
        page.getByText("0 active", {
          exact: true,
        }),
      ).toBeVisible({
        timeout: 20_000,
      });

      await page
        .getByRole("button", {
          name: "Generate suggestions",
          exact: true,
        })
        .click();

      await expect(
        page.getByText(
          /Birdy created 1 suggestion\./,
        ),
      ).toBeVisible({
        timeout: 20_000,
      });

      const ownerBCard = suggestionCard(
        page,
        suggestionTitle,
      );

      await expect(ownerBCard).toBeVisible();

      await ownerBCard
        .getByRole("button", {
          name: "Dismiss",
          exact: true,
        })
        .click();

      await expect(ownerBCard).toHaveCount(0);

      await expect(
        page.getByText("0 active", {
          exact: true,
        }),
      ).toBeVisible();
    });
  },
);
