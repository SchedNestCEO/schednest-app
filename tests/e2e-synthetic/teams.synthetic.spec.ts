import {
  expect,
  test,
  type Page,
} from "@playwright/test";
import {
  cleanupSyntheticTeams,
  seedSyntheticTeams,
  type SyntheticTeamsFixture,
} from "../fixtures/teams";
import type {
  SyntheticIdentity,
} from "../fixtures/identities";
import {
  createAuthenticatedSyntheticClient,
  createSyntheticSupabaseClients,
} from "../fixtures/supabase";

let fixture: SyntheticTeamsFixture;

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

test.describe.serial(
  "SchedNest Teams workflows",
  () => {
    test.beforeAll(async () => {
      fixture =
        await seedSyntheticTeams();
    });

    test.afterAll(async () => {
      await cleanupSyntheticTeams(
        fixture,
      );
    });

    test(
      "owner and active member resolve the shared workspace across every Teams surface",
      async ({ page }) => {
        const routes = [
          {
            path: "/teams/dashboard",
            heading:
              fixture.workspaceA.name,
          },
          {
            path:
              "/teams/dashboard/members",
            heading: "Members",
          },
          {
            path:
              "/teams/dashboard/projects",
            heading: "Projects",
          },
          {
            path:
              "/teams/dashboard/tasks",
            heading: "Tasks",
          },
          {
            path:
              "/teams/dashboard/requests",
            heading: "Requests",
          },
          {
            path:
              "/teams/dashboard/schedule",
            heading: "Team Schedule",
          },
          {
            path:
              "/teams/dashboard/availability",
            heading: "Availability",
          },
          {
            path:
              "/teams/dashboard/workload",
            heading: "Workload",
          },
        ] as const;

        for (const actor of [
          fixture.ownerA,
          fixture.memberA,
        ]) {
          await signIn(
            page,
            actor.identity,
          );

          for (const route of routes) {
            await page.goto(
              route.path,
              {
                waitUntil:
                  "domcontentloaded",
              },
            );

            await expect(
              page
                .getByRole("heading", {
                  name: route.heading,
                })
                .first(),
            ).toBeVisible();
          }
        }

        const { admin } =
          createSyntheticSupabaseClients();

        const {
          data: memberOwnedWorkspaces,
          error: ownedError,
        } = await admin
          .from("team_workspaces")
          .select("id")
          .eq(
            "owner_id",
            fixture.memberA.user.id,
          );

        expect(ownedError).toBeNull();

        expect(
          memberOwnedWorkspaces || [],
        ).toHaveLength(0);

        const memberClient =
          await createAuthenticatedSyntheticClient(
            fixture.memberA.identity,
          );

        const {
          data: foreignWorkspace,
          error: foreignError,
        } = await memberClient
          .from("team_workspaces")
          .select("id")
          .eq(
            "id",
            fixture.workspaceB.id,
          );

        expect(foreignError).toBeNull();

        expect(
          foreignWorkspace || [],
        ).toHaveLength(0);
      },
    );

    test(
      "workspace owner can rename the workspace and manage invitations",
      async ({ page }) => {
        const workspaceName =
          "Synthetic Operations Command";

        const invitedEmail =
          "synthetic-invite@schednest.test";

        await signIn(
          page,
          fixture.ownerA.identity,
        );

        await page.goto(
          "/teams/dashboard/members",
          {
            waitUntil:
              "domcontentloaded",
          },
        );

        await expect(
          page.getByText(
            "Loading members...",
            {
              exact: true,
            },
          ),
        ).toHaveCount(0);

        const workspaceInput =
          page.getByLabel(
            "Workspace name",
          );

        await expect(
          workspaceInput,
        ).toBeEnabled();

        await workspaceInput.fill(
          workspaceName,
        );

        await expect(
          workspaceInput,
        ).toHaveValue(
          workspaceName,
        );

        await page
          .getByRole("button", {
            name: "Save workspace",
          })
          .click();

        await expect(
          page.getByText(
            "Workspace name updated.",
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        const invitationEmail =
          page.getByPlaceholder(
            "teammate@example.com",
          );

        await invitationEmail.fill(
          invitedEmail,
        );

        await expect(
          invitationEmail,
        ).toHaveValue(
          invitedEmail,
        );

        await page
          .getByLabel("Role")
          .selectOption("manager");

        await page
          .getByRole("button", {
            name: "Create invitation",
          })
          .click();

        await expect(
          page.getByText(
            "Team invitation created.",
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        const invitationCard =
          page
            .getByText(
              invitedEmail,
              {
                exact: true,
              },
            )
            .locator(
              "xpath=ancestor::article[1]",
            );

        await expect(
          invitationCard,
        ).toContainText("Manager");

        await expect(
          invitationCard,
        ).toContainText("Pending");

        const { admin } =
          createSyntheticSupabaseClients();

        const {
          data: workspace,
          error: workspaceError,
        } = await admin
          .from("team_workspaces")
          .select("name")
          .eq(
            "id",
            fixture.workspaceA.id,
          )
          .single();

        expect(
          workspaceError,
        ).toBeNull();

        expect(
          workspace?.name,
        ).toBe(workspaceName);

        const {
          data: invitation,
          error: invitationError,
        } = await admin
          .from("team_memberships")
          .select(
            "invited_email, role, status",
          )
          .eq(
            "workspace_id",
            fixture.workspaceA.id,
          )
          .eq(
            "invited_email",
            invitedEmail,
          )
          .single();

        expect(
          invitationError,
        ).toBeNull();

        expect(
          invitation?.role,
        ).toBe("manager");

        expect(
          invitation?.status,
        ).toBe("pending");

        await signIn(
          page,
          fixture.memberA.identity,
        );

        await page.goto(
          "/teams/dashboard/members",
          {
            waitUntil:
              "domcontentloaded",
          },
        );

        await expect(
          page.getByText(
            "Loading members...",
            {
              exact: true,
            },
          ),
        ).toHaveCount(0);

        await expect(
          page.getByLabel(
            "Workspace name",
          ),
        ).toBeDisabled();

        await expect(
          page.getByRole("button", {
            name: "Save workspace",
          }),
        ).toBeDisabled();

        await expect(
          page.getByRole("button", {
            name: "Create invitation",
          }),
        ).toBeDisabled();
      },
    );
    test(
      "owner can create and update a project",
      async ({ page }) => {
        const projectName =
          "Synthetic Launch Project";

        await signIn(
          page,
          fixture.ownerA.identity,
        );

        await page.goto(
          "/teams/dashboard/projects",
          {
            waitUntil:
              "domcontentloaded",
          },
        );

        await expect(
          page.getByText(
            "Loading projects...",
            {
              exact: true,
            },
          ),
        ).toHaveCount(0);

        const projectNameInput =
          page.getByPlaceholder(
            "Project name",
          );

        await projectNameInput.fill(
          projectName,
        );

        await page
          .getByPlaceholder(
            "Description",
          )
          .fill(
            "Synthetic launch coordination project.",
          );

        const form =
          page
            .getByRole("heading", {
              name: "Add a project",
            })
            .locator(
              "xpath=ancestor::form[1]",
            );

        const dates =
          form.locator(
            'input[type="date"]',
          );

        await dates
          .nth(0)
          .fill("2027-04-01");

        await dates
          .nth(1)
          .fill("2027-04-30");

        await form
          .locator("select")
          .selectOption("active");

        await form
          .getByRole("button", {
            name: "Add project",
          })
          .click();

        await expect(
          page.getByText(
            "Project added successfully.",
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        const projectCard =
          page
            .getByText(
              projectName,
              {
                exact: true,
              },
            )
            .locator(
              "xpath=ancestor::article[1]",
            );

        await expect(
          projectCard,
        ).toContainText("active");

        await projectCard
          .getByRole("button", {
            name: "Blocked",
          })
          .click();

        await expect(
          page.getByText(
            "Project updated.",
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        const { admin } =
          createSyntheticSupabaseClients();

        const {
          data: project,
          error,
        } = await admin
          .from("team_projects")
          .select(
            "workspace_id, name, status, created_by",
          )
          .eq(
            "workspace_id",
            fixture.workspaceA.id,
          )
          .eq("name", projectName)
          .single();

        expect(error).toBeNull();

        expect(
          project?.workspace_id,
        ).toBe(
          fixture.workspaceA.id,
        );

        expect(
          project?.created_by,
        ).toBe(
          fixture.ownerA.user.id,
        );

        expect(
          project?.status,
        ).toBe("blocked");

        const {
          data: foreignProjects,
          error: foreignError,
        } = await admin
          .from("team_projects")
          .select("id")
          .eq(
            "workspace_id",
            fixture.workspaceB.id,
          )
          .eq("name", projectName);

        expect(
          foreignError,
        ).toBeNull();

        expect(
          foreignProjects || [],
        ).toHaveLength(0);
      },
    );
    test(
      "owner can create, assign, and complete a project task",
      async ({ page }) => {
        const projectName =
          "Synthetic Launch Project";

        const taskTitle =
          "Synthetic Critical Path Task";

        await signIn(
          page,
          fixture.ownerA.identity,
        );

        await page.goto(
          "/teams/dashboard/tasks",
          {
            waitUntil:
              "domcontentloaded",
          },
        );

        await expect(
          page.getByText(
            "Loading tasks...",
            {
              exact: true,
            },
          ),
        ).toHaveCount(0);

        const form =
          page
            .getByRole("heading", {
              name: "Add a task",
            })
            .locator(
              "xpath=ancestor::form[1]",
            );

        await form
          .getByPlaceholder(
            "Task title",
          )
          .fill(taskTitle);

        await form
          .getByPlaceholder(
            "Description",
          )
          .fill(
            "Synthetic shared task assignment.",
          );

        const selects =
          form.locator("select");

        await selects
          .nth(0)
          .selectOption({
            label: projectName,
          });

        await selects
          .nth(1)
          .selectOption({
            label:
              fixture.memberA.identity.email,
          });

        await form
          .locator(
            'input[type="datetime-local"]',
          )
          .fill("2027-04-10T09:00");

        await selects
          .nth(2)
          .selectOption("urgent");

        await form
          .getByRole("button", {
            name: "Add task",
          })
          .click();

        await expect(
          page.getByText(
            "Task added.",
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        const taskCard =
          page
            .getByText(
              taskTitle,
              {
                exact: true,
              },
            )
            .locator(
              "xpath=ancestor::article[1]",
            );

        await expect(
          taskCard,
        ).toContainText("urgent");

        await expect(
          taskCard,
        ).toContainText(
          fixture.memberA.identity.email,
        );

        const { admin } =
          createSyntheticSupabaseClients();

        const {
          data: createdTask,
          error: createdTaskError,
        } = await admin
          .from("team_tasks")
          .select(
            "id, project_id, created_by, assigned_to, priority, status, completed_at",
          )
          .eq(
            "workspace_id",
            fixture.workspaceA.id,
          )
          .eq("title", taskTitle)
          .single();

        expect(
          createdTaskError,
        ).toBeNull();

        expect(
          createdTask?.created_by,
        ).toBe(
          fixture.ownerA.user.id,
        );

        expect(
          createdTask?.assigned_to,
        ).toBe(
          fixture.memberA.user.id,
        );

        expect(
          createdTask?.priority,
        ).toBe("urgent");

        expect(
          createdTask?.status,
        ).toBe("todo");

        await taskCard
          .getByRole("button", {
            name: "Completed",
          })
          .click();

        await expect.poll(
          async () => {
            const {
              data,
              error,
            } = await admin
              .from("team_tasks")
              .select(
                "status, completed_at",
              )
              .eq(
                "id",
                createdTask?.id,
              )
              .single();

            if (error) {
              throw new Error(
                error.message,
              );
            }

            return {
              status: data?.status,
              completed:
                Boolean(
                  data?.completed_at,
                ),
            };
          },
          {
            timeout: 15_000,
          },
        ).toEqual({
          status: "completed",
          completed: true,
        });

        await expect(
          taskCard,
        ).toHaveClass(/opacity-60/);
      },
    );
    test(
      "active member can persist personal availability",
      async ({ page }) => {
        await signIn(
          page,
          fixture.memberA.identity,
        );

        await page.goto(
          "/teams/dashboard/availability",
          {
            waitUntil:
              "domcontentloaded",
          },
        );

        await expect(
          page.getByText(
            "Loading availability...",
            {
              exact: true,
            },
          ),
        ).toHaveCount(0);

        const mondayCard =
          page
            .getByText(
              "Monday",
              {
                exact: true,
              },
            )
            .locator(
              "xpath=ancestor::article[1]",
            );

        const timeInputs =
          mondayCard.locator(
            'input[type="time"]',
          );

        await timeInputs
          .nth(0)
          .fill("08:00");

        await timeInputs
          .nth(1)
          .fill("16:30");

        await mondayCard
          .getByPlaceholder("Notes")
          .fill(
            "Synthetic member availability",
          );

        await page
          .getByRole("button", {
            name: "Save availability",
          })
          .click();

        await expect(
          page.getByText(
            "Availability saved.",
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        const { admin } =
          createSyntheticSupabaseClients();

        await expect.poll(
          async () => {
            const {
              data,
              error,
            } = await admin
              .from(
                "team_availability",
              )
              .select(
                "available_from, available_until, notes",
              )
              .eq(
                "workspace_id",
                fixture.workspaceA.id,
              )
              .eq(
                "user_id",
                fixture.memberA.user.id,
              )
              .eq("day_of_week", 1)
              .single();

            if (error) {
              throw new Error(
                error.message,
              );
            }

            return {
              from:
                data?.available_from,
              until:
                data?.available_until,
              notes: data?.notes,
            };
          },
          {
            timeout: 15_000,
          },
        ).toEqual({
          from: "08:00:00",
          until: "16:30:00",
          notes:
            "Synthetic member availability",
        });

        const {
          data: foreignAvailability,
          error: foreignError,
        } = await admin
          .from("team_availability")
          .select("id")
          .eq(
            "workspace_id",
            fixture.workspaceB.id,
          )
          .eq(
            "user_id",
            fixture.memberA.user.id,
          );

        expect(
          foreignError,
        ).toBeNull();

        expect(
          foreignAvailability || [],
        ).toHaveLength(0);
      },
    );
    test(
      "member creates a request and owner approves it",
      async ({ page }) => {
        const requestTitle =
          "Synthetic Coverage Request";

        await signIn(
          page,
          fixture.memberA.identity,
        );

        await page.goto(
          "/teams/dashboard/requests",
          {
            waitUntil:
              "domcontentloaded",
          },
        );

        await expect(
          page.getByText(
            "Loading requests...",
            {
              exact: true,
            },
          ),
        ).toHaveCount(0);

        const form =
          page
            .getByRole("heading", {
              name: "Create a request",
            })
            .locator(
              "xpath=ancestor::form[1]",
            );

        await form
          .getByPlaceholder(
            "Request title",
          )
          .fill(requestTitle);

        await form
          .locator("select")
          .selectOption("coverage");

        await form
          .getByPlaceholder(
            "Description",
          )
          .fill(
            "Synthetic coverage support request.",
          );

        const dates =
          form.locator(
            'input[type="datetime-local"]',
          );

        await dates
          .nth(0)
          .fill("2027-04-12T08:00");

        await dates
          .nth(1)
          .fill("2027-04-12T12:00");

        await form
          .getByRole("button", {
            name: "Create request",
          })
          .click();

        await expect(
          page.getByText(
            "Request created.",
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        const { admin } =
          createSyntheticSupabaseClients();

        const {
          data: createdRequest,
          error: createdRequestError,
        } = await admin
          .from("team_requests")
          .select(
            "id, status, requested_by",
          )
          .eq(
            "workspace_id",
            fixture.workspaceA.id,
          )
          .eq(
            "title",
            requestTitle,
          )
          .single();

        expect(
          createdRequestError,
        ).toBeNull();

        expect(
          createdRequest?.requested_by,
        ).toBe(
          fixture.memberA.user.id,
        );

        expect(
          createdRequest?.status,
        ).toBe("pending");

        await signIn(
          page,
          fixture.ownerA.identity,
        );

        await page.goto(
          "/teams/dashboard/requests",
          {
            waitUntil:
              "domcontentloaded",
          },
        );

        await expect(
          page.getByText(
            "Loading requests...",
            {
              exact: true,
            },
          ),
        ).toHaveCount(0);

        const requestCard =
          page
            .getByText(
              requestTitle,
              {
                exact: true,
              },
            )
            .locator(
              "xpath=ancestor::article[1]",
            );

        await requestCard
          .getByRole("button", {
            name: "Approved",
          })
          .click();

        await expect.poll(
          async () => {
            const {
              data,
              error,
            } = await admin
              .from("team_requests")
              .select(
                "status, reviewed_by, reviewed_at",
              )
              .eq(
                "id",
                createdRequest?.id,
              )
              .single();

            if (error) {
              throw new Error(
                error.message,
              );
            }

            return {
              status: data?.status,
              reviewedBy:
                data?.reviewed_by,
              reviewed:
                Boolean(
                  data?.reviewed_at,
                ),
            };
          },
          {
            timeout: 15_000,
          },
        ).toEqual({
          status: "approved",
          reviewedBy:
            fixture.ownerA.user.id,
          reviewed: true,
        });

        const {
          data: foreignRequests,
          error: foreignError,
        } = await admin
          .from("team_requests")
          .select("id")
          .eq(
            "workspace_id",
            fixture.workspaceB.id,
          )
          .eq(
            "title",
            requestTitle,
          );

        expect(
          foreignError,
        ).toBeNull();

        expect(
          foreignRequests || [],
        ).toHaveLength(0);
      },
    );
    test(
      "owner creates and completes a shared schedule event",
      async ({ page }) => {
        const eventTitle =
          "Synthetic Planning Meeting";

        await signIn(
          page,
          fixture.ownerA.identity,
        );

        await page.goto(
          "/teams/dashboard/schedule",
          {
            waitUntil:
              "domcontentloaded",
          },
        );

        await expect(
          page.getByText(
            "Loading schedule...",
            {
              exact: true,
            },
          ),
        ).toHaveCount(0);

        const form =
          page
            .getByRole("heading", {
              name: "Add to schedule",
            })
            .locator(
              "xpath=ancestor::form[1]",
            );

        await form
          .getByPlaceholder(
            "Event title",
          )
          .fill(eventTitle);

        await form
          .locator("select")
          .selectOption("meeting");

        const dates =
          form.locator(
            'input[type="datetime-local"]',
          );

        await dates
          .nth(0)
          .fill("2027-04-15T10:00");

        await dates
          .nth(1)
          .fill("2027-04-15T11:00");

        await form
          .getByPlaceholder("Location")
          .fill(
            "Synthetic Room 204",
          );

        await form
          .getByPlaceholder("Notes")
          .fill(
            "Synthetic launch planning notes.",
          );

        await form
          .getByRole("button", {
            name: "Add event",
          })
          .click();

        await expect(
          page.getByText(
            "Team event added.",
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        const eventCard =
          page
            .getByText(
              eventTitle,
              {
                exact: true,
              },
            )
            .locator(
              "xpath=ancestor::article[1]",
            );

        await expect(
          eventCard,
        ).toContainText(
          "Synthetic Room 204",
        );

        const { admin } =
          createSyntheticSupabaseClients();

        const {
          data: createdEvent,
          error: createdEventError,
        } = await admin
          .from("team_events")
          .select(
            "id, created_by, status, event_type, location",
          )
          .eq(
            "workspace_id",
            fixture.workspaceA.id,
          )
          .eq(
            "title",
            eventTitle,
          )
          .single();

        expect(
          createdEventError,
        ).toBeNull();

        expect(
          createdEvent?.created_by,
        ).toBe(
          fixture.ownerA.user.id,
        );

        expect(
          createdEvent?.status,
        ).toBe("scheduled");

        expect(
          createdEvent?.event_type,
        ).toBe("meeting");

        await eventCard
          .getByRole("button", {
            name: "Completed",
          })
          .click();

        await expect.poll(
          async () => {
            const {
              data,
              error,
            } = await admin
              .from("team_events")
              .select("status")
              .eq(
                "id",
                createdEvent?.id,
              )
              .single();

            if (error) {
              throw new Error(
                error.message,
              );
            }

            return data?.status;
          },
          {
            timeout: 15_000,
          },
        ).toBe("completed");

        const {
          data: foreignEvents,
          error: foreignError,
        } = await admin
          .from("team_events")
          .select("id")
          .eq(
            "workspace_id",
            fixture.workspaceB.id,
          )
          .eq(
            "title",
            eventTitle,
          );

        expect(
          foreignError,
        ).toBeNull();

        expect(
          foreignEvents || [],
        ).toHaveLength(0);
      },
    );
    test(
      "dashboard and workload aggregate Workspace A without Workspace B leakage",
      async ({ page }) => {
        const projectName =
          "Synthetic Launch Project";

        const taskTitle =
          "Synthetic Critical Path Task";

        const requestTitle =
          "Synthetic Coverage Request";

        const { admin } =
          createSyntheticSupabaseClients();

        const {
          data: task,
          error: taskLookupError,
        } = await admin
          .from("team_tasks")
          .select("id")
          .eq(
            "workspace_id",
            fixture.workspaceA.id,
          )
          .eq(
            "title",
            taskTitle,
          )
          .single();

        if (
          taskLookupError ||
          !task
        ) {
          throw new Error(
            taskLookupError?.message ||
            "Unable to locate the synthetic Teams task.",
          );
        }

        const {
          error: reopenTaskError,
        } = await admin
          .from("team_tasks")
          .update({
            status: "in_progress",
            completed_at: null,
          })
          .eq("id", task.id);

        if (reopenTaskError) {
          throw new Error(
            reopenTaskError.message,
          );
        }

        await signIn(
          page,
          fixture.ownerA.identity,
        );

        await page.goto(
          "/teams/dashboard",
          {
            waitUntil:
              "domcontentloaded",
          },
        );

        await expect(
          page.getByText(
            "Loading dashboard...",
            {
              exact: true,
            },
          ),
        ).toHaveCount(0);

        await expect(
          page.getByRole("heading", {
            name:
              "Synthetic Operations Command",
          }),
        ).toBeVisible();

        await expect(
          page.getByText(
            projectName,
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        await expect(
          page.getByText(
            requestTitle,
            {
              exact: true,
            },
          ),
        ).toBeVisible();

        await expect(
          page.getByText(
            fixture.workspaceB.name,
            {
              exact: true,
            },
          ),
        ).toHaveCount(0);

        await page.goto(
          "/teams/dashboard/workload",
          {
            waitUntil:
              "domcontentloaded",
          },
        );

        await expect(
          page.getByText(
            "Loading workload...",
            {
              exact: true,
            },
          ),
        ).toHaveCount(0);

        const memberCard =
          page
            .getByText(
              fixture.memberA.identity.email,
              {
                exact: true,
              },
            )
            .locator(
              "xpath=ancestor::article[1]",
            );

        await expect(
          memberCard,
        ).toContainText(
          "1 open task",
        );

        await expect(
          memberCard,
        ).toContainText(
          "1 urgent",
        );

        await expect(
          page.getByText(
            fixture.workspaceB.name,
            {
              exact: true,
            },
          ),
        ).toHaveCount(0);

        const ownerClient =
          await createAuthenticatedSyntheticClient(
            fixture.ownerA.identity,
          );

        const {
          data: visibleForeignTasks,
          error: foreignTaskError,
        } = await ownerClient
          .from("team_tasks")
          .select("id")
          .eq(
            "workspace_id",
            fixture.workspaceB.id,
          );

        expect(
          foreignTaskError,
        ).toBeNull();

        expect(
          visibleForeignTasks || [],
        ).toHaveLength(0);
      },
    );
  },
);
