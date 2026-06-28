"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabase/client";

type ClientUser = {
id: string;
email: string;
};

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
const [isLoading, setIsLoading] = useState(true);
const [clientUser, setClientUser] = useState<ClientUser | null>(null);

const todayLabel = useMemo(() => {
return new Intl.DateTimeFormat("en-US", {
weekday: "long",
month: "long",
day: "numeric",
year: "numeric",
}).format(new Date());
}, []);

useEffect(() => {
async function checkUser() {
const supabase = createClient();

const {
data: { user },
} = await supabase.auth.getUser();

if (!user) {
window.location.href = "/login";
return;
}

setClientUser({
id: user.id,
email: user.email ?? "Signed-in owner",
});

setIsLoading(false);
}

checkUser();
}, []);

async function handleLogout() {
const supabase = createClient();
await supabase.auth.signOut();
window.location.href = "/login";
}

if (isLoading) {
return (
<main className="min-h-screen bg-[#050807] px-6 py-10 text-white">
<div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-7xl items-center justify-center">
<div className="rounded-3xl border border-white/10 bg-[#07110d]/85 p-8 text-center shadow-[0_0_80px_rgba(16,185,129,0.12)] backdrop-blur-xl">
<p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">
SchedNest
</p>
<h1 className="mt-4 text-3xl font-bold">Checking session...</h1>
</div>
</div>
</main>
);
}

if (!clientUser) {
return null;
}

return (
<main className="min-h-screen bg-[#050807] text-white">
<div className="flex min-h-screen">
<aside className="hidden w-72 border-r border-white/10 bg-[#07110d]/80 px-6 py-8 lg:block">
<a href="/" className="flex items-center gap-3">
<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-sm font-black text-emerald-300">
S
</div>

<div>
<p className="text-lg font-bold tracking-tight">SchedNest</p>
<p className="text-xs text-gray-500">Client Dashboard</p>
</div>
</a>

<nav className="mt-10 space-y-2 text-sm">
<a
href="/dashboard"
className="block rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 font-semibold text-emerald-200"
>
Dashboard
</a>

<button className="block w-full rounded-2xl px-4 py-3 text-left text-gray-400">
Bookings
</button>

<button className="block w-full rounded-2xl px-4 py-3 text-left text-gray-400">
Customers
</button>

<button className="block w-full rounded-2xl px-4 py-3 text-left text-gray-400">
Services
</button>

<button className="block w-full rounded-2xl px-4 py-3 text-left text-gray-400">
Booking Page
</button>

<button className="block w-full rounded-2xl px-4 py-3 text-left text-gray-400">
Birdy
</button>
</nav>

<div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
<p className="text-sm font-semibold text-emerald-300">
Discipline Rule
</p>
<p className="mt-3 text-sm leading-6 text-gray-400">
Every feature should save time, reduce chaos, protect revenue, or
improve follow-through.
</p>
</div>
</aside>

<section className="flex-1 px-5 py-6 sm:px-8 lg:px-10">
<header className="flex flex-col gap-5 border-b border-white/10 pb-6 md:flex-row md:items-center md:justify-between">
<div>
<p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">
Client Workspace
</p>
<h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
Manage your day with discipline.
</h1>
<p className="mt-2 text-sm text-gray-400">{todayLabel}</p>
</div>

<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
<div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-gray-300">
Signed in as{" "}
<span className="font-semibold text-white">
{clientUser.email}
</span>
</div>

<button
onClick={handleLogout}
className="rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-gray-300 transition hover:border-emerald-300 hover:text-emerald-300"
>
Log out
</button>
</div>
</header>

<section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
{stats.map((item) => (
<div
key={item.label}
className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"
>
<p className="text-sm font-medium text-gray-400">
{item.label}
</p>
<p className="mt-4 text-4xl font-bold text-white">
{item.value}
</p>
<p className="mt-3 text-sm leading-6 text-gray-500">
{item.helper}
</p>
</div>
))}
</section>

<section className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
<div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
<div>
<p className="text-sm font-semibold text-emerald-300">
Today’s Focus
</p>
<h2 className="mt-2 text-2xl font-bold">
Keep the business moving
</h2>
</div>

<span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-xs font-semibold text-emerald-200">
Birdy will power this later
</span>
</div>

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
<h3 className="font-semibold text-white">
{item.title}
</h3>
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
<h2 className="mt-2 text-2xl font-bold">
Build your booking system
</h2>

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

<section className="mt-8 grid gap-6 lg:grid-cols-3">
<div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
<p className="text-sm font-semibold text-emerald-300">
Booking Requests
</p>
<h2 className="mt-3 text-xl font-bold">No requests yet</h2>
<p className="mt-3 text-sm leading-6 text-gray-400">
Customer booking requests will appear here before they become
confirmed appointments.
</p>
</div>

<div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
<p className="text-sm font-semibold text-emerald-300">
Customer Follow-up
</p>
<h2 className="mt-3 text-xl font-bold">No follow-ups yet</h2>
<p className="mt-3 text-sm leading-6 text-gray-400">
Birdy will help notice customers who may need a reminder,
reply, or rebooking message.
</p>
</div>

<div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
<p className="text-sm font-semibold text-emerald-300">
Public Booking Page
</p>
<h2 className="mt-3 text-xl font-bold">Coming next</h2>
<p className="mt-3 text-sm leading-6 text-gray-400">
Your customers will eventually book or request appointments from
a simple public page without creating an account.
</p>
</div>
</section>
</section>
</div>
</main>
);
}
