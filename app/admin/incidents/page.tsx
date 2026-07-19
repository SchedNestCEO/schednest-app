"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type Incident = {
  id: string;
  title: string;
  description: string | null;
  severity: "minor" | "major" | "critical";
  status:
    | "investigating"
    | "identified"
    | "monitoring"
    | "resolved";
  started_at: string;
  resolved_at: string | null;
};

export default function IncidentCenterPage() {
  const supabase = useMemo(() => createClient(), []);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] =
    useState<Incident["severity"]>("minor");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const { data, error: queryError } = await supabase
      .from("platform_incidents")
      .select(
        "id,title,description,severity,status,started_at,resolved_at"
      )
      .order("started_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      return;
    }

    setIncidents((data || []) as Incident[]);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  async function createIncident(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!title.trim()) {
      setError("Incident title is required.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error: insertError } = await supabase
      .from("platform_incidents")
      .insert({
        created_by: user?.id || null,
        title: title.trim(),
        description: description.trim() || null,
        severity,
        status: "investigating",
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }

    await supabase.rpc("log_admin_action", {
      target_action_key: "incident_created",
      target_resource_type: "platform_incident",
      target_resource_id: data.id,
      target_summary: `Created incident: ${data.title}`,
      target_before_state: null,
      target_after_state: data,
      target_metadata: {},
    });

    setTitle("");
    setDescription("");
    setSeverity("minor");
    setMessage("Incident created.");
    await load();
  }

  async function updateStatus(
    id: string,
    status: Incident["status"]
  ) {
    setError("");
    setMessage("");

    const { error: rpcError } = await supabase.rpc(
      "update_platform_incident",
      {
        target_incident_id: id,
        target_status: status,
        target_summary: `Status changed to ${status}`,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setMessage(`Incident moved to ${status}.`);
    await load();
  }

  return (
    <main className="min-h-screen bg-[#050807] px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[2.5rem] border border-red-400/20 bg-red-400/10 p-8">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-red-300">
            Founder OS
          </p>

          <h1 className="mt-5 text-4xl font-black">
            Incident Center
          </h1>

          <p className="mt-4 text-sm text-gray-300">
            Track outages, degraded services, investigations, and resolutions.
          </p>
        </section>

        {error ? (
          <p className="mt-6 text-red-300">{error}</p>
        ) : null}

        {message ? (
          <p className="mt-6 text-emerald-300">{message}</p>
        ) : null}

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
          <form
            onSubmit={createIncident}
            className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"
          >
            <h2 className="text-xl font-black">Create incident</h2>

            <div className="mt-5 grid gap-4">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Incident title"
                className="rounded-xl border border-white/10 bg-black/20 px-4 py-3"
              />

              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="What is happening?"
                rows={5}
                className="rounded-xl border border-white/10 bg-black/20 px-4 py-3"
              />

              <select
                value={severity}
                onChange={(event) =>
                  setSeverity(
                    event.target.value as Incident["severity"]
                  )
                }
                className="rounded-xl border border-white/10 bg-black/20 px-4 py-3"
              >
                <option value="minor">Minor</option>
                <option value="major">Major</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <button
              type="submit"
              className="mt-5 w-full rounded-2xl bg-red-400 px-5 py-3 text-sm font-black text-black"
            >
              Open incident
            </button>
          </form>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">
                  Incident history
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  {incidents.length} incident(s)
                </p>
              </div>

              <Link
                href="/admin"
                className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black"
              >
                Back to Founder OS
              </Link>
            </div>

            <div className="mt-5 space-y-4">
              {incidents.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No incidents recorded.
                </p>
              ) : (
                incidents.map((incident) => (
                  <article
                    key={incident.id}
                    className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5"
                  >
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-red-300/20 bg-red-300/10 px-3 py-1 text-xs font-black text-red-100">
                        {incident.severity}
                      </span>

                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black">
                        {incident.status}
                      </span>
                    </div>

                    <h3 className="mt-4 text-lg font-black">
                      {incident.title}
                    </h3>

                    {incident.description ? (
                      <p className="mt-3 text-sm leading-6 text-gray-400">
                        {incident.description}
                      </p>
                    ) : null}

                    <div className="mt-5 flex flex-wrap gap-3">
                      {(
                        [
                          "investigating",
                          "identified",
                          "monitoring",
                          "resolved",
                        ] as const
                      ).map((status) => (
                        <button
                          key={status}
                          type="button"
                          disabled={incident.status === status}
                          onClick={() =>
                            void updateStatus(
                              incident.id,
                              status
                            )
                          }
                          className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black disabled:opacity-40"
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
