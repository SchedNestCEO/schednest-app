"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProductShell from "../../../components/products/ProductShell";
import { teamsNavItems } from "../../../lib/products/navigation";
import { createClient } from "../../../lib/supabase/client";

type Workspace = { id: string; name: string };

type TeamEvent = {
  id: string;
  title: string;
  description: string | null;
  event_type: "meeting" | "shift" | "deadline" | "time_off" | "other";
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  status: "scheduled" | "completed" | "cancelled";
};

type FormState = {
  title: string;
  description: string;
  eventType: TeamEvent["event_type"];
  startsAt: string;
  endsAt: string;
  location: string;
};

const emptyForm: FormState = {
  title: "",
  description: "",
  eventType: "meeting",
  startsAt: "",
  endsAt: "",
  location: "",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function TeamsSchedulePage() {
  const supabase = useMemo(() => createClient(), []);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [events, setEvents] = useState<TeamEvent[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadEvents = useCallback(async () => {
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

    const { data, error } = await supabase
      .from("team_events")
      .select(
        "id, title, description, event_type, starts_at, ends_at, location, status"
      )
      .eq("workspace_id", workspaceData.id)
      .order("starts_at", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setEvents((data || []) as TeamEvent[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  async function addEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (!workspace || !form.title.trim() || !form.startsAt) {
      setErrorMessage("Title and start time are required.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setErrorMessage("You must be signed in.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("team_events").insert({
      workspace_id: workspace.id,
      created_by: user.id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      event_type: form.eventType,
      starts_at: new Date(form.startsAt).toISOString(),
      ends_at: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      location: form.location.trim() || null,
      status: "scheduled",
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setForm(emptyForm);
    setMessage("Team event added.");
    await loadEvents();
  }

  async function updateStatus(id: string, status: TeamEvent["status"]) {
    const { error } = await supabase
      .from("team_events")
      .update({ status })
      .eq("id", id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setEvents((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item))
    );
  }

  async function deleteEvent(id: string) {
    const { error } = await supabase.from("team_events").delete().eq("id", id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setEvents((current) => current.filter((item) => item.id !== id));
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
          Shared scheduling
        </p>
        <h2 className="mt-3 text-4xl font-black">Team Schedule</h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-300">
          Add meetings, shifts, deadlines, and time-off events.
        </p>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <form
          onSubmit={addEvent}
          className="rounded-[2rem] border border-violet-200/10 bg-white/[0.04] p-6"
        >
          <h3 className="text-xl font-black">Add to schedule</h3>

          <div className="mt-5 space-y-4">
            <input
              value={form.title}
              onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
              placeholder="Event title"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
            />

            <select
              value={form.eventType}
              onChange={(e) =>
                setForm((c) => ({
                  ...c,
                  eventType: e.target.value as TeamEvent["event_type"],
                }))
              }
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
            >
              <option value="meeting">Meeting</option>
              <option value="shift">Shift</option>
              <option value="deadline">Deadline</option>
              <option value="time_off">Time off</option>
              <option value="other">Other</option>
            </select>

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) =>
                  setForm((c) => ({ ...c, startsAt: e.target.value }))
                }
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
              />
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) =>
                  setForm((c) => ({ ...c, endsAt: e.target.value }))
                }
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
              />
            </div>

            <input
              value={form.location}
              onChange={(e) =>
                setForm((c) => ({ ...c, location: e.target.value }))
              }
              placeholder="Location"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
            />

            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((c) => ({ ...c, description: e.target.value }))
              }
              placeholder="Notes"
              rows={4}
              className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 rounded-2xl border border-violet-300/20 bg-violet-300/10 px-5 py-3 text-sm font-black text-violet-100"
          >
            {saving ? "Adding..." : "Add event"}
          </button>
        </form>

        <section className="rounded-[2rem] border border-violet-200/10 bg-white/[0.04] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black">
                {workspace?.name || "Team schedule"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">{events.length} event(s)</p>
            </div>

            <button
              type="button"
              onClick={() => void loadEvents()}
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-black text-gray-300"
            >
              Refresh
            </button>
          </div>

          {message ? <p className="mt-4 text-emerald-200">{message}</p> : null}
          {errorMessage ? <p className="mt-4 text-red-200">{errorMessage}</p> : null}

          {loading ? (
            <p className="mt-6 text-sm text-gray-400">Loading schedule...</p>
          ) : events.length === 0 ? (
            <p className="mt-6 text-sm text-gray-500">No events yet.</p>
          ) : (
            <div className="mt-6 space-y-3">
              {events.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h4 className="font-black">{item.title}</h4>
                      <p className="mt-2 text-sm text-gray-500">
                        {item.event_type.replaceAll("_", " ")} ·{" "}
                        {formatDate(item.starts_at)}
                      </p>
                      {item.location ? (
                        <p className="mt-1 text-sm text-gray-500">
                          {item.location}
                        </p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => void deleteEvent(item.id)}
                      className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-gray-400"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(["scheduled", "completed", "cancelled"] as TeamEvent["status"][]).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => void updateStatus(item.id, status)}
                        className={`rounded-xl border px-3 py-2 text-xs font-black ${
                          item.status === status
                            ? "border-violet-300/20 bg-violet-300/15 text-violet-100"
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
