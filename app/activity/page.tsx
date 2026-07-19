"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabase/client";

type ActivityEvent = {
  id: string;
  actor_user_id: string | null;
  owner_id: string;
  product: "platform" | "student" | "teams" | "med" | "business" | "life";
  event_type: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  title: string;
  description: string | null;
  severity: "info" | "success" | "warning" | "critical";
  source: "user" | "system" | "birdy" | "integration";
  occurred_at: string;
};

const productLabels = {
  platform: "Platform",
  student: "Student",
  teams: "Teams",
  med: "Med",
  business: "Business",
  life: "Life",
} as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function ActivityPage() {
  const supabase = useMemo(() => createClient(), []);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [productFilter, setProductFilter] = useState<
    "all" | ActivityEvent["product"]
  >("all");
  const [sourceFilter, setSourceFilter] = useState<
    "all" | ActivityEvent["source"]
  >("all");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in to view activity.");
      setLoading(false);
      return;
    }

    let query = supabase
      .from("platform_activity_events")
      .select(
        "id, actor_user_id, owner_id, product, event_type, action, resource_type, resource_id, title, description, severity, source, occurred_at"
      )
      .eq("owner_id", user.id)
      .order("occurred_at", { ascending: false })
      .limit(200);

    if (productFilter !== "all") {
      query = query.eq("product", productFilter);
    }

    if (sourceFilter !== "all") {
      query = query.eq("source", sourceFilter);
    }

    const { data, error } = await query;

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setEvents((data || []) as ActivityEvent[]);
    setLoading(false);
  }, [productFilter, sourceFilter, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadEvents();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadEvents]);

  return (
    <main className="min-h-screen bg-[#07090d] px-5 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[2rem] border border-cyan-400/20 bg-cyan-400/10 p-7">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-300">
            SchedNest Platform
          </p>

          <h1 className="mt-3 text-4xl font-black">Activity Timeline</h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-300">
            One history for Student, Teams, Med, Business, Life, integrations,
            and Birdy.
          </p>
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">Recent activity</h2>
              <p className="mt-1 text-sm text-gray-500">
                {events.length} event(s)
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={productFilter}
                onChange={(event) =>
                  setProductFilter(
                    event.target.value as
                      | "all"
                      | ActivityEvent["product"]
                  )
                }
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
              >
                <option value="all">All products</option>
                <option value="platform">Platform</option>
                <option value="student">Student</option>
                <option value="teams">Teams</option>
                <option value="med">Med</option>
                <option value="business">Business</option>
                <option value="life">Life</option>
              </select>

              <select
                value={sourceFilter}
                onChange={(event) =>
                  setSourceFilter(
                    event.target.value as
                      | "all"
                      | ActivityEvent["source"]
                  )
                }
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
              >
                <option value="all">All sources</option>
                <option value="user">User</option>
                <option value="system">System</option>
                <option value="birdy">Birdy</option>
                <option value="integration">Integration</option>
              </select>

              <button
                type="button"
                onClick={() => void loadEvents()}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm font-black text-gray-300"
              >
                Refresh
              </button>
            </div>
          </div>

          {errorMessage ? (
            <p className="mt-4 text-sm text-red-200">{errorMessage}</p>
          ) : null}

          {loading ? (
            <p className="mt-6 text-sm text-gray-400">Loading activity...</p>
          ) : events.length === 0 ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-white/10 p-8 text-center">
              <p className="font-black">No activity yet</p>
              <p className="mt-2 text-sm text-gray-500">
                Platform actions will appear here as products begin publishing
                activity events.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {events.map((event) => (
                <article
                  key={event.id}
                  className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100">
                          {productLabels[event.product]}
                        </span>

                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-gray-400">
                          {event.source}
                        </span>

                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-gray-400">
                          {event.severity}
                        </span>
                      </div>

                      <h3 className="mt-3 font-black">{event.title}</h3>

                      {event.description ? (
                        <p className="mt-2 text-sm leading-6 text-gray-400">
                          {event.description}
                        </p>
                      ) : null}

                      <p className="mt-3 text-xs text-gray-600">
                        {event.event_type} · {event.action}
                      </p>
                    </div>

                    <time className="text-xs text-gray-500">
                      {formatDate(event.occurred_at)}
                    </time>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
