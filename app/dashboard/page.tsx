"use client";

import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";

export default function DashboardPage() {
const [isLoading, setIsLoading] = useState(true);
const [isSignedIn, setIsSignedIn] = useState(false);

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

setIsSignedIn(true);
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

if (!isSignedIn) {
return null;
}

return (
<main className="min-h-screen bg-[#050807] px-6 py-10 text-white">
<div className="mx-auto max-w-7xl">
<header className="flex items-center justify-between border-b border-white/10 pb-6">
<a href="/" className="flex items-center gap-3">
<div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-bold text-emerald-300">
S
</div>

<span className="text-xl font-semibold tracking-tight">
SchedNest
</span>
</a>

<button
onClick={handleLogout}
className="rounded-full border border-white/10 px-5 py-2 text-sm font-medium text-gray-300 transition hover:border-emerald-300 hover:text-emerald-300"
>
Log out
</button>
</header>

<section className="py-16">
<p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">
Dashboard
</p>

<h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
Your SchedNest dashboard is connected.
</h1>

<p className="mt-5 max-w-2xl text-lg leading-8 text-gray-400">
This is the private owner side of SchedNest. Next, we’ll build the
dashboard around disciplined time management: bookings, customers,
follow-ups, reminders, open slots, and Birdy’s daily priorities.
</p>
</section>

<section className="grid gap-6 md:grid-cols-3">
<div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
<p className="text-sm font-semibold text-emerald-300">
Today’s Focus
</p>
<h2 className="mt-3 text-2xl font-bold">Stay organized</h2>
<p className="mt-3 text-sm leading-6 text-gray-400">
This card will eventually show the most important actions for the
day.
</p>
</div>

<div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
<p className="text-sm font-semibold text-emerald-300">Bookings</p>
<h2 className="mt-3 text-2xl font-bold">No bookings yet</h2>
<p className="mt-3 text-sm leading-6 text-gray-400">
This area will track appointments, open slots, and schedule
activity.
</p>
</div>

<div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
<p className="text-sm font-semibold text-emerald-300">Birdy</p>
<h2 className="mt-3 text-2xl font-bold">Standing by</h2>
<p className="mt-3 text-sm leading-6 text-gray-400">
Birdy will help notice missed follow-ups, no-shows, and revenue
opportunities.
</p>
</div>
</section>
</div>
</main>
);
}
