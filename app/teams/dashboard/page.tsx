"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import ProductShell from "../../components/products/ProductShell";
import { teamsNavItems } from "../../lib/products/navigation";
import { createClient } from "../../lib/supabase/client";

type TeamWorkspace = {
  id: string;
  name: string;
};

type TeamProject = {
  id: string;
  name: string;
  status: "planned" | "active" | "blocked" | "completed" | "archived";
  due_on: string | null;
};

type TeamRequest = {
  id: string;
  title: string;
  request_type: "general" | "time_off" | "schedule_change" | "coverage";
  status: "pending" | "approved" | "denied" | "cancelled";
  created_at: string;
};

type TeamMembership = {
  id: string;
  role: string;
  status: string;
};

export default function TeamsDashboardPage() {
  const supabase = useMemo(() => createClient(), []);

  const [workspace, setWorkspace] = useState<TeamWorkspace | null>(null);
  const [projects, setProjects] = useState<TeamProject[]>([]);
  const [requests, setRequests] = useState<TeamRequest[]>([]);
  const [members, setMembers] = useState<TeamMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in to view the Teams dashboard.");
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
      setRequests([]);
      setMembers([]);
      setLoading(false);
      return;
    }

    setWorkspace(workspaceData as TeamWorkspace);

    const [projectsResult, requestsResult, membersResult] = await Promise.all([
      supabase
        .from("team_projects")
        .select("id, name, status, due_on")
        .eq("workspace_id", workspaceData.id)
        .neq("status", "archived")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("team_requests")
        .select("id, title, request_type, status, created_at")
        .eq("workspace_id", workspaceData.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("team_memberships")
        .select("id, role, status")
        .eq("workspace_id", workspaceData.id)
        .neq("status", "removed"),
    ]);

    const firstError =
      projectsResult.error || requestsResult.error || membersResult.error;

    if (firstError) {
      setErrorMessage(firstError.message);
      setLoading(false);
      return;
    }

    setProjects((projectsResult.data || []) as TeamProject[]);
    setRequests((requestsResult.data || []) as TeamRequest[]);
    setMembers((membersResult.data || []) as TeamMembership[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadDashboard]);

  const activeProjects = projects.filter(
    (project) => project.status === "active" || project.status === "planned"
  ).length;

  const pendingRequests = requests.filter(
    (request) => request.status === "pending"
  ).length;

  const activeMembers = members.filter(
    (member) => member.status === "active"
  ).length;

  return (
    <ProductShell
      productName="SchedNest Teams"
      productLabel="Team workspace"
      navItems={[...teamsNavItems]}
    >
      <section className="rounded-[2rem] border border-edition-primary/20 bg-edition-primary/10 p-7">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-edition-primary">
          Live Teams dashboard
        </p>

        <h2 className="mt-3 text-4xl font-black">
          {workspace ? workspace.name : "Build your team workspace"}
        </h2>

        <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-300">
          Members, projects, requests, and team activity in one place.
        </p>
      </section>

      {errorMessage ? (
        <p className="mt-6 rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
          {errorMessage}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-6 text-sm text-gray-400">Loading dashboard...</p>
      ) : !workspace ? (
        <section className="mt-6 rounded-[2rem] border border-dashed border-edition-primary/20 bg-white/[0.03] p-8 text-center">
          <h3 className="text-xl font-black">No workspace yet</h3>
          <p className="mt-3 text-sm text-gray-500">
            Open Members to create your first workspace automatically.
          </p>
          <Link
            href="/teams/dashboard/members"
            className="mt-5 inline-flex rounded-2xl border border-edition-primary/20 bg-edition-primary/10 px-5 py-3 text-sm font-black text-edition-primary-soft"
          >
            Open Members
          </Link>
        </section>
      ) : (
        <>
          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6">
              <p className="text-sm text-gray-500">Team members</p>
              <p className="mt-2 text-4xl font-black">{members.length}</p>
            </article>

            <article className="rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6">
              <p className="text-sm text-gray-500">Active members</p>
              <p className="mt-2 text-4xl font-black">{activeMembers}</p>
            </article>

            <article className="rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6">
              <p className="text-sm text-gray-500">Active projects</p>
              <p className="mt-2 text-4xl font-black">{activeProjects}</p>
            </article>

            <article className="rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6">
              <p className="text-sm text-gray-500">Pending requests</p>
              <p className="mt-2 text-4xl font-black">{pendingRequests}</p>
            </article>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-2">
            <article className="rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-xl font-black">Recent projects</h3>
                <Link
                  href="/teams/dashboard/projects"
                  className="text-sm font-black text-edition-primary hover:text-edition-primary-soft"
                >
                  View all
                </Link>
              </div>

              {projects.length === 0 ? (
                <p className="mt-5 text-sm text-gray-500">No projects yet.</p>
              ) : (
                <div className="mt-5 space-y-3">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="rounded-2xl border border-white/10 bg-black/10 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-black">{project.name}</p>
                        <span className="rounded-full border border-edition-primary/15 bg-edition-primary/10 px-3 py-1 text-xs font-bold text-edition-primary-soft">
                          {project.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-500">
                        {project.due_on ? `Due ${project.due_on}` : "No due date"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-xl font-black">Recent requests</h3>
                <Link
                  href="/teams/dashboard/requests"
                  className="text-sm font-black text-edition-primary hover:text-edition-primary-soft"
                >
                  View all
                </Link>
              </div>

              {requests.length === 0 ? (
                <p className="mt-5 text-sm text-gray-500">No requests yet.</p>
              ) : (
                <div className="mt-5 space-y-3">
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-2xl border border-white/10 bg-black/10 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-black">{request.title}</p>
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-gray-400">
                          {request.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-500">
                        {request.request_type.replaceAll("_", " ")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>

          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="mt-6 rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-gray-300 transition hover:bg-white/[0.06] hover:text-white"
          >
            Refresh dashboard
          </button>
        </>
      )}
    </ProductShell>
  );
}
