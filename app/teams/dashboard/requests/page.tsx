"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProductShell from "../../../components/products/ProductShell";
import { teamsNavItems } from "../../../lib/products/navigation";
import { createClient } from "../../../lib/supabase/client";

type Workspace = { id: string; name: string };

type TeamRequest = {
  id: string;
  title: string;
  description: string | null;
  request_type: "general" | "time_off" | "schedule_change" | "coverage";
  starts_at: string | null;
  ends_at: string | null;
  status: "pending" | "approved" | "denied" | "cancelled";
  created_at: string;
};

type FormState = {
  title: string;
  description: string;
  requestType: TeamRequest["request_type"];
  startsAt: string;
  endsAt: string;
};

const emptyForm: FormState = {
  title: "",
  description: "",
  requestType: "general",
  startsAt: "",
  endsAt: "",
};

export default function TeamRequestsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [requests, setRequests] = useState<TeamRequest[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setErrorMessage("You must be signed in to view requests.");
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
      setRequests([]);
      setLoading(false);
      return;
    }

    setWorkspace(workspaceData as Workspace);

    const { data, error } = await supabase
      .from("team_requests")
      .select("id, title, description, request_type, starts_at, ends_at, status, created_at")
      .eq("workspace_id", workspaceData.id)
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setRequests((data || []) as TeamRequest[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRequests();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadRequests]);

  async function addRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (!workspace) {
      setErrorMessage("Create a team workspace first from Members.");
      return;
    }

    const title = form.title.trim();
    if (!title) {
      setErrorMessage("Request title is required.");
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setErrorMessage("You must be signed in.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("team_requests").insert({
      workspace_id: workspace.id,
      requested_by: user.id,
      request_type: form.requestType,
      title,
      description: form.description.trim() || null,
      starts_at: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      ends_at: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      status: "pending",
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setForm(emptyForm);
    setMessage("Request created.");
    await loadRequests();
  }

  async function updateStatus(
    requestId: string,
    status: TeamRequest["status"]
  ) {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("team_requests")
      .update({
        status,
        reviewed_by:
          status === "approved" || status === "denied" ? user?.id || null : null,
        reviewed_at:
          status === "approved" || status === "denied"
            ? new Date().toISOString()
            : null,
      })
      .eq("id", requestId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setRequests((current) =>
      current.map((request) =>
        request.id === requestId ? { ...request, status } : request
      )
    );
    setMessage("Request updated.");
  }

  async function deleteRequest(requestId: string) {
    const { error } = await supabase
      .from("team_requests")
      .delete()
      .eq("id", requestId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setRequests((current) => current.filter((request) => request.id !== requestId));
    setMessage("Request deleted.");
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
        <h2 className="mt-3 text-4xl font-black">Requests</h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-300">
          Create and manage general, time-off, schedule-change, and coverage requests.
        </p>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <form
          onSubmit={addRequest}
          className="rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6"
        >
          <h3 className="text-xl font-black">Create a request</h3>

          <div className="mt-5 space-y-4">
            <input
              value={form.title}
              onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
              placeholder="Request title"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            />

            <select
              value={form.requestType}
              onChange={(e) => setForm((c) => ({ ...c, requestType: e.target.value as TeamRequest["request_type"] }))}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            >
              <option value="general">General</option>
              <option value="time_off">Time off</option>
              <option value="schedule_change">Schedule change</option>
              <option value="coverage">Coverage</option>
            </select>

            <textarea
              value={form.description}
              onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
              placeholder="Description"
              rows={4}
              className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm((c) => ({ ...c, startsAt: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
              />
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm((c) => ({ ...c, endsAt: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 rounded-2xl border border-edition-primary/20 bg-edition-primary/10 px-5 py-3 text-sm font-black text-edition-primary-soft"
          >
            {saving ? "Creating..." : "Create request"}
          </button>
        </form>

        <section className="rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black">{workspace?.name || "Requests"}</h3>
              <p className="mt-1 text-sm text-gray-500">{requests.length} request(s)</p>
            </div>
            <button
              type="button"
              onClick={() => void loadRequests()}
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-black text-gray-300"
            >
              Refresh
            </button>
          </div>

          {message ? <p className="mt-4 text-emerald-200">{message}</p> : null}
          {errorMessage ? <p className="mt-4 text-red-200">{errorMessage}</p> : null}

          {loading ? (
            <p className="mt-6 text-sm text-gray-400">Loading requests...</p>
          ) : requests.length === 0 ? (
            <p className="mt-6 text-sm text-gray-500">No requests yet.</p>
          ) : (
            <div className="mt-6 space-y-3">
              {requests.map((request) => (
                <article
                  key={request.id}
                  className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h4 className="font-black">{request.title}</h4>
                      <p className="mt-2 text-sm text-gray-500">
                        {request.request_type.replaceAll("_", " ")}
                      </p>
                      {request.description ? (
                        <p className="mt-2 text-sm text-gray-500">{request.description}</p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => void deleteRequest(request.id)}
                      className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-gray-400"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(["pending", "approved", "denied", "cancelled"] as TeamRequest["status"][]).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => void updateStatus(request.id, status)}
                        className={`rounded-xl border px-3 py-2 text-xs font-black ${
                          request.status === status
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
