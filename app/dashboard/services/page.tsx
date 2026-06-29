import DashboardShell from "../components/DashboardShell";

export default function ServicesPage() {
return (
<DashboardShell
title="Services"
subtitle="Create the services customers can request from your booking page."
>
<div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
<p className="text-sm font-semibold text-emerald-300">
Service Menu
</p>
<h2 className="mt-3 text-2xl font-bold">No services added yet</h2>
<p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
This is where a business owner will add services, prices, durations,
and descriptions.
</p>
</div>
</DashboardShell>
);
}
