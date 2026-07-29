"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type ImpactEntry = {
  id: string;
  client_id: string | null;
  client_name: string;
  period_start: string | null;
  period_end: string | null;
  missed_revenue_identified: number;
  increased_revenue_realized: number;
  evidence_status: "estimated" | "client_confirmed" | "verified";
  source_type: "manual" | "appointment_analysis" | "client_report" | "integration";
  notes: string | null;
  created_at: string;
};

const money = (value: number) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
}).format(value);

function statusLabel(status: ImpactEntry["evidence_status"]) {
  if (status === "client_confirmed") return "Client confirmed";
  if (status === "verified") return "Verified";
  return "Estimated";
}

export default function RevenueImpactDashboard() {
  const supabase = useMemo(() => createClient(), []);
  const [entries, setEntries] = useState<ImpactEntry[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [missedRevenue, setMissedRevenue] = useState("");
  const [increasedRevenue, setIncreasedRevenue] = useState("");
  const [status, setStatus] = useState<ImpactEntry["evidence_status"]>("estimated");
  const [sourceType, setSourceType] = useState<ImpactEntry["source_type"]>("manual");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [notes, setNotes] = useState("");

  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsAdmin(false);
      setEntries([]);
      setIsLoading(false);
      return;
    }

    const {
      data: adminMembership,
      error: adminError,
    } = await supabase
      .from("platform_admins")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (adminError) {
      setIsAdmin(false);
      setEntries([]);
      setError(adminError.message);
      setIsLoading(false);
      return;
    }

    const admin = Boolean(adminMembership);
    setIsAdmin(admin);

    if (!admin) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    const { data, error: queryError } = await supabase
      .from("client_revenue_impact")
      .select("id, client_id, client_name, period_start, period_end, missed_revenue_identified, increased_revenue_realized, evidence_status, source_type, notes, created_at")
      .order("created_at", { ascending: false });

    if (queryError) setError(queryError.message);
    else setEntries((data || []) as ImpactEntry[]);
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    queueMicrotask(() => void loadEntries());
  }, [loadEntries]);

  async function addImpact() {
    const missed = Number(missedRevenue || 0);
    const increased = Number(increasedRevenue || 0);
    if (!clientName.trim()) return setError("Enter the client or business name.");
    if ((!Number.isFinite(missed) || missed < 0) || (!Number.isFinite(increased) || increased < 0)) return setError("Revenue values must be zero or greater.");
    if (missed === 0 && increased === 0) return setError("Enter missed revenue, increased revenue, or both.");

    setIsSaving(true);
    setError(null);
    setMessage(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Please sign in again.");
      setIsSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("client_revenue_impact").insert({
      recorded_by: user.id,
      client_name: clientName.trim(),
      period_start: periodStart || null,
      period_end: periodEnd || null,
      missed_revenue_identified: missed,
      increased_revenue_realized: increased,
      evidence_status: status,
      source_type: sourceType,
      notes: notes.trim() || null,
    });

    if (insertError) setError(insertError.message);
    else {
      setClientName("");
      setMissedRevenue("");
      setIncreasedRevenue("");
      setPeriodStart("");
      setPeriodEnd("");
      setNotes("");
      setStatus("estimated");
      setSourceType("manual");
      setMessage("Client revenue impact added to the company-wide totals.");
      await loadEntries();
    }
    setIsSaving(false);
  }

  const missedTotal = entries.reduce((sum, item) => sum + Number(item.missed_revenue_identified), 0);
  const increasedTotal = entries.reduce((sum, item) => sum + Number(item.increased_revenue_realized), 0);
  const combinedTotal = missedTotal + increasedTotal;
  const confirmedTotal = entries
    .filter((item) => item.evidence_status !== "estimated")
    .reduce((sum, item) => sum + Number(item.missed_revenue_identified) + Number(item.increased_revenue_realized), 0);
  const verifiedTotal = entries
    .filter((item) => item.evidence_status === "verified")
    .reduce((sum, item) => sum + Number(item.missed_revenue_identified) + Number(item.increased_revenue_realized), 0);
  const uniqueClients = new Set(entries.map((item) => item.client_id || item.client_name.trim().toLowerCase())).size;
  const averageImpact = uniqueClients ? combinedTotal / uniqueClients : 0;

  if (isLoading) return <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-gray-300">Loading revenue impact…</div>;
  if (!isAdmin) return <div className="rounded-[2rem] border border-red-400/20 bg-red-400/10 p-8"><h1 className="text-2xl font-black">Admin access required</h1><p className="mt-3 text-sm text-red-100/80">Revenue Impact is restricted to the SchedNest administrator account.</p></div>;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-emerald-400/15 via-white/[0.04] to-orange-400/10 p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">Admin · Platform Impact</p>
        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><h1 className="text-3xl font-black sm:text-4xl">Client Revenue Impact</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">See the combined economic impact SchedNest has identified or created across every client while preserving a clear distinction between estimates, client-confirmed results, and verified results.</p></div>
          <div className="rounded-2xl border border-emerald-400/20 bg-black/20 px-5 py-4 text-right"><p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Total economic impact</p><p className="mt-1 text-4xl font-black text-emerald-300">{money(combinedTotal)}</p></div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Missed revenue identified", money(missedTotal), "Potential revenue leakage surfaced"],
          ["Revenue increased", money(increasedTotal), "Revenue attributed to improvement"],
          ["Confirmed impact", money(confirmedTotal), "Client-confirmed or verified"],
          ["Businesses measured", String(uniqueClients), `${money(averageImpact)} average impact`],
        ].map(([label, value, helper]) => <div key={label} className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">{label}</p><p className="mt-3 text-3xl font-black text-white">{value}</p><p className="mt-2 text-xs text-gray-500">{helper}</p></div>)}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-200">Add client impact</p><h2 className="mt-2 text-2xl font-black">Record a measured result</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2"><span className="text-sm font-bold text-gray-300">Client or business</span><input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Example: Acme Dental" className="mt-2 w-full rounded-2xl border border-white/10 bg-[#07100d] px-4 py-3 text-white" /></label>
            <label><span className="text-sm font-bold text-gray-300">Missed revenue identified</span><input type="number" min="0" step="0.01" value={missedRevenue} onChange={(e) => setMissedRevenue(e.target.value)} placeholder="$0" className="mt-2 w-full rounded-2xl border border-white/10 bg-[#07100d] px-4 py-3 text-white" /></label>
            <label><span className="text-sm font-bold text-gray-300">Revenue increased</span><input type="number" min="0" step="0.01" value={increasedRevenue} onChange={(e) => setIncreasedRevenue(e.target.value)} placeholder="$0" className="mt-2 w-full rounded-2xl border border-white/10 bg-[#07100d] px-4 py-3 text-white" /></label>
            <label><span className="text-sm font-bold text-gray-300">Evidence level</span><select value={status} onChange={(e) => setStatus(e.target.value as ImpactEntry["evidence_status"])} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#07100d] px-4 py-3 text-white"><option value="estimated">Estimated</option><option value="client_confirmed">Client confirmed</option><option value="verified">Verified</option></select></label>
            <label><span className="text-sm font-bold text-gray-300">Source</span><select value={sourceType} onChange={(e) => setSourceType(e.target.value as ImpactEntry["source_type"])} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#07100d] px-4 py-3 text-white"><option value="manual">Manual</option><option value="appointment_analysis">Appointment analysis</option><option value="client_report">Client report</option><option value="integration">Integration</option></select></label>
            <label><span className="text-sm font-bold text-gray-300">Period start</span><input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#07100d] px-4 py-3 text-white" /></label>
            <label><span className="text-sm font-bold text-gray-300">Period end</span><input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#07100d] px-4 py-3 text-white" /></label>
            <label className="sm:col-span-2"><span className="text-sm font-bold text-gray-300">Notes or supporting evidence</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Example: 12 missed appointments × $250 average appointment value" className="mt-2 w-full rounded-2xl border border-white/10 bg-[#07100d] px-4 py-3 text-white" /></label>
          </div>
          <button disabled={isSaving} onClick={addImpact} className="mt-5 w-full rounded-2xl bg-emerald-400 px-5 py-4 text-sm font-black text-black hover:bg-emerald-300 disabled:opacity-50">Add to Platform Impact</button>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-200">Selling-point preview</p><h2 className="mt-2 text-2xl font-black">Safe language for outreach</h2>
          <div className="mt-6 rounded-[1.75rem] border border-emerald-400/20 bg-black/20 p-6">
            <p className="text-sm leading-7 text-gray-300">“Across <strong className="text-white">{uniqueClients} businesses</strong>, SchedNest has identified or helped create <strong className="text-emerald-300">{money(combinedTotal)}</strong> in total client economic impact, including <strong className="text-orange-200">{money(missedTotal)}</strong> in missed-revenue opportunities identified and <strong className="text-emerald-200">{money(increasedTotal)}</strong> in increased revenue.”</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs uppercase tracking-wider text-gray-500">Client-confirmed+</p><p className="mt-2 text-2xl font-black">{money(confirmedTotal)}</p></div><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs uppercase tracking-wider text-gray-500">Verified only</p><p className="mt-2 text-2xl font-black">{money(verifiedTotal)}</p></div></div>
          <p className="mt-5 text-xs leading-5 text-gray-500">Use the combined total internally and in demos. For public claims, lead with confirmed or verified totals and retain the underlying calculation for each client.</p>
        </div>
      </section>

      {(message || error) && <div className={`rounded-2xl border p-4 text-sm font-bold ${error ? "border-red-400/20 bg-red-400/10 text-red-200" : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"}`}>{error || message}</div>}

      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04]">
        <div className="border-b border-white/10 p-6"><p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Impact ledger</p><h2 className="mt-2 text-2xl font-black">Client-by-client evidence</h2></div>
        <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-black/20 text-xs uppercase tracking-wider text-gray-500"><tr><th className="px-6 py-4">Client</th><th className="px-6 py-4">Missed identified</th><th className="px-6 py-4">Revenue increased</th><th className="px-6 py-4">Combined impact</th><th className="px-6 py-4">Evidence</th><th className="px-6 py-4">Period</th></tr></thead><tbody className="divide-y divide-white/10">{entries.map((entry) => { const combined = Number(entry.missed_revenue_identified) + Number(entry.increased_revenue_realized); return <tr key={entry.id} className="text-gray-300"><td className="px-6 py-4 font-bold text-white">{entry.client_name}</td><td className="px-6 py-4 text-orange-200">{money(Number(entry.missed_revenue_identified))}</td><td className="px-6 py-4 text-emerald-300">{money(Number(entry.increased_revenue_realized))}</td><td className="px-6 py-4 font-black text-white">{money(combined)}</td><td className="px-6 py-4"><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black">{statusLabel(entry.evidence_status)}</span></td><td className="whitespace-nowrap px-6 py-4 text-gray-500">{entry.period_start || entry.period_end ? `${entry.period_start || "—"} – ${entry.period_end || "—"}` : "—"}</td></tr>; })}{entries.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No client revenue impact has been recorded yet.</td></tr>}</tbody></table></div>
      </section>
    </div>
  );
}
