import DashboardShell from "./components/DashboardShell";

const stats = [
{
label: "Today’s Bookings",
value: "0",
helper: "Appointments will appear here once booking is connected.",
},
{
label: "Pending Requests",
value: "0",
helper: "New customer requests will wait here for review.",
},
{
label: "Customers",
value: "0",
helper: "Your client list will build as people book with you.",
},
{
label: "Follow-ups",
value: "0",
helper: "Birdy will help surface people who need attention.",
},
];

const setupSteps = [
"Create your business profile",
"Add your services",
"Set your working hours",
"Turn on customer booking requests",
"Review follow-ups with Birdy",
];

const focusItems = [
{
title: "Review today’s schedule",
description:
"See what is booked, what is open, and what needs attention before the day gets busy.",
},
{
title: "Respond to pending requests",
description:
"Keep customers from waiting too long and reduce missed revenue opportunities.",
},
{
title: "Protect open time slots",
description:
"Spot gaps in the schedule that could be filled with new appointments.",
},
];

export default function DashboardPage() {
return (
<DashboardShell
title="Manage your Nest."
subtitle="Manage bookings, customers, follow-ups, and open time from one place."
>
<section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
{stats.map((item) => (
<div
key={item.label}
className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"
>
<p className="text-sm font-medium text-gray-400">{item.label}</p>
<p className="mt-4 text-4xl font-bold text-white">{item.value}</p>
<p className="mt-3 text-sm leading-6 text-gray-500">
{item.helper}
</p>
</div>
))}
</section>

<section className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
<div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
<p className="text-sm font-semibold text-emerald-300">
Today’s Focus
</p>
<h2 className="mt-2 text-2xl font-bold">Keep the business moving</h2>

<div className="mt-6 space-y-4">
{focusItems.map((item, index) => (
<div
key={item.title}
className="rounded-3xl border border-white/10 bg-[#050807]/60 p-5"
>
<div className="flex gap-4">
<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-300 text-sm font-black text-black">
{index + 1}
</div>

<div>
<h3 className="font-semibold text-white">{item.title}</h3>
<p className="mt-2 text-sm leading-6 text-gray-400">
{item.description}
</p>
</div>
</div>
</div>
))}
</div>
</div>

<div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
<p className="text-sm font-semibold text-emerald-300">
Setup Checklist
</p>
<h2 className="mt-2 text-2xl font-bold">Build your booking system</h2>

<div className="mt-6 space-y-3">
{setupSteps.map((step) => (
<div
key={step}
className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#050807]/60 p-4"
>
<div className="h-3 w-3 rounded-full border border-emerald-300/60" />
<p className="text-sm text-gray-300">{step}</p>
</div>
))}
</div>
</div>
</section>
</DashboardShell>
);
}
