"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProductShell from "../../../components/products/ProductShell";
import { teamsNavItems } from "../../../lib/products/navigation";
import { createClient } from "../../../lib/supabase/client";
import {
  isTeamWorkspaceOwner,
  resolveTeamWorkspace,
} from "../../../lib/teams/workspace";

type TeamWorkspace = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
};

type TeamMembership = {
  id: string;
  workspace_id: string;
  user_id: string | null;
  invited_email: string | null;
  role: "owner" | "admin" | "manager" | "member" | "viewer";
  status: "pending" | "active" | "declined" | "removed";
  created_at: string;
};

type InviteForm = {
  email: string;
  role: TeamMembership["role"];
};

const emptyForm: InviteForm = {
  email: "",
  role: "member",
};

const roleLabels: Record<TeamMembership["role"], string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  member: "Member",
  viewer: "Viewer",
};

const statusLabels: Record<TeamMembership["status"], string> = {
  pending: "Pending",
  active: "Active",
  declined: "Declined",
  removed: "Removed",
};

export default function TeamMembersPage() {
  const supabase = useMemo(() => createClient(), []);

  const [workspace, setWorkspace] = useState<TeamWorkspace | null>(null);
  const [members, setMembers] = useState<TeamMembership[]>([]);
  const [form, setForm] = useState<InviteForm>(emptyForm);
  const [workspaceName, setWorkspaceName] = useState("My Team");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in to view team members.");
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);

    const {
      workspace: workspaceData,
      error: workspaceError,
    } = await resolveTeamWorkspace(
      supabase,
      user.id,
    );

    if (workspaceError) {
      setErrorMessage(workspaceError.message);
      setLoading(false);
      return;
    }

    let currentWorkspace =
      (workspaceData || null) as TeamWorkspace | null;

    if (!currentWorkspace) {
      const { data: createdWorkspace, error: createWorkspaceError } =
        await supabase
          .from("team_workspaces")
          .insert({
            owner_id: user.id,
            name: "My Team",
          })
          .select("id, owner_id, name, description")
          .single();

      if (createWorkspaceError) {
        setErrorMessage(createWorkspaceError.message);
        setLoading(false);
        return;
      }

      currentWorkspace = createdWorkspace as TeamWorkspace;

      const { error: ownerMembershipError } = await supabase
        .from("team_memberships")
        .insert({
          workspace_id: currentWorkspace.id,
          user_id: user.id,
          role: "owner",
          status: "active",
        });

      if (ownerMembershipError) {
        setErrorMessage(ownerMembershipError.message);
        setLoading(false);
        return;
      }
    }

    setWorkspace(currentWorkspace);
    setWorkspaceName(currentWorkspace.name);

    const { data: membershipData, error: membershipError } = await supabase
      .from("team_memberships")
      .select(
        "id, workspace_id, user_id, invited_email, role, status, created_at"
      )
      .eq("workspace_id", currentWorkspace.id)
      .neq("status", "removed")
      .order("created_at", { ascending: true });

    if (membershipError) {
      setErrorMessage(membershipError.message);
      setLoading(false);
      return;
    }

    setMembers((membershipData || []) as TeamMembership[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMembers();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadMembers]);

  async function inviteMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    const email = form.email.trim().toLowerCase();

    if (!email || !email.includes("@")) {
      setErrorMessage("Enter a valid email address.");
      return;
    }

    if (!workspace) {
      setErrorMessage("Team workspace is not ready yet.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("team_memberships").insert({
      workspace_id: workspace.id,
      invited_email: email,
      role: form.role,
      status: "pending",
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setForm(emptyForm);
    setMessage("Team invitation created.");
    await loadMembers();
  }

  async function updateRole(
    membershipId: string,
    role: TeamMembership["role"]
  ) {
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("team_memberships")
      .update({ role })
      .eq("id", membershipId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMembers((current) =>
      current.map((member) =>
        member.id === membershipId ? { ...member, role } : member
      )
    );
    setMessage("Member role updated.");
  }

  async function removeMember(membershipId: string) {
    setMessage("");
    setErrorMessage("");

    const member = members.find((item) => item.id === membershipId);

    if (member?.role === "owner") {
      setErrorMessage("The workspace owner cannot be removed.");
      return;
    }

    const { error } = await supabase
      .from("team_memberships")
      .update({ status: "removed" })
      .eq("id", membershipId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMembers((current) =>
      current.filter((memberItem) => memberItem.id !== membershipId)
    );
    setMessage("Member removed.");
  }

  async function saveWorkspaceName() {
    setMessage("");
    setErrorMessage("");

    const name = workspaceName.trim();

    if (!workspace || !name) {
      setErrorMessage("Workspace name is required.");
      return;
    }

    const { error } = await supabase
      .from("team_workspaces")
      .update({ name })
      .eq("id", workspace.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setWorkspace((current) =>
      current ? { ...current, name } : current
    );
    setMessage("Workspace name updated.");
  }

  const canManageWorkspace =
    Boolean(
      workspace &&
        currentUserId &&
        isTeamWorkspaceOwner(
          workspace,
          currentUserId,
        ),
    );

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

        <h2 className="mt-3 text-4xl font-black">Members</h2>

        <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-300">
          Create your team workspace, invite members, and manage roles.
        </p>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6">
            <h3 className="text-xl font-black">Workspace</h3>

            <label className="mt-5 block">
              <span className="text-sm font-bold text-gray-300">
                Workspace name
              </span>
              <input
                disabled={!canManageWorkspace}
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-edition-primary/40"
              />
            </label>

            <button
              type="button"
              disabled={!canManageWorkspace}
              onClick={() => void saveWorkspaceName()}
              className="mt-4 rounded-2xl border border-edition-primary/20 bg-edition-primary/10 px-5 py-3 text-sm font-black text-edition-primary-soft transition hover:bg-edition-primary/20"
            >
              Save workspace
            </button>
          </section>

          <form
            onSubmit={inviteMember}
            className="rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6"
          >
            <h3 className="text-xl font-black">Invite a member</h3>

            <label className="mt-5 block">
              <span className="text-sm font-bold text-gray-300">Email</span>
              <input
                disabled={!canManageWorkspace}
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="teammate@example.com"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-edition-primary/40"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-bold text-gray-300">Role</span>
              <select
                disabled={!canManageWorkspace}
                value={form.role}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    role: event.target.value as TeamMembership["role"],
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-edition-primary/40"
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </label>

            <button
              type="submit"
              disabled={saving || !canManageWorkspace}
              className="mt-5 rounded-2xl border border-edition-primary/20 bg-edition-primary/10 px-5 py-3 text-sm font-black text-edition-primary-soft transition hover:bg-edition-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Inviting..." : "Create invitation"}
            </button>
          </form>
        </div>

        <section className="rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black">
                {workspace?.name || "Team members"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {members.length} member{members.length === 1 ? "" : "s"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadMembers()}
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-black text-gray-300 transition hover:bg-white/[0.06] hover:text-white"
            >
              Refresh
            </button>
          </div>

          {message ? (
            <p className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
              {message}
            </p>
          ) : null}

          {errorMessage ? (
            <p className="mt-4 rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
              {errorMessage}
            </p>
          ) : null}

          {loading ? (
            <p className="mt-6 text-sm text-gray-400">Loading members...</p>
          ) : members.length === 0 ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-white/10 p-8 text-center">
              <p className="font-black">No team members yet</p>
              <p className="mt-2 text-sm text-gray-500">
                Invite your first teammate using the form.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {members.map((member) => (
                <article
                  key={member.id}
                  className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="font-black">
                        {member.invited_email ||
                          (member.role === "owner"
                            ? "Workspace owner"
                            : "Connected member")}
                      </h4>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full border border-edition-primary/15 bg-edition-primary/10 px-3 py-1 text-xs font-bold text-edition-primary-soft">
                          {roleLabels[member.role]}
                        </span>

                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-gray-400">
                          {statusLabels[member.status]}
                        </span>
                      </div>
                    </div>

                    {canManageWorkspace &&
                    member.role !== "owner" ? (
                      <button
                        type="button"
                        onClick={() => void removeMember(member.id)}
                        className="rounded-2xl border border-white/10 px-3 py-2 text-xs font-black text-gray-400 transition hover:border-red-300/20 hover:bg-red-300/10 hover:text-red-100"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>

                  {canManageWorkspace &&
                  member.role !== "owner" ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(
                        ["admin", "manager", "member", "viewer"] as TeamMembership["role"][]
                      ).map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => void updateRole(member.id, role)}
                          className={`rounded-xl border px-3 py-2 text-xs font-black transition ${
                            member.role === role
                              ? "border-edition-primary/20 bg-edition-primary/15 text-edition-primary-soft"
                              : "border-white/10 text-gray-500 hover:bg-white/[0.06] hover:text-white"
                          }`}
                        >
                          {roleLabels[role]}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </ProductShell>
  );
}
