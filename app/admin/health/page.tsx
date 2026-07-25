"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type Check = {
  serviceKey: string;
  serviceName: string;
  status: string;
  latencyMs: number | null;
  targetLatencyMs: number | null;
  latencyChangePercent: number | null;
  sampleCount: number;
  message: string;
};

export default function HealthPage() {
  const supabase = useMemo(() => createClient(), []);
  const [checks, setChecks] = useState<Check[]>([]);
  const [overall, setOverall] = useState("unknown");
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    setError("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setRunning(false);
      setError("You must be signed in.");
      return;
    }

    const response = await fetch("/api/admin/health", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const payload = await response.json();

    if (!response.ok) {
      setRunning(false);
      setError(payload.error || "Health check failed.");
      return;
    }

    setOverall(payload.overall);
    setChecks(payload.checks || []);
    setCheckedAt(payload.checkedAt || null);
    setRunning(false);
  }

  return (
    <main className="min-h-screen bg-[#050807] px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[2.5rem] border border-sky-400/20 bg-sky-400/10 p-8">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-sky-300">
            Founder OS
          </p>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="text-4xl font-black">Platform Health</h1>
              <p className="mt-4 text-sm text-gray-300">
                Current state:{" "}
                <span className="font-black uppercase text-white">
                  {overall}
                </span>
              </p>
              <p className="mt-2 max-w-3xl text-sm text-gray-400">
                Detects outages, severe latency, and early slowdowns against
                each service&apos;s adaptive recent performance target.
              </p>
              {checkedAt ? (
                <p className="mt-3 text-xs text-gray-500">
                  Last checked {new Date(checkedAt).toLocaleString()}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              disabled={running}
              onClick={() => void run()}
              className="rounded-2xl bg-sky-300 px-5 py-3 text-sm font-black text-black disabled:opacity-50"
            >
              {running ? "Running…" : "Run health check"}
            </button>
          </div>
        </section>

        {error ? <p className="mt-6 text-red-300">{error}</p> : null}

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {checks.map((check) => (
            <article
              key={check.serviceKey}
              className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">{check.serviceName}</h2>
                  <p className="mt-3 text-sm text-gray-400">
                    {check.message}
                  </p>
                </div>

                <span className="text-xs font-black uppercase">
                  {check.status}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                  <p className="text-xs text-gray-500">Current latency</p>
                  <p className="mt-1 font-black">
                    {check.latencyMs ?? "—"} ms
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                  <p className="text-xs text-gray-500">Adaptive target</p>
                  <p className="mt-1 font-black">
                    {check.targetLatencyMs === null
                      ? "Forming"
                      : `${check.targetLatencyMs} ms`}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                  <p className="text-xs text-gray-500">Change vs target</p>
                  <p className="mt-1 font-black">
                    {check.latencyChangePercent === null
                      ? "—"
                      : `${check.latencyChangePercent > 0 ? "+" : ""}${check.latencyChangePercent}%`}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-xs text-gray-500">
                Healthy samples used: {check.sampleCount}
              </p>
            </article>
          ))}
        </section>

        <Link
          href="/admin"
          className="mt-8 inline-block rounded-2xl border border-white/10 px-5 py-3 text-sm font-black"
        >
          Back to Founder OS
        </Link>
      </div>
    </main>
  );
}
