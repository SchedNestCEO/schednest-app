import { expect, test, type Page } from "@playwright/test";
import {
  cleanupSyntheticMed,
  seedSyntheticMed,
  type SyntheticMedFixture,
} from "../fixtures/med";
import type { SyntheticIdentity } from "../fixtures/identities";
import { createSyntheticSupabaseClients } from "../fixtures/supabase";

let fixture: SyntheticMedFixture;

async function signIn(page: Page, identity: SyntheticIdentity): Promise<void> {
  await page.context().clearCookies();
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

function recordCard(page: Page, text: string) {
  return page
    .getByText(text, {
      exact: true,
    })
    .locator("xpath=ancestor::article[1]");
}

test.describe.serial("SchedNest Med workflows", () => {
  test.beforeAll(async () => {
    fixture = await seedSyntheticMed();
  });

  test.afterAll(async () => {
    await cleanupSyntheticMed(fixture);
  });

  test("patient can load every Med surface with isolated data", async ({
    page,
  }) => {
    await signIn(page, fixture.patient.identity);

    const routes = [
      {
        path: "/med/dashboard",
        heading: `Welcome back, ${fixture.profile.displayName}`,
      },
      {
        path: "/med/dashboard/appointments",
        heading: "Appointments",
      },
      {
        path: "/med/dashboard/care-nests",
        heading: "Care Nests",
      },
      {
        path: "/med/dashboard/caregivers",
        heading: "Caregivers & Family",
      },
      {
        path: "/med/dashboard/documents",
        heading: "Documents",
      },
      {
        path: "/med/dashboard/emergency-card",
        heading: "Emergency Card",
      },
      {
        path: "/med/dashboard/family",
        heading: "Family View",
      },
      {
        path: "/med/dashboard/medications",
        heading: "Medications",
      },
      {
        path: "/med/dashboard/questions",
        heading: "Questions for My Provider",
      },
      {
        path: "/med/dashboard/tasks",
        heading: "Care Tasks",
      },
      {
        path: "/med/dashboard/accessibility",
        heading: "Accessibility",
      },
    ] as const;

    for (const route of routes) {
      await page.goto(route.path, {
        waitUntil: "domcontentloaded",
      });

      await expect(
        page
          .getByRole("heading", {
            name: route.heading,
          })
          .first(),
      ).toBeVisible();
    }

    await page.goto("/med/dashboard/appointments");

    await expect(
      page.getByText(fixture.appointment.title, {
        exact: true,
      }),
    ).toBeVisible();

    await page.goto("/med/dashboard/medications");

    await expect(
      page.getByText(fixture.medication.name, {
        exact: true,
      }),
    ).toBeVisible();

    await page.goto("/med/dashboard/tasks");

    await expect(
      page.getByText(fixture.task.title, {
        exact: true,
      }),
    ).toBeVisible();

    await page.goto("/med/dashboard/documents");

    await expect(
      page.getByText(fixture.document.title, {
        exact: true,
      }),
    ).toBeVisible();

    await page.goto("/med/dashboard/questions");

    await expect(
      page.getByText(fixture.question.question, {
        exact: true,
      }),
    ).toBeVisible();
  });

  test("patient can update appointment, medication, task, and provider question", async ({
    page,
  }) => {
    await signIn(page, fixture.patient.identity);

    await page.goto("/med/dashboard/appointments");

    const appointmentCard = recordCard(page, fixture.appointment.title);

    await appointmentCard
      .getByRole("button", {
        name: "completed",
      })
      .click();

    await expect(
      page.getByText("Appointment updated.", {
        exact: true,
      }),
    ).toBeVisible();

    await page.goto("/med/dashboard/medications");

    const medicationCard = recordCard(page, fixture.medication.name);

    await medicationCard
      .getByRole("button", {
        name: "Archive",
      })
      .click();

    await expect(
      page.getByText("Medication archived.", {
        exact: true,
      }),
    ).toBeVisible();

    await page.goto("/med/dashboard/tasks");

    const taskCard = recordCard(page, fixture.task.title);

    await taskCard
      .getByRole("button", {
        name: "Complete",
      })
      .click();

    await expect(
      page.getByText("Task completed.", {
        exact: true,
      }),
    ).toBeVisible();

    await page.goto("/med/dashboard/questions");

    const questionCard = recordCard(page, fixture.question.question);

    await questionCard.getByRole("textbox").fill("Synthetic patient answer");

    await questionCard
      .getByRole("button", {
        name: "Save answer",
      })
      .click();

    await expect(
      page.getByText("Question updated.", {
        exact: true,
      }),
    ).toBeVisible();
  });

  test("accepted caregiver can open the permission-filtered shared dashboard", async ({
    page,
  }) => {
    await signIn(page, fixture.caregiver.identity);

    await page.goto("/med/dashboard/family", {
      waitUntil: "domcontentloaded",
    });

    await expect(
      page.getByRole("heading", {
        name: "Family View",
      }),
    ).toBeVisible();

    await expect(
      page.getByText(fixture.profile.displayName, {
        exact: true,
      }),
    ).toBeVisible();

    await page
      .getByRole("link", {
        name: /open dashboard/i,
      })
      .click();

    await expect(page).toHaveURL(
      new RegExp(`/med/dashboard/family/${fixture.patient.user.id}$`),
    );

    await expect(
      page.getByRole("heading", {
        name: fixture.profile.displayName,
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        name: "Appointments",
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        name: "Medications",
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        name: "Care Tasks",
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        name: "Documents",
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        name: "Provider Questions",
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        name: "Shared Emergency Card",
      }),
    ).toBeVisible();

    await expect(
      page.getByText("Synthetic allergy", {
        exact: true,
      }),
    ).toBeVisible();
  });

  test("unrelated patient cannot open another patient's shared dashboard", async ({
    page,
  }) => {
    await signIn(page, fixture.unrelatedPatient.identity);

    await page.goto(`/med/dashboard/family/${fixture.patient.user.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(
      page.getByRole("heading", {
        name: "Shared care access unavailable",
      }),
    ).toBeVisible();

    await expect(
      page.getByText(fixture.appointment.title, {
        exact: true,
      }),
    ).toHaveCount(0);
  });

  test("disabled permissions remove sections from the shared dashboard", async ({
    page,
  }) => {
    const { admin } = createSyntheticSupabaseClients();

    const { data: access, error: readError } = await admin
      .from("med_caregiver_access")
      .select("permissions")
      .eq("id", fixture.caregiverAccess.id)
      .single();

    expect(readError).toBeNull();

    const permissions = {
      ...(access?.permissions || {}),
      view_documents: false,
      manage_questions: false,
    };

    const { error } = await admin
      .from("med_caregiver_access")
      .update({
        permissions,
      })
      .eq("id", fixture.caregiverAccess.id);

    expect(error).toBeNull();

    await signIn(page, fixture.caregiver.identity);

    await page.goto(`/med/dashboard/family/${fixture.patient.user.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(
      page.getByRole("heading", {
        name: "Appointments",
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        name: "Documents",
      }),
    ).toHaveCount(0);

    await expect(
      page.getByRole("heading", {
        name: "Provider Questions",
      }),
    ).toHaveCount(0);
  });

  test("revocation removes shared dashboard access immediately", async ({
    page,
  }) => {
    const { admin } = createSyntheticSupabaseClients();

    const { error } = await admin
      .from("med_caregiver_access")
      .update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
      })
      .eq("id", fixture.caregiverAccess.id);

    expect(error).toBeNull();

    await signIn(page, fixture.caregiver.identity);

    await page.goto(`/med/dashboard/family/${fixture.patient.user.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(
      page.getByRole("heading", {
        name: "Shared care access unavailable",
      }),
    ).toBeVisible();

    await page.goto("/med/dashboard/family", {
      waitUntil: "domcontentloaded",
    });

    await expect(
      page.getByText(fixture.profile.displayName, {
        exact: true,
      }),
    ).toHaveCount(0);
  });
});
