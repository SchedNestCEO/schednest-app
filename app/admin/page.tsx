"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabase/client";

type Notice = {
  id: string;
  category: string;
  severity: string;
  title: string;
  message: string | null;
  occurrence_count: number;
  material_change: boolean;
};

export default function FounderOSPage() {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<Notice[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setError("You must be signed in.");

    const { data: admin } = await supabase.from("platform_admins").select("role").eq("user_id", user.id).eq("status", "active").maybeSingle();
    if (!admin) return setError("Founder OS access is required.");

    const { data: state } = await supabase.from("admin_notification_state").select("last_seen_at").eq("admin_user_id", user.id).maybeSingle();
    const lastSeen = state?.last_seen_at || new Date(0).toISOString();

    const { data, error: queryError } = await supabase
      .from("admin_notifications")
      .select("*")
      .or(`last_occurred_at.gt.${lastSeen},material_change.eq.true`)
      .not("status", "in", '("resolved","dismissed","archived")')
      .order("last_occurred_at", { ascending: false });

    if (queryError) return setError(queryError.message);
    setItems((data || []) as Notice[]);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  async function mark(id: string, status: string) {
    await supabase.from("admin_notifications").update({ status, material_change: false, updated_at: new Date().toISOString() }).eq("id", id);
    setItems((current) => current.filter((item) => item.id !== id));
  }

  async function completeVisit() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const now = new Date().toISOString();
    await supabase.from("admin_notification_state").upsert({ admin_user_id: user.id, last_seen_at: now, updated_at: now }, { onConflict: "admin_user_id" });
    setItems([]);
  }

  return (
    <main className="min-h-screen bg-[#050807] px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[2.5rem] border border-emerald-400/20 bg-emerald-400/10 p-8">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">Founder OS v1.0</p>
          <h1 className="mt-5 text-4xl font-black">SchedNest Command Center</h1>
          <p className="mt-4 text-sm text-gray-300">New, changed, and unresolved work across SchedNest.</p>
        </section>

        {error ? <p className="mt-6 text-red-300">{error}</p> : null}

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {[["/admin/health","Platform Health"],["/admin/support","Support Operations"],["/admin/engineering","Engineering"],["/admin/capabilities","Capability Graph"],["/admin/performance","Performance"],["/admin/subscriptions","Subscriptions"],["/birdy/decisions","Birdy Decisions"],["/connectors","Connectors"]].map(([href,title]) => (
            <Link key={href} href={href} className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"><h2 className="text-xl font-black">{title}</h2></Link>
          ))}
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><h2 className="text-xl font-black">Since last visit</h2><p className="mt-2 text-sm text-gray-500">{items.length} item(s)</p></div>
            <button onClick={() => void completeVisit()} className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-black">Mark visit complete</button>
          </div>

          <div className="mt-5 space-y-3">
            {items.length === 0 ? <p className="text-sm text-gray-500">Nothing new needs your attention.</p> : items.map((item) => (
              <article key={item.id} className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black">{item.category}</span>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black">{item.severity}</span>
                  {item.occurrence_count > 1 ? <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-100">{item.occurrence_count} occurrences</span> : null}
                  {item.material_change ? <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs font-black text-sky-100">Changed</span> : null}
                </div>
                <h3 className="mt-4 text-lg font-black">{item.title}</h3>
                {item.message ? <p className="mt-3 text-sm text-gray-400">{item.message}</p> : null}
                <div className="mt-5 flex flex-wrap gap-3">
                  <button onClick={() => void mark(item.id, "reviewed")} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black">Reviewed</button>
                  <button onClick={() => void mark(item.id, "resolved")} className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-black text-black">Resolved</button>
                  <button onClick={() => void mark(item.id, "dismissed")} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black text-gray-400">Dismiss</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
