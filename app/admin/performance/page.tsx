"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  PerformanceMetric,
  PerformanceRun,
  PerformanceThreshold,
} from "../../lib/admin/performance";
import { createClient } from "../../lib/supabase/client";

type Payload = {
  runs: PerformanceRun[];
  metrics: PerformanceMetric[];
  thresholds: PerformanceThreshold[];
};

export default function PerformanceCenterPage() {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<Payload>({
    runs: [],
    metrics: [],
    thresholds: [],
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);

  const authorizedFetch = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("You must be signed in.");
      }

      return fetch(input, {
        ...init,
        headers: {
          ...init.headers,
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });
    },
    [supabase],
  );

  const load = useCallback(async () => {
    setError("");

    try {
      const response = await authorizedFetch("/api/admin/performance");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load Performance Center.");
      }

      setData(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load Performance Center.");
    } finally {
      setLoading(false);
    }
  }, [authorizedFetch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  async function captureSnapshot() {
    setCapturing(true);
    setError("");

    try {
      const response = await authorizedFetch("/api/admin/performance", {
        method: "POST",
        body: JSON.stringify({
          action: "capture_snapshot",
          environment: process.env.NODE_ENV === "production" ? "production" : "development",
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Snapshot failed.");
      }

      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Snapshot failed.");
    } finally {
      setCapturing(false);
    }
  }

  const latestRun = data.runs[0];

  return (
    <main className="min-h-screen bg-[#050807] px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/admin"
          className="text-sm font-black text-violet-300 hover:text-violet-200"
        >
          ← Founder OS
        </Link>

        <section className="mt-6 rounded-[2.5rem] border border-violet-400/20 bg-violet-400/10 p-8">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-violet-300">
            Performance Center v1.0
          </p>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="text-4xl font-black">Performance Center</h1>
              <p className="mt-4 max-w-3xl text-sm text-gray-300">
                Historical test runs, platform snapshots, and Business-first
                performance thresholds.
              </p>
            </div>
            <button
              type="button"
              disabled={capturing}
              onClick={() => void captureSnapshot()}
              className="rounded-2xl bg-violet-300 px-5 py-3 text-sm font-black text-black disabled:opacity-50"
            >
              {capturing ? "Capturing…" : "Capture platform snapshot"}
            </button>
          </div>
        </section>

        {error ? <p className="mt-6 text-red-300">{error}</p> : null}

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-xs font-black uppercase tracking-wider text-gray-500">Latest run</p>
            <p className="mt-3 text-2xl font-black">{latestRun?.status || (loading ? "Loading…" : "No runs")}</p>
          </article>
          <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-xs font-black uppercase tracking-wider text-gray-500">Recorded metrics</p>
            <p className="mt-3 text-2xl font-black">{data.metrics.length}</p>
          </article>
          <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-xs font-black uppercase tracking-wider text-gray-500">Active thresholds</p>
            <p className="mt-3 text-2xl font-black">{data.thresholds.length}</p>
          </article>
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-xl font-black">Recent metrics</h2>
          <div className="mt-5 space-y-3">
            {data.metrics.length === 0 ? (
              <p className="text-sm text-gray-500">No performance metrics recorded yet.</p>
            ) : (
              data.metrics.slice(0, 12).map((metric) => (
                <article
                  key={metric.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/10 p-4"
                >
                  <div>
                    <p className="font-black">{metric.metric_key}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {metric.product} · {new Date(metric.captured_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black">
                      {metric.metric_value} {metric.unit}
                    </p>
                    <p className="mt-1 text-xs uppercase text-gray-500">{metric.status}</p>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-xl font-black">Recent runs</h2>
            <div className="mt-5 space-y-3">
              {data.runs.length === 0 ? (
                <p className="text-sm text-gray-500">No performance runs recorded yet.</p>
              ) : (
                data.runs.slice(0, 10).map((run) => (
                  <div key={run.id} className="rounded-2xl border border-white/10 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-black">{run.name}</p>
                      <span className="text-xs font-black uppercase">{run.status}</span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      {run.product} · {run.test_type} · {run.environment}
                    </p>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-xl font-black">Thresholds</h2>
            <div className="mt-5 space-y-3">
              {data.thresholds.map((threshold) => (
                <div key={threshold.id} className="rounded-2xl border border-white/10 p-4">
                  <p className="font-black">{threshold.display_name}</p>
                  <p className="mt-2 text-xs text-gray-500">
                    Warning {threshold.warning_value} {threshold.unit} · Critical{" "}
                    {threshold.critical_value} {threshold.unit}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
