"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProductShell from "../../../components/products/ProductShell";
import { teamsNavItems } from "../../../lib/products/navigation";
import { createClient } from "../../../lib/supabase/client";

type Workspace = { id: string; name: string };

type Project = {
  id: string;
  name: string;
  description: string | null;
  starts_on: string | null;
  due_on: string | null;
  status: "planned" | "active" | "blocked" | "completed" | "archived";
};

type FormState = {
  name: string;
  description: string;
  startsOn: string;
  dueOn: string;
  status: Project["status"];
};

const emptyForm: FormState = {
  name: "",
  description: "",
  startsOn: "",
  dueOn: "",
  status: "planned",
};

export default function TeamProjectsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in to view projects.");
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

    if (workspaceError) {
      setErrorMessage(workspaceError.message);
      setLoading(false);
      return;
    }

    if (!workspaceData) {
      setWorkspace(null);
      setProjects([]);
      setLoading(false);
      return;
    }

    setWorkspace(workspaceData as Workspace);

    const { data, error } = await supabase
      .from("team_projects")
      .select("id, name, description, starts_on, due_on, status")
      .eq("workspace_id", workspaceData.id)
      .neq("status", "archived")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setProjects((data || []) as Project[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProjects();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadProjects]);

  async function addProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (!workspace) {
      setErrorMessage("Create a team workspace first from Members.");
      return;
    }

    const name = form.name.trim();
    if (!name) {
      setErrorMessage("Project name is required.");
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setErrorMessage("You must be signed in.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("team_projects").insert({
      workspace_id: workspace.id,
      created_by: user.id,
      name,
      description: form.description.trim() || null,
      starts_on: form.startsOn || null,
      due_on: form.dueOn || null,
      status: form.status,
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setForm(emptyForm);
    setMessage("Project added successfully.");
    await loadProjects();
  }

  async function updateStatus(projectId: string, status: Project["status"]) {
    const { error } = await supabase
      .from("team_projects")
      .update({ status })
      .eq("id", projectId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setProjects((current) =>
      current.map((project) =>
        project.id === projectId ? { ...project, status } : project
      )
    );
    setMessage("Project updated.");
  }

  async function archiveProject(projectId: string) {
    const { error } = await supabase
      .from("team_projects")
      .update({ status: "archived" })
      .eq("id", projectId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setProjects((current) => current.filter((project) => project.id !== projectId));
    setMessage("Project archived.");
  }

  return (
    <ProductShell
      productName="SchedNest Teams"
      productLabel="Team workspace"
      navItems={[...teamsNavItems]}
    >
      <section className="rounded-[2rem] border border-edition-primary/20 bg-edition-primary/10 p-7">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-edition-primary">
          Live Supabase data
        </p>
        <h2 className="mt-3 text-4xl font-black">Projects</h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-300">
          Create projects, set dates, track status, and archive completed work.
        </p>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <form
          onSubmit={addProject}
          className="rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6"
        >
          <h3 className="text-xl font-black">Add a project</h3>

          <div className="mt-5 space-y-4">
            <input
              value={form.name}
              onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
              placeholder="Project name"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            />

            <textarea
              value={form.description}
              onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
              placeholder="Description"
              rows={4}
              className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="date"
                value={form.startsOn}
                onChange={(e) => setForm((c) => ({ ...c, startsOn: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
              />
              <input
                type="date"
                value={form.dueOn}
                onChange={(e) => setForm((c) => ({ ...c, dueOn: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
              />
            </div>

            <select
              value={form.status}
              onChange={(e) => setForm((c) => ({ ...c, status: e.target.value as Project["status"] }))}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            >
              <option value="planned">Planned</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 rounded-2xl border border-edition-primary/20 bg-edition-primary/10 px-5 py-3 text-sm font-black text-edition-primary-soft"
          >
            {saving ? "Adding..." : "Add project"}
          </button>
        </form>

        <section className="rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black">{workspace?.name || "Projects"}</h3>
              <p className="mt-1 text-sm text-gray-500">{projects.length} project(s)</p>
            </div>
            <button
              type="button"
              onClick={() => void loadProjects()}
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-black text-gray-300"
            >
              Refresh
            </button>
          </div>

          {message ? <p className="mt-4 text-emerald-200">{message}</p> : null}
          {errorMessage ? <p className="mt-4 text-red-200">{errorMessage}</p> : null}

          {loading ? (
            <p className="mt-6 text-sm text-gray-400">Loading projects...</p>
          ) : projects.length === 0 ? (
            <p className="mt-6 text-sm text-gray-500">No projects yet.</p>
          ) : (
            <div className="mt-6 space-y-3">
              {projects.map((project) => (
                <article
                  key={project.id}
                  className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h4 className="font-black">{project.name}</h4>
                      {project.description ? (
                        <p className="mt-2 text-sm text-gray-500">{project.description}</p>
                      ) : null}
                      <p className="mt-2 text-sm text-gray-500">
                        {project.due_on ? `Due ${project.due_on}` : "No due date"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void archiveProject(project.id)}
                      className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-gray-400"
                    >
                      Archive
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(["planned", "active", "blocked", "completed"] as Project["status"][]).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => void updateStatus(project.id, status)}
                        className={`rounded-xl border px-3 py-2 text-xs font-black ${
                          project.status === status
                            ? "border-edition-primary/20 bg-edition-primary/15 text-edition-primary-soft"
                            : "border-white/10 text-gray-500"
                        }`}
                      >
                        {status}
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
