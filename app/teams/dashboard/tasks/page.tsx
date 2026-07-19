"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProductShell from "../../../components/products/ProductShell";
import { teamsNavItems } from "../../../lib/products/navigation";
import { createClient } from "../../../lib/supabase/client";

type Workspace = { id: string; name: string };

type Project = {
  id: string;
  name: string;
};

type Membership = {
  id: string;
  user_id: string | null;
  invited_email: string | null;
  role: string;
  status: string;
};

type TeamTask = {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  assigned_to: string | null;
  due_at: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: "todo" | "in_progress" | "blocked" | "completed";
  completed_at: string | null;
};

type FormState = {
  title: string;
  description: string;
  projectId: string;
  assignedTo: string;
  dueAt: string;
  priority: TeamTask["priority"];
};

const emptyForm: FormState = {
  title: "",
  description: "",
  projectId: "",
  assignedTo: "",
  dueAt: "",
  priority: "medium",
};

function formatDate(value: string | null) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function TeamTasksPage() {
  const supabase = useMemo(() => createClient(), []);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Membership[]>([]);
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in.");
      setLoading(false);
      return;
    }

    const { data: workspaceData, error: workspaceError } = await supabase
      .from("team_workspaces")
      .select("id, name")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (workspaceError || !workspaceData) {
      setErrorMessage(
        workspaceError?.message || "Create your workspace from Members first."
      );
      setLoading(false);
      return;
    }

    setWorkspace(workspaceData as Workspace);

    const [projectsResult, membersResult, tasksResult] = await Promise.all([
      supabase
        .from("team_projects")
        .select("id, name")
        .eq("workspace_id", workspaceData.id)
        .neq("status", "archived")
        .order("name"),
      supabase
        .from("team_memberships")
        .select("id, user_id, invited_email, role, status")
        .eq("workspace_id", workspaceData.id)
        .neq("status", "removed")
        .order("created_at"),
      supabase
        .from("team_tasks")
        .select(
          "id, title, description, project_id, assigned_to, due_at, priority, status, completed_at"
        )
        .eq("workspace_id", workspaceData.id)
        .order("completed_at", { ascending: true, nullsFirst: true })
        .order("due_at", { ascending: true, nullsFirst: false }),
    ]);

    const firstError =
      projectsResult.error || membersResult.error || tasksResult.error;

    if (firstError) {
      setErrorMessage(firstError.message);
      setLoading(false);
      return;
    }

    setProjects((projectsResult.data || []) as Project[]);
    setMembers((membersResult.data || []) as Membership[]);
    setTasks((tasksResult.data || []) as TeamTask[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  async function addTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (!workspace || !form.title.trim()) {
      setErrorMessage("Task title is required.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("team_tasks").insert({
      workspace_id: workspace.id,
      project_id: form.projectId || null,
      assigned_to: form.assignedTo || null,
      title: form.title.trim(),
      description: form.description.trim() || null,
      due_at: form.dueAt ? new Date(form.dueAt).toISOString() : null,
      priority: form.priority,
      status: "todo",
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setForm(emptyForm);
    setMessage("Task added.");
    await loadData();
  }

  async function updateStatus(id: string, status: TeamTask["status"]) {
    const completedAt =
      status === "completed" ? new Date().toISOString() : null;

    const { error } = await supabase
      .from("team_tasks")
      .update({
        status,
        completed_at: completedAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setTasks((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, status, completed_at: completedAt }
          : item
      )
    );
  }

  async function deleteTask(id: string) {
    const { error } = await supabase.from("team_tasks").delete().eq("id", id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setTasks((current) => current.filter((item) => item.id !== id));
  }

  const memberLabel = (userId: string | null) => {
    if (!userId) return "Unassigned";
    const member = members.find((item) => item.user_id === userId);
    return member?.invited_email || member?.role || "Team member";
  };

  return (
    <ProductShell
      productName="SchedNest Teams"
      productLabel="Team workspace"
      accent="violet"
      navItems={[...teamsNavItems]}
    >
      <section className="rounded-[2rem] border border-violet-400/20 bg-violet-400/10 p-7">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-violet-300">
          Live task board
        </p>
        <h2 className="mt-3 text-4xl font-black">Tasks</h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-300">
          Assign work, set priorities, connect tasks to projects, and track progress.
        </p>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <form
          onSubmit={addTask}
          className="rounded-[2rem] border border-violet-200/10 bg-white/[0.04] p-6"
        >
          <h3 className="text-xl font-black">Add a task</h3>

          <div className="mt-5 space-y-4">
            <input
              value={form.title}
              onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
              placeholder="Task title"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
            />

            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((c) => ({ ...c, description: e.target.value }))
              }
              placeholder="Description"
              rows={4}
              className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
            />

            <select
              value={form.projectId}
              onChange={(e) =>
                setForm((c) => ({ ...c, projectId: e.target.value }))
              }
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
            >
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            <select
              value={form.assignedTo}
              onChange={(e) =>
                setForm((c) => ({ ...c, assignedTo: e.target.value }))
              }
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
            >
              <option value="">Unassigned</option>
              {members
                .filter((member) => member.user_id)
                .map((member) => (
                  <option key={member.id} value={member.user_id || ""}>
                    {member.invited_email || member.role}
                  </option>
                ))}
            </select>

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="datetime-local"
                value={form.dueAt}
                onChange={(e) =>
                  setForm((c) => ({ ...c, dueAt: e.target.value }))
                }
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
              />

              <select
                value={form.priority}
                onChange={(e) =>
                  setForm((c) => ({
                    ...c,
                    priority: e.target.value as TeamTask["priority"],
                  }))
                }
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
              >
                <option value="low">Low priority</option>
                <option value="medium">Medium priority</option>
                <option value="high">High priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 rounded-2xl border border-violet-300/20 bg-violet-300/10 px-5 py-3 text-sm font-black text-violet-100"
          >
            {saving ? "Adding..." : "Add task"}
          </button>
        </form>

        <section className="rounded-[2rem] border border-violet-200/10 bg-white/[0.04] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black">
                {workspace?.name || "Team tasks"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">{tasks.length} task(s)</p>
            </div>

            <button
              type="button"
              onClick={() => void loadData()}
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-black text-gray-300"
            >
              Refresh
            </button>
          </div>

          {message ? <p className="mt-4 text-emerald-200">{message}</p> : null}
          {errorMessage ? <p className="mt-4 text-red-200">{errorMessage}</p> : null}

          {loading ? (
            <p className="mt-6 text-sm text-gray-400">Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <p className="mt-6 text-sm text-gray-500">No tasks yet.</p>
          ) : (
            <div className="mt-6 space-y-3">
              {tasks.map((task) => (
                <article
                  key={task.id}
                  className={`rounded-[1.5rem] border border-white/10 bg-black/10 p-5 ${
                    task.completed_at ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h4 className="font-black">{task.title}</h4>
                      <p className="mt-2 text-sm text-gray-500">
                        {memberLabel(task.assigned_to)} · {task.priority} ·{" "}
                        {formatDate(task.due_at)}
                      </p>
                      {task.description ? (
                        <p className="mt-2 text-sm text-gray-500">
                          {task.description}
                        </p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => void deleteTask(task.id)}
                      className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-gray-400"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(["todo", "in_progress", "blocked", "completed"] as TeamTask["status"][]).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => void updateStatus(task.id, status)}
                        className={`rounded-xl border px-3 py-2 text-xs font-black ${
                          task.status === status
                            ? "border-violet-300/20 bg-violet-300/15 text-violet-100"
                            : "border-white/10 text-gray-500"
                        }`}
                      >
                        {status.replaceAll("_", " ")}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </ProductShell>
  );
}
