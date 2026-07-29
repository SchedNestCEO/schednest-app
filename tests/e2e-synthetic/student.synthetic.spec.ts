import {
  expect,
  test,
  type Page,
} from "@playwright/test";
import {
  cleanupSyntheticStudents,
  seedSyntheticStudents,
  type SyntheticStudentFixture,
} from "../fixtures/student";
import type {
  SyntheticIdentity,
} from "../fixtures/identities";
import {
  createAuthenticatedSyntheticClient,
  createSyntheticSupabaseClients,
} from "../fixtures/supabase";

const COURSE_NAME =
  "Synthetic Maternal Health";
const COURSE_CODE =
  "NURS 316";
const ASSIGNMENT_TITLE =
  "Synthetic Postpartum Care Plan";
const EXAM_TITLE =
  "Synthetic Maternal Health Midterm";
const IMPORT_SOURCE =
  "Synthetic Maternal Health Syllabus";

let fixture: SyntheticStudentFixture;
let courseId = "";
let assignmentId = "";
let examId = "";

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

async function accessTokenFor(
  identity: SyntheticIdentity,
): Promise<string> {
  const client =
    await createAuthenticatedSyntheticClient(
      identity,
    );

  const {
    data: { session },
    error,
  } = await client.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error(
      `Unable to obtain access token for ${identity.actor}: ${
        error?.message ||
        "No access token returned"
      }`,
    );
  }

  return session.access_token;
}

async function findOwnedRecordId(
  table: string,
  ownerId: string,
  column: string,
  value: string,
): Promise<string> {
  const { admin } =
    createSyntheticSupabaseClients();

  const { data, error } = await admin
    .from(table)
    .select("id")
    .eq("owner_id", ownerId)
    .eq(column, value)
    .single();

  if (error || !data) {
    throw new Error(
      `Unable to locate ${table} record: ${
        error?.message ||
        "No record returned"
      }`,
    );
  }

  return data.id as string;
}

function recordCard(
  page: Page,
  text: string,
) {
  return page
    .getByText(text, {
      exact: true,
    })
    .locator(
      "xpath=ancestor::article[1]",
    );
}

