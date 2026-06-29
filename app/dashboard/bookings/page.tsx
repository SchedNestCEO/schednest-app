import DashboardShell from "../components/DashboardShell";

export default function BookingsPage() {
return (
<DashboardShell
title="Bookings"
subtitle="Track appointments, requests, open slots, and schedule changes."
>
<div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
<p className="text-sm font-semibold text-emerald-300">
Booking Requests
</p>
<h2 className="mt-3 text-2xl font-bold">No bookings yet</h2>
<p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
Once the booking system is connected, customer requests and confirmed
appointments will appear here.
</p>
</div>
</DashboardShell>
);
}
