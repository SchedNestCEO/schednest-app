"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProductShell from "../../../components/products/ProductShell";
import { teamsNavItems } from "../../../lib/products/navigation";
import { createClient } from "../../../lib/supabase/client";

type Workspace = { id: string; name: string };

type Membership = {
  id: string;
  user_id: string | null;
  invited_email: string | null;
  role: string;
  status: string;
};

type TeamTask = {
  id: string;
  assigned_to: string | null;
  priority: string;
  status: string;
  due_at: string | null;
};

type TeamEvent = {
  id: string;
  assignee_user_id: string | null;
  event_type: string;
  starts_at: string;
  status: string;
};

type WorkloadRow = {
  key: string;
  label: string;
  openTasks: number;
  urgentTasks: number;
  upcomingEvents: number;
  score: number;
};

export default function TeamWorkloadPage() {
  const supabase = useMemo(() => createClient(), []);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [rows, setRows] = useState<WorkloadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadWorkload = useCallback(async () => {
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

    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    const [membersResult, tasksResult, eventsResult] = await Promise.all([
      supabase
        .from("team_memberships")
        .select("id, user_id, invited_email, role, status")
        .eq("workspace_id", workspaceData.id)
        .neq("status", "removed"),
      supabase
        .from("team_tasks")
        .select("id, assigned_to, priority, status, due_at")
        .eq("workspace_id", workspaceData.id)
        .neq("status", "completed"),
      supabase
        .from("team_events")
        .select("id, assignee_user_id, event_type, starts_at, status")
        .eq("workspace_id", workspaceData.id)
        .eq("status", "scheduled")
        .gte("starts_at", now.toISOString())
        .lte("starts_at", nextWeek.toISOString()),
    ]);

    const firstError =
      membersResult.error || tasksResult.error || eventsResult.error;

    if (firstError) {
      setErrorMessage(firstError.message);
      setLoading(false);
      return;
    }

    const members = (membersResult.data || []) as Membership[];
    const tasks = (tasksResult.data || []) as TeamTask[];
    const events = (eventsResult.data || []) as TeamEvent[];

    const computed: WorkloadRow[] = members.map((member) => {
      const memberTasks = tasks.filter(
        (task) => task.assigned_to === member.user_id
      );
      const memberEvents = events.filter(
        (event) => event.assignee_user_id === member.user_id
      );
      const urgentTasks = memberTasks.filter(
        (task) => task.priority === "urgent" || task.priority === "high"
      ).length;

      return {
        key: member.id,
        label:
          member.invited_email ||
          (member.role === "owner" ? "Workspace owner" : member.role),
        openTasks: memberTasks.length,
        urgentTasks,
        upcomingEvents: memberEvents.length,
        score: memberTasks.length + urgentTasks * 2 + memberEvents.length,
      };
    });

    const unassignedTasks = tasks.filter((task) => !task.assigned_to);
    const unassignedEvents = events.filter((event) => !event.assignee_user_id);

    computed.push({
      key: "unassigned",
      label: "Unassigned work",
      openTasks: unassignedTasks.length,
      urgentTasks: unassignedTasks.filter(
        (task) => task.priority === "urgent" || task.priority === "high"
      ).length,
      upcomingEvents: unassignedEvents.length,
      score:
        unassignedTasks.length +
        unassignedTasks.filter(
          (task) => task.priority === "urgent" || task.priority === "high"
        ).length *
          2 +
        unassignedEvents.length,
    });

    setRows(computed.sort((a, b) => b.score - a.score));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadWorkload();
  }, [loadWorkload]);

  function workloadLabel(score: number) {
    if (score >= 10) return "Overloaded";
    if (score >= 6) return "Busy";
    if (score >= 3) return "Balanced";
    return "Light";
  }

  return (
    <ProductShell
      productName="SchedNest Teams"
      productLabel="Team workspace"
      accent="violet"
      navItems={[...teamsNavItems]}
    >
      <section className="rounded-[2rem] border border-violet-400/20 bg-violet-400/10 p-7">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-violet-300">
          Capacity overview
        </p>
        <h2 className="mt-3 text-4xl font-black">Workload</h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-300">
          Compare open tasks, urgent work, and upcoming scheduled events.
        </p>
      </section>

      <section className="mt-6 rounded-[2rem] border border-violet-200/10 bg-white/[0.04] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black">
              {workspace?.name || "Team workload"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Next seven days
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadWorkload()}
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-black text-gray-300"
          >
            Refresh
          </button>
        </div>

        {errorMessage ? <p className="mt-4 text-red-200">{errorMessage}</p> : null}

        {loading ? (
          <p className="mt-6 text-sm text-gray-400">Loading workload...</p>
        ) : rows.length === 0 ? (
          <p className="mt-6 text-sm text-gray-500">No workload data yet.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {rows.map((row) => (
              <article
                key={row.key}
                className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h4 className="font-black">{row.label}</h4>
                    <p className="mt-2 text-sm text-gray-500">
                      {row.openTasks} open task(s) · {row.urgentTasks} urgent ·{" "}
                      {row.upcomingEvents} event(s)
                    </p>
                  </div>

                  <span className="rounded-full border border-violet-300/15 bg-violet-300/10 px-4 py-2 text-sm font-black text-violet-100">
                    {workloadLabel(row.score)}
                  </span>
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-violet-300/60"
                    style={{ width: `${Math.min(row.score * 8, 100)}%` }}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </ProductShell>
  );
}
