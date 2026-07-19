"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import type { AdminAuditLog } from "../../lib/admin/audit";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AuditCenterPage() {
  const supabase = useMemo(() => createClient(), []);
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");

  async function load() {
    let query = supabase
      .from("admin_audit_logs")
      .select(
        "id,actor_user_id,actor_role,action_key,resource_type,resource_id,summary,created_at"
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (filter.trim()) {
      query = query.ilike(
        "action_key",
        `%${filter.trim()}%`
      );
    }

    const { data, error: queryError } = await query;

    if (queryError) {
      setError(queryError.message);
      return;
    }

    setLogs((data || []) as AdminAuditLog[]);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <main className="min-h-screen bg-[#050807] px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[2.5rem] border border-amber-400/20 bg-amber-400/10 p-8">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-amber-300">
            Founder OS
          </p>

          <h1 className="mt-5 text-4xl font-black">
            Audit Center
          </h1>

          <p className="mt-4 text-sm text-gray-300">
            Review important administrative and automated actions.
          </p>
        </section>

        {error ? (
          <p className="mt-6 text-red-300">{error}</p>
        ) : null}

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-1 gap-3">
              <input
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value)
                }
                placeholder="Filter by action"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3"
              />

              <button
                type="button"
                onClick={() => void load()}
                className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm font-black text-amber-100"
              >
                Search
              </button>
            </div>

            <Link
              href="/admin"
              className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black"
            >
              Back to Founder OS
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {logs.length === 0 ? (
              <p className="text-sm text-gray-500">
                No audit activity found.
              </p>
            ) : (
              logs.map((log) => (
                <article
                  key={log.id}
                  className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5"
                >
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-100">
                      {log.action_key}
                    </span>

                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black">
                      {log.resource_type}
                    </span>

                    {log.actor_role ? (
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black">
                        {log.actor_role}
                      </span>
                    ) : null}
                  </div>

                  <h2 className="mt-4 font-black">
                    {log.summary}
                  </h2>

                  <p className="mt-3 text-xs text-gray-500">
                    {formatDate(log.created_at)}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
