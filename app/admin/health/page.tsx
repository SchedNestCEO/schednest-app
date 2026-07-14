"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type Check = { serviceKey: string; serviceName: string; status: string; latencyMs: number | null; message: string };

export default function HealthPage() {
  const supabase = useMemo(() => createClient(), []);
  const [checks, setChecks] = useState<Check[]>([]);
  const [overall, setOverall] = useState("unknown");
  const [error, setError] = useState("");

  async function run() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return setError("You must be signed in.");
    const response = await fetch("/api/admin/health", { headers: { Authorization: `Bearer ${session.access_token}` } });
    const payload = await response.json();
    if (!response.ok) return setError(payload.error || "Health check failed.");
    setOverall(payload.overall);
    setChecks(payload.checks || []);
  }

  return (
    <main className="min-h-screen bg-[#050807] px-6 py-10 text-white"><div className="mx-auto max-w-6xl">
      <section className="rounded-[2.5rem] border border-sky-400/20 bg-sky-400/10 p-8">
        <p className="text-sm font-black uppercase tracking-[0.3em] text-sky-300">Founder OS</p>
        <h1 className="mt-5 text-4xl font-black">Platform Health</h1>
        <p className="mt-4 text-sm text-gray-300">Overall status: {overall}</p>
        <button onClick={() => void run()} className="mt-5 rounded-2xl bg-sky-300 px-5 py-3 text-sm font-black text-black">Run health check</button>
      </section>
      {error ? <p className="mt-6 text-red-300">{error}</p> : null}
      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {checks.map((check) => <article key={check.serviceKey} className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-black">{check.serviceName}</h2><p className="mt-3 text-sm text-gray-400">{check.message}</p></div><span className="text-xs font-black uppercase">{check.status}</span></div><p className="mt-4 text-xs text-gray-500">Latency: {check.latencyMs ?? "—"} ms</p></article>)}
      </section>
      <Link href="/admin" className="mt-8 inline-block rounded-2xl border border-white/10 px-5 py-3 text-sm font-black">Back to Founder OS</Link>
    </div></main>
  );
}
