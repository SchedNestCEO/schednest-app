import DashboardShell from "../components/DashboardShell";

export default function BirdyPage() {
return (
<DashboardShell
title="Birdy"
subtitle="Your AI operations assistant for follow-ups, no-shows, reminders, and daily priorities."
>
<div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
<p className="text-sm font-semibold text-emerald-300">
Birdy Assistant
</p>
<h2 className="mt-3 text-2xl font-bold">Birdy is standing by</h2>
<p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
Later, Birdy will help the business owner notice missed follow-ups,
open time slots, no-shows, and revenue opportunities.
</p>
</div>
</DashboardShell>
);
}