test.describe.serial(
  "SchedNest Student workflows",
  () => {
    test.beforeAll(async () => {
      fixture =
        await seedSyntheticStudents();
    });

    test.afterAll(async () => {
      await cleanupSyntheticStudents(
        fixture,
      );
    });

    test(
      "Student A can load every Student surface and create an isolated class",
      async ({ page }) => {
        await signIn(
          page,
          fixture.studentA.identity,
        );

        const routes = [
          {
            path: "/student/dashboard",
            heading:
              /Plan school without the chaos|Welcome back,/,
          },
          {
            path:
              "/student/dashboard/classes",
            heading: "Classes",
          },
          {
            path:
              "/student/dashboard/assignments",
            heading: "Assignments",
          },
          {
            path:
              "/student/dashboard/exams",
            heading: "Exams",
          },
          {
            path:
              "/student/dashboard/import",
            heading:
              "Import school information",
          },
        ] as const;

        for (const route of routes) {
          await page.goto(route.path, {
            waitUntil:
              "domcontentloaded",
          });

          await expect(
            page.getByRole("heading", {
              name: route.heading,
              level: 2,
            }),
          ).toBeVisible();
        }

        await page.goto(
          "/student/dashboard/classes",
          {
            waitUntil:
              "domcontentloaded",
          },
        );

        await expect(
          page.getByText("Loading classes...", {
            exact: true,
          }),
        ).toHaveCount(0);

        await expect(
          page.getByText("No classes yet", {
            exact: true,
          }),
        ).toBeVisible();

        await page
          .getByPlaceholder(
            "Anatomy and Physiology",
          )
          .fill(COURSE_NAME);

        await page
          .getByPlaceholder("BIO 201")
          .fill(COURSE_CODE);

        await page
          .getByPlaceholder(
            "Professor name",
          )
          .fill(
            "Synthetic Professor Birdy",
          );

        await page
          .getByPlaceholder(
            "Building or online",
          )
          .fill("Online");

        await page
          .getByRole("button", {
            name: "Add class",
          })
          .click();

        await expect(
          page.getByText(
            "Course added successfully.",
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        const courseCard = recordCard(
          page,
          COURSE_NAME,
        );

        await expect(
          courseCard,
        ).toContainText(COURSE_CODE);

        await expect(
          courseCard,
        ).toContainText(
          "Synthetic Professor Birdy",
        );

        courseId =
          await findOwnedRecordId(
            "student_courses",
            fixture.studentA.user.id,
            "name",
            COURSE_NAME,
          );

        const studentBClient =
          await createAuthenticatedSyntheticClient(
            fixture.studentB.identity,
          );

        const {
          data: foreignCourses,
          error: foreignReadError,
        } = await studentBClient
          .from("student_courses")
          .select("id, name")
          .eq("id", courseId);

        expect(
          foreignReadError,
        ).toBeNull();

        expect(
          foreignCourses || [],
        ).toHaveLength(0);

        const {
          data: foreignUpdateRows,
          error: foreignUpdateError,
        } = await studentBClient
          .from("student_courses")
          .update({
            status: "archived",
          })
          .eq("id", courseId)
          .select("id");

        expect(
          foreignUpdateError,
        ).toBeNull();

        expect(
          foreignUpdateRows || [],
        ).toHaveLength(0);
      },
    );

    test(
      "Student A can create and complete a course-linked assignment",
      async ({ page }) => {
        await signIn(
          page,
          fixture.studentA.identity,
        );

        await page.goto(
          "/student/dashboard/assignments",
          {
            waitUntil:
              "domcontentloaded",
          },
        );

        await expect(
          page.getByText(
            "Loading assignments...",
            {
              exact: true,
            },
          ),
        ).toHaveCount(0);

        const courseSelect =
          page.getByLabel("Course");

        await expect(
          courseSelect.locator(
            `option:has-text("${COURSE_CODE} — ${COURSE_NAME}")`,
          ),
        ).toHaveCount(1);

        const assignmentTitle =
          page.getByPlaceholder(
            "Chapter 4 discussion post",
          );

        await assignmentTitle.fill(
          ASSIGNMENT_TITLE,
        );

        await expect(
          assignmentTitle,
        ).toHaveValue(
          ASSIGNMENT_TITLE,
        );

        await courseSelect.selectOption({
          label:
            `${COURSE_CODE} — ${COURSE_NAME}`,
        });

        await page
          .locator(
            'input[type="datetime-local"]',
          )
          .fill("2027-03-10T10:00");

        await page
          .getByLabel("Priority")
          .selectOption("urgent");

        await page
          .getByPlaceholder(
            "Add instructions or notes",
          )
          .fill(
            "Complete the synthetic postpartum nursing care plan.",
          );

        await page
          .getByRole("button", {
            name: "Add assignment",
          })
          .click();

        await expect(
          page.getByText(
            "Assignment added successfully.",
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        const assignmentCard =
          recordCard(
            page,
            ASSIGNMENT_TITLE,
          );

        await expect(
          assignmentCard,
        ).toContainText("urgent");

        await expect(
          assignmentCard,
        ).toContainText(COURSE_CODE);

        await assignmentCard
          .getByRole("button", {
            name: "In progress",
          })
          .click();

        await expect(
          page.getByText(
            "Assignment updated.",
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        await expect(
          assignmentCard,
        ).toContainText(
          "Status: In progress",
        );

        await assignmentCard
          .getByRole("button", {
            name: "Completed",
          })
          .click();

        await expect(
          assignmentCard,
        ).toContainText(
          "Status: Completed",
        );

        assignmentId =
          await findOwnedRecordId(
            "student_assignments",
            fixture.studentA.user.id,
            "title",
            ASSIGNMENT_TITLE,
          );

        const { admin } =
          createSyntheticSupabaseClients();

        const {
          data: assignment,
          error,
        } = await admin
          .from("student_assignments")
          .select(
            "course_id, priority, status, completed_at",
          )
          .eq("id", assignmentId)
          .single();

        expect(error).toBeNull();
        expect(
          assignment?.course_id,
        ).toBe(courseId);
        expect(
          assignment?.priority,
        ).toBe("urgent");
        expect(
          assignment?.status,
        ).toBe("completed");
        expect(
          assignment?.completed_at,
        ).not.toBeNull();
      },
    );

    test(
      "Student A can create and update a course-linked exam",
      async ({ page }) => {
        await signIn(
          page,
          fixture.studentA.identity,
        );

        await page.goto(
          "/student/dashboard/exams",
          {
            waitUntil:
              "domcontentloaded",
          },
        );

        await expect(
          page.getByText(
            "Loading exams...",
            {
              exact: true,
            },
          ),
        ).toHaveCount(0);

        const examCourseSelect =
          page.getByLabel("Course");

        await expect(
          examCourseSelect.locator(
            `option:has-text("${COURSE_CODE} — ${COURSE_NAME}")`,
          ),
        ).toHaveCount(1);

        const examTitle =
          page.getByPlaceholder(
            "Midterm exam",
          );

        await examTitle.fill(
          EXAM_TITLE,
        );

        await expect(
          examTitle,
        ).toHaveValue(
          EXAM_TITLE,
        );

        await examCourseSelect.selectOption({
          label:
            `${COURSE_CODE} — ${COURSE_NAME}`,
        });

        await page
          .locator(
            'input[type="datetime-local"]',
          )
          .fill("2027-03-15T09:00");

        await page
          .getByPlaceholder(
            "Room 204 or online",
          )
          .fill("Room 204");

        await page
          .getByPlaceholder(
            "Chapters, materials, or preparation notes",
          )
          .fill(
            "Synthetic review chapters 1 through 6.",
          );

        await page
          .getByRole("button", {
            name: "Add exam",
          })
          .click();

        await expect(
          page.getByText(
            "Exam added successfully.",
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        const examCard = recordCard(
          page,
          EXAM_TITLE,
        );

        await expect(
          examCard,
        ).toContainText(COURSE_CODE);

        await expect(
          examCard,
        ).toContainText("Room 204");

        await examCard
          .getByRole("button", {
            name: "Completed",
          })
          .click();

        await expect(
          page.getByText(
            "Exam updated.",
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        await expect(
          examCard,
        ).toContainText("Completed");

        examId =
          await findOwnedRecordId(
            "student_exams",
            fixture.studentA.user.id,
            "title",
            EXAM_TITLE,
          );

        const { admin } =
          createSyntheticSupabaseClients();

        const {
          data: exam,
          error,
        } = await admin
          .from("student_exams")
          .select(
            "course_id, status, location",
          )
          .eq("id", examId)
          .single();

        expect(error).toBeNull();
        expect(
          exam?.course_id,
        ).toBe(courseId);
        expect(
          exam?.status,
        ).toBe("completed");
        expect(
          exam?.location,
        ).toBe("Room 204");
      },
    );

    test(
      "Student dashboard aggregates active coursework without cross-owner leakage",
      async ({ page }) => {
        const { admin } =
          createSyntheticSupabaseClients();

        const { error: assignmentError } =
          await admin
            .from(
              "student_assignments",
            )
            .update({
              status: "in_progress",
              completed_at: null,
            })
            .eq("id", assignmentId);

        if (assignmentError) {
          throw new Error(
            assignmentError.message,
          );
        }

        const { error: examError } =
          await admin
            .from("student_exams")
            .update({
              status: "upcoming",
            })
            .eq("id", examId);

        if (examError) {
          throw new Error(
            examError.message,
          );
        }

        await signIn(
          page,
          fixture.studentA.identity,
        );

        await page.goto(
          "/student/dashboard",
          {
            waitUntil:
              "domcontentloaded",
          },
        );

        await expect(
          page.getByText(
            `${COURSE_CODE} · ${COURSE_NAME}`,
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        await expect(
          page.getByText(
            ASSIGNMENT_TITLE,
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        await expect(
          page.getByText(
            EXAM_TITLE,
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        const studentBClient =
          await createAuthenticatedSyntheticClient(
            fixture.studentB.identity,
          );

        for (const table of [
          "student_profiles",
          "student_courses",
          "student_assignments",
          "student_exams",
          "student_imports",
        ]) {
          const {
            data,
            error,
          } = await studentBClient
            .from(table)
            .select("id");

          expect(error).toBeNull();
          expect(data || []).toHaveLength(
            0,
          );
        }
      },
    );

    test(
      "Student import API enforces authentication, ownership, extraction, and failure handling",
      async ({ request }) => {
        const {
          admin,
        } = createSyntheticSupabaseClients();

        const studentAToken =
          await accessTokenFor(
            fixture.studentA.identity,
          );

        const studentBToken =
          await accessTokenFor(
            fixture.studentB.identity,
          );

        const missingToken =
          await request.post(
            "/api/student/imports/process",
            {
              data: {
                importId:
                  "00000000-0000-0000-0000-000000000000",
              },
            },
          );

        expect(
          missingToken.status(),
        ).toBe(401);

        const invalidToken =
          await request.post(
            "/api/student/imports/process",
            {
              headers: {
                Authorization:
                  "Bearer invalid-synthetic-token",
              },
              data: {
                importId:
                  "00000000-0000-0000-0000-000000000000",
              },
            },
          );

        expect(
          invalidToken.status(),
        ).toBe(401);

        const missingImportId =
          await request.post(
            "/api/student/imports/process",
            {
              headers: {
                Authorization:
                  `Bearer ${studentAToken}`,
              },
              data: {},
            },
          );

        expect(
          missingImportId.status(),
        ).toBe(400);

        const textPath =
          `${fixture.studentA.user.id}/synthetic-student-syllabus.txt`;

        const textContent = [
          "Synthetic Maternal Health",
          "Assignment: Postpartum care plan",
          "Exam: Maternal health midterm",
        ].join("\n");

        const {
          error: textUploadError,
        } = await admin.storage
          .from("student-imports")
          .upload(
            textPath,
            Buffer.from(textContent),
            {
              contentType:
                "text/plain",
              upsert: true,
            },
          );

        if (textUploadError) {
          throw new Error(
            textUploadError.message,
          );
        }

        const {
          data: textImport,
          error: textInsertError,
        } = await admin
          .from("student_imports")
          .insert({
            owner_id:
              fixture.studentA.user.id,
            source_type:
              "syllabus",
            source_name:
              IMPORT_SOURCE,
            file_name:
              "synthetic-student-syllabus.txt",
            file_path: textPath,
            mime_type: "text/plain",
            status: "uploaded",
          })
          .select("id")
          .single();

        if (
          textInsertError ||
          !textImport
        ) {
          throw new Error(
            textInsertError?.message ||
              "Text import was not created.",
          );
        }

        const foreignAttempt =
          await request.post(
            "/api/student/imports/process",
            {
              headers: {
                Authorization:
                  `Bearer ${studentBToken}`,
              },
              data: {
                importId:
                  textImport.id,
              },
            },
          );

        expect(
          foreignAttempt.status(),
        ).toBe(404);

        const textResponse =
          await request.post(
            "/api/student/imports/process",
            {
              headers: {
                Authorization:
                  `Bearer ${studentAToken}`,
              },
              data: {
                importId:
                  textImport.id,
              },
            },
          );

        expect(
          textResponse.status(),
        ).toBe(200);

        const textResult =
          await textResponse.json();

        expect(
          textResult.status,
        ).toBe("needs_review");

        expect(
          textResult.charactersExtracted,
        ).toBe(textContent.length);

        const {
          data: processedTextImport,
          error: processedTextError,
        } = await admin
          .from("student_imports")
          .select(
            "status, raw_text, error_message",
          )
          .eq("id", textImport.id)
          .single();

        expect(
          processedTextError,
        ).toBeNull();

        expect(
          processedTextImport?.status,
        ).toBe("needs_review");

        expect(
          processedTextImport?.raw_text,
        ).toBe(textContent);

        expect(
          processedTextImport?.error_message,
        ).toBeNull();

        const pdfPath =
          `${fixture.studentA.user.id}/synthetic-student-syllabus.pdf`;

        const {
          error: pdfUploadError,
        } = await admin.storage
          .from("student-imports")
          .upload(
            pdfPath,
            Buffer.from(
              "%PDF-1.4 synthetic test",
            ),
            {
              contentType:
                "application/pdf",
              upsert: true,
            },
          );

        if (pdfUploadError) {
          throw new Error(
            pdfUploadError.message,
          );
        }

        const {
          data: pdfImport,
          error: pdfInsertError,
        } = await admin
          .from("student_imports")
          .insert({
            owner_id:
              fixture.studentA.user.id,
            source_type:
              "syllabus",
            source_name:
              "Synthetic PDF Import",
            file_name:
              "synthetic-student-syllabus.pdf",
            file_path: pdfPath,
            mime_type:
              "application/pdf",
            status: "uploaded",
          })
          .select("id")
          .single();

        if (
          pdfInsertError ||
          !pdfImport
        ) {
          throw new Error(
            pdfInsertError?.message ||
              "PDF import was not created.",
          );
        }

        const pdfResponse =
          await request.post(
            "/api/student/imports/process",
            {
              headers: {
                Authorization:
                  `Bearer ${studentAToken}`,
              },
              data: {
                importId:
                  pdfImport.id,
              },
            },
          );

        expect(
          pdfResponse.status(),
        ).toBe(200);

        const pdfResult =
          await pdfResponse.json();

        expect(
          pdfResult.status,
        ).toBe("needs_review");

        const {
          data: stagedPdf,
          error: stagedPdfError,
        } = await admin
          .from("student_imports")
          .select(
            "status, error_message",
          )
          .eq("id", pdfImport.id)
          .single();

        expect(
          stagedPdfError,
        ).toBeNull();

        expect(
          stagedPdf?.status,
        ).toBe("needs_review");

        expect(
          stagedPdf?.error_message,
        ).toContain(
          "Automatic PDF and DOCX extraction is not enabled yet.",
        );

        const emptyPath =
          `${fixture.studentA.user.id}/synthetic-empty-syllabus.txt`;

        const {
          error: emptyUploadError,
        } = await admin.storage
          .from("student-imports")
          .upload(
            emptyPath,
            Buffer.from(""),
            {
              contentType:
                "text/plain",
              upsert: true,
            },
          );

        if (emptyUploadError) {
          throw new Error(
            emptyUploadError.message,
          );
        }

        const {
          data: emptyImport,
          error: emptyInsertError,
        } = await admin
          .from("student_imports")
          .insert({
            owner_id:
              fixture.studentA.user.id,
            source_type:
              "syllabus",
            source_name:
              "Synthetic Empty Import",
            file_name:
              "synthetic-empty-syllabus.txt",
            file_path: emptyPath,
            mime_type: "text/plain",
            status: "uploaded",
          })
          .select("id")
          .single();

        if (
          emptyInsertError ||
          !emptyImport
        ) {
          throw new Error(
            emptyInsertError?.message ||
              "Empty import was not created.",
          );
        }

        const emptyResponse =
          await request.post(
            "/api/student/imports/process",
            {
              headers: {
                Authorization:
                  `Bearer ${studentAToken}`,
              },
              data: {
                importId:
                  emptyImport.id,
              },
            },
          );

        expect(
          emptyResponse.status(),
        ).toBe(422);

        const {
          data: failedImport,
          error: failedImportError,
        } = await admin
          .from("student_imports")
          .select(
            "status, error_message",
          )
          .eq("id", emptyImport.id)
          .single();

        expect(
          failedImportError,
        ).toBeNull();

        expect(
          failedImport?.status,
        ).toBe("failed");

        expect(
          failedImport?.error_message,
        ).toBe(
          "No readable text was found in the uploaded file.",
        );
      },
    );

    test(
      "Student import history and dashboard expose only Student A records",
      async ({ page }) => {
        await signIn(
          page,
          fixture.studentA.identity,
        );

        await page.goto(
          "/student/dashboard/import",
          {
            waitUntil:
              "domcontentloaded",
          },
        );

        await expect(
          page.getByText(
            IMPORT_SOURCE,
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        await expect(
          page.getByText(
            "Synthetic PDF Import",
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        await page.goto(
          "/student/dashboard",
          {
            waitUntil:
              "domcontentloaded",
          },
        );

        await expect(
          page.getByText(
            IMPORT_SOURCE,
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        await signIn(
          page,
          fixture.studentB.identity,
        );

        await page.goto(
          "/student/dashboard/import",
          {
            waitUntil:
              "domcontentloaded",
          },
        );

        await expect(
          page.getByText(
            IMPORT_SOURCE,
            {
              exact: true,
            },
          ),
        ).toHaveCount(0);

        await expect(
          page.getByText(
            "No imports yet",
            {
              exact: true,
            },
          ),
        ).toBeVisible();
      },
    );
  },
);
