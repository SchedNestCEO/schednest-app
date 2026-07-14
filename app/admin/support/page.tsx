"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type Ticket = { id: string; customer_email: string | null; product: string; subject: string; message: string; category: string; priority: string; status: string; escalation_required: boolean; suggested_reply: string | null };

export default function SupportPage() {
  const supabase = useMemo(() => createClient(), []);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const { data, error: queryError } = await supabase.from("support_tickets").select("*").neq("status", "closed").order("created_at", { ascending: false });
    if (queryError) return setError(queryError.message);
    setTickets((data || []) as Ticket[]);
  }

  useEffect(() => { void load(); }, []);

  async function assignToMe(ticketId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("support_tickets").update({ assigned_admin_id: user.id, updated_at: new Date().toISOString() }).eq("id", ticketId);
    await load();
  }

  async function setStatus(ticketId: string, status: string) {
    await supabase.from("support_tickets").update({ status, resolved_at: status === "resolved" ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", ticketId);
    await load();
  }

  return (
    <main className="min-h-screen bg-[#050807] px-6 py-10 text-white"><div className="mx-auto max-w-7xl">
      <section className="rounded-[2.5rem] border border-violet-400/20 bg-violet-400/10 p-8"><p className="text-sm font-black uppercase tracking-[0.3em] text-violet-300">Founder OS</p><h1 className="mt-5 text-4xl font-black">Support Operations</h1><p className="mt-4 text-sm text-gray-300">Unified support queue with escalation and AI-assisted replies.</p></section>
      {error ? <p className="mt-6 text-red-300">{error}</p> : null}
      <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
        <div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-black">Open support queue</h2><p className="mt-2 text-sm text-gray-500">{tickets.length} active ticket(s)</p></div><Link href="/admin" className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black">Back to Founder OS</Link></div>
        <div className="mt-5 space-y-4">
          {tickets.length === 0 ? <p className="text-sm text-gray-500">No active tickets.</p> : tickets.map((ticket) => <article key={ticket.id} className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5"><div className="flex flex-wrap gap-2"><span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1 text-xs font-black text-violet-100">{ticket.product}</span><span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black">{ticket.priority}</span><span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black">{ticket.category}</span>{ticket.escalation_required ? <span className="rounded-full border border-red-300/20 bg-red-300/10 px-3 py-1 text-xs font-black text-red-100">Escalation required</span> : null}</div><h3 className="mt-4 text-lg font-black">{ticket.subject}</h3><p className="mt-2 text-xs text-gray-500">{ticket.customer_email || "Unknown customer"}</p><p className="mt-4 text-sm text-gray-400">{ticket.message}</p>{ticket.suggested_reply ? <div className="mt-4 rounded-xl border border-sky-300/20 bg-sky-300/10 p-4"><p className="text-xs font-black uppercase text-sky-200">Suggested reply</p><p className="mt-2 text-sm text-sky-50">{ticket.suggested_reply}</p></div> : null}<div className="mt-5 flex flex-wrap gap-3"><button onClick={() => void assignToMe(ticket.id)} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black">Assign to me</button><button onClick={() => void setStatus(ticket.id, "waiting_customer")} className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-sm font-black text-amber-100">Waiting on customer</button><button onClick={() => void setStatus(ticket.id, "resolved")} className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-black text-black">Resolve</button></div></article>)}
        </div>
      </section>
    </div></main>
  );
}
