import DashboardShell from "../components/DashboardShell";

export default function BookingPageSettingsPage() {
return (
<DashboardShell
title="Booking Page"
subtitle="Control the public page customers will use to request appointments."
>
<div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
<p className="text-sm font-semibold text-emerald-300">
Public Booking Page
</p>
<h2 className="mt-3 text-2xl font-bold">Coming soon</h2>
<p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
This page will control the public booking link, business details,
services shown, and customer request settings.
</p>
</div>
</DashboardShell>
);
}
