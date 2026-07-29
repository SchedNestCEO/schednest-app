"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";

const DEFAULT_RATE = 50;
const OPENING_HOURS = 204;
const TRACKING_START = "2026-06-24T12:00:00-07:00";

const CATEGORIES = [
  "Founder / Executive",
  "Product Management",
  "Business Operations",
  "Project Coordination",
  "Market & Customer Research",
  "Branding & Marketing",
  "Website / Product Testing",
  "Strategy & Company Development",
];

type TimeEntry = {
  id: string;
  category: string;
  description: string | null;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  hourly_rate: number;
  status: "unpaid_founder_contribution" | "deferred_approved" | "paid";
  is_historical: boolean;
  manual_hours: number | null;
};

function entryHours(entry: TimeEntry, now = Date.now()) {
  if (entry.manual_hours !== null) return Number(entry.manual_hours);
  const end = entry.clock_out ? new Date(entry.clock_out).getTime() : now;
  const start = new Date(entry.clock_in).getTime();
  return Math.max(0, (end - start) / 3_600_000 - entry.break_minutes / 60);
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((v) => String(v).padStart(2, "0")).join(":");
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function FounderTimeTracker() {
  const supabase = useMemo(() => createClient(), []);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualDate, setManualDate] = useState("");
  const [manualHours, setManualHours] = useState("");
  const [manualCategory, setManualCategory] = useState(CATEGORIES[0]);
  const [manualDescription, setManualDescription] = useState("");

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
      setActiveEntry(null);
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
      setActiveEntry(null);
      setError(adminError.message);
      setIsLoading(false);
      return;
    }

    const admin = Boolean(adminMembership);
    setIsAdmin(admin);

    if (!admin) {
      setEntries([]);
      setActiveEntry(null);
      setIsLoading(false);
      return;
    }

    const { data, error: queryError } = await supabase
      .from("founder_time_entries")
      .select("id, category, description, clock_in, clock_out, break_minutes, hourly_rate, status, is_historical, manual_hours")
      .order("clock_in", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setIsLoading(false);
      return;
    }

    const loaded = (data || []) as TimeEntry[];
    setEntries(loaded);
    setActiveEntry(loaded.find((entry) => !entry.clock_out && entry.manual_hours === null) || null);
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    queueMicrotask(() => void loadEntries());
  }, [loadEntries]);

  useEffect(() => {
    if (!activeEntry) return;

    const update = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - new Date(activeEntry.clock_in).getTime()) / 1000)));
    };
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [activeEntry]);

  async function clockIn() {
    setIsSaving(true);
    setMessage(null);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Please sign in again.");
      setIsSaving(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("founder_time_entries")
      .insert({
        user_id: user.id,
        category,
        description: description.trim() || null,
        clock_in: new Date().toISOString(),
        hourly_rate: DEFAULT_RATE,
      })
      .select()
      .single();

    if (insertError) setError(insertError.message);
    else {
      setActiveEntry(data as TimeEntry);
      setDescription("");
      setMessage("Clocked in. Your founder session is now being tracked.");
      await loadEntries();
    }
    setIsSaving(false);
  }

  async function clockOut() {
    if (!activeEntry) return;
    setIsSaving(true);
    setMessage(null);
    setError(null);

    const { error: updateError } = await supabase
      .from("founder_time_entries")
      .update({ clock_out: new Date().toISOString() })
      .eq("id", activeEntry.id);

    if (updateError) setError(updateError.message);
    else {
      setMessage("Clocked out. The session was added to your founder contribution record.");
      setActiveEntry(null);
      await loadEntries();
    }
    setIsSaving(false);
  }

  async function addOpeningBalance() {
    setIsSaving(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const alreadyExists = entries.some((entry) => entry.is_historical && Number(entry.manual_hours) === OPENING_HOURS);
    if (alreadyExists) {
      setMessage("The 204-hour opening balance is already included.");
      setIsSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("founder_time_entries").insert({
      user_id: user.id,
      category: "Founder / Executive",
      description: "Historical founder contribution through July 22, 2026",
      clock_in: TRACKING_START,
      clock_out: TRACKING_START,
      hourly_rate: DEFAULT_RATE,
      is_historical: true,
      manual_hours: OPENING_HOURS,
    });

    if (insertError) setError(insertError.message);
    else {
      setMessage("204 historical hours and $10,200 in estimated value were added.");
      await loadEntries();
    }
    setIsSaving(false);
  }

  async function addManualEntry() {
    const hours = Number(manualHours);
    if (!manualDate || !Number.isFinite(hours) || hours <= 0) {
      setError("Enter a date and a valid number of hours.");
      return;
    }

    setIsSaving(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const localDate = new Date(`${manualDate}T12:00:00`);
    const { error: insertError } = await supabase.from("founder_time_entries").insert({
      user_id: user.id,
      category: manualCategory,
      description: manualDescription.trim() || "Manual founder time entry",
      clock_in: localDate.toISOString(),
      clock_out: localDate.toISOString(),
      hourly_rate: DEFAULT_RATE,
      manual_hours: hours,
    });

    if (insertError) setError(insertError.message);
    else {
      setManualDate("");
      setManualHours("");
      setManualDescription("");
      setMessage("Manual founder time entry added.");
      await loadEntries();
    }
    setIsSaving(false);
  }

  const now = activeEntry
    ? new Date(activeEntry.clock_in).getTime() + elapsedSeconds * 1000
    : 0;
  const totalHours = entries.reduce((sum, entry) => sum + entryHours(entry, now), 0);
  const totalValue = entries.reduce((sum, entry) => sum + entryHours(entry, now) * Number(entry.hourly_rate), 0);
  const startOfWeek = new Date();
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));
  const weekHours = entries
    .filter((entry) => new Date(entry.clock_in) >= startOfWeek)
    .reduce((sum, entry) => sum + entryHours(entry, now), 0);

  if (isLoading) return <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-gray-300">Loading founder time…</div>;

  if (!isAdmin) {
    return (
      <div className="rounded-[2rem] border border-red-400/20 bg-red-400/10 p-8">
        <h1 className="text-2xl font-black">Admin access required</h1>
        <p className="mt-3 text-sm text-red-100/80">Founder Time is restricted to the SchedNest administrator account.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-emerald-400/15 via-white/[0.04] to-orange-400/10 p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">Admin · Founder Time</p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">Founder Time & Compensation</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">Track active work sessions and the estimated economic value of unpaid founder contributions at a blended rate of $50 per hour.</p>
          </div>
          <span className="w-fit rounded-full border border-orange-300/20 bg-orange-300/10 px-4 py-2 text-xs font-black text-orange-200">Not accrued payroll</span>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Lifetime hours", `${totalHours.toFixed(1)} hrs`],
          ["Estimated value", money(totalValue)],
          ["This week", `${weekHours.toFixed(1)} hrs`],
          ["Reference rate", "$50.00/hr"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">{label}</p>
            <p className="mt-3 text-3xl font-black text-white">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Live session</p>
              <h2 className="mt-2 text-2xl font-black">{activeEntry ? "Currently clocked in" : "Ready to begin"}</h2>
            </div>
            {activeEntry && <span className="h-3 w-3 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,.8)]" />}
          </div>

          {activeEntry ? (
            <div className="mt-8">
              <div className="rounded-[1.75rem] border border-emerald-400/20 bg-black/20 p-6 text-center">
                <p className="font-mono text-5xl font-black tracking-tight sm:text-6xl">{formatDuration(elapsedSeconds)}</p>
                <p className="mt-3 text-sm font-bold text-emerald-300">{activeEntry.category}</p>
                {activeEntry.description && <p className="mt-2 text-sm text-gray-400">{activeEntry.description}</p>}
              </div>
              <button disabled={isSaving} onClick={clockOut} className="mt-5 w-full rounded-2xl bg-orange-400 px-5 py-4 text-sm font-black text-black transition hover:bg-orange-300 disabled:opacity-50">Clock Out</button>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <label className="block"><span className="text-sm font-bold text-gray-300">Work category</span><select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#07100d] px-4 py-3 text-white outline-none focus:border-emerald-400">{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="block"><span className="text-sm font-bold text-gray-300">What are you working on?</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Example: Revising onboarding and conflict-detection flow" className="mt-2 w-full rounded-2xl border border-white/10 bg-[#07100d] px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-emerald-400" /></label>
              <button disabled={isSaving} onClick={clockIn} className="w-full rounded-2xl bg-emerald-400 px-5 py-4 text-sm font-black text-black transition hover:bg-emerald-300 disabled:opacity-50">Clock In</button>
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-200">Opening balance</p>
          <h2 className="mt-2 text-2xl font-black">Add your work to date</h2>
          <p className="mt-3 text-sm leading-6 text-gray-400">This creates one historical entry for the 204 hours already estimated through July 22, 2026.</p>
          <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
            <div className="flex items-end justify-between"><div><p className="text-sm text-gray-500">Historical hours</p><p className="mt-1 text-3xl font-black">204</p></div><div className="text-right"><p className="text-sm text-gray-500">Estimated value</p><p className="mt-1 text-3xl font-black">$10,200</p></div></div>
          </div>
          <button disabled={isSaving} onClick={addOpeningBalance} className="mt-5 w-full rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-4 text-sm font-black text-emerald-300 transition hover:bg-emerald-400/20 disabled:opacity-50">Add 204-Hour Opening Balance</button>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
        <div><p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-200">Manual entry</p><h2 className="mt-2 text-2xl font-black">Add forgotten or offline work</h2></div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} className="rounded-2xl border border-white/10 bg-[#07100d] px-4 py-3 text-white" />
          <input type="number" min="0.25" step="0.25" value={manualHours} onChange={(e) => setManualHours(e.target.value)} placeholder="Hours" className="rounded-2xl border border-white/10 bg-[#07100d] px-4 py-3 text-white" />
          <select value={manualCategory} onChange={(e) => setManualCategory(e.target.value)} className="rounded-2xl border border-white/10 bg-[#07100d] px-4 py-3 text-white">{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select>
          <input value={manualDescription} onChange={(e) => setManualDescription(e.target.value)} placeholder="What was completed?" className="rounded-2xl border border-white/10 bg-[#07100d] px-4 py-3 text-white" />
        </div>
        <button disabled={isSaving} onClick={addManualEntry} className="mt-4 rounded-2xl bg-white px-5 py-3 text-sm font-black text-black disabled:opacity-50">Add Manual Entry</button>
      </section>

      {(message || error) && <div className={`rounded-2xl border p-4 text-sm font-bold ${error ? "border-red-400/20 bg-red-400/10 text-red-200" : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"}`}>{error || message}</div>}

      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04]">
        <div className="border-b border-white/10 p-6"><p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">History</p><h2 className="mt-2 text-2xl font-black">Founder work sessions</h2></div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-black/20 text-xs uppercase tracking-wider text-gray-500"><tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">Category</th><th className="px-6 py-4">Work</th><th className="px-6 py-4">Hours</th><th className="px-6 py-4">Value</th><th className="px-6 py-4">Status</th></tr></thead>
            <tbody className="divide-y divide-white/10">
              {entries.map((entry) => {
                const hours = entryHours(entry, now);
                return <tr key={entry.id} className="text-gray-300"><td className="whitespace-nowrap px-6 py-4">{new Date(entry.clock_in).toLocaleDateString()}</td><td className="px-6 py-4 font-bold text-white">{entry.category}</td><td className="max-w-md px-6 py-4 text-gray-400">{entry.description || "—"}</td><td className="px-6 py-4 font-black">{hours.toFixed(2)}</td><td className="px-6 py-4 font-black text-emerald-300">{money(hours * Number(entry.hourly_rate))}</td><td className="px-6 py-4"><span className="rounded-full bg-orange-300/10 px-3 py-1 text-xs font-black text-orange-200">{entry.status.replaceAll("_", " ")}</span></td></tr>;
              })}
              {entries.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No founder time has been recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
