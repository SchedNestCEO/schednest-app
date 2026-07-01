"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

type ClientUser = {
id: string;
email: string;
};

type BusinessProfile = {
business_name: string;
role: "founder" | "business_owner";
plan: "essentials" | "growth" | "complete" | "teams";
subscription_status: "beta" | "active" | "past_due" | "canceled";
};

const navItems = [
{ label: "Dashboard", href: "/dashboard" },
{ label: "Bookings", href: "/dashboard/bookings" },
{ label: "Requests", href: "/dashboard/requests" },
{ label: "Customers", href: "/dashboard/customers" },
{ label: "Services", href: "/dashboard/services" },
{ label: "Booking Page", href: "/dashboard/booking-page" },
{ label: "Birdy", href: "/dashboard/birdy" },

];

export default function DashboardShell({
children,
title,
subtitle,
}: {
children: React.ReactNode;
title: string;
subtitle: string;
}) {
const pathname = usePathname();
const [isLoading, setIsLoading] = useState(true);
const [clientUser, setClientUser] = useState<ClientUser | null>(null);
const [businessProfile, setBusinessProfile] =
useState<BusinessProfile | null>(null);

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

const { data: profile, error } = await supabase
.from("business_profiles")
.select("business_name, role, plan, subscription_status")
.eq("owner_id", user.id)
.single();

if (error || !profile) {
window.location.href = "/coming-soon";
return;
}

setClientUser({
id: user.id,
email: user.email ?? "Signed-in owner",
});

setBusinessProfile(profile as BusinessProfile);
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

if (!clientUser || !businessProfile) {
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
<p className="text-xs text-gray-500">
{businessProfile.role === "founder"
? "Founder Workspace"
: "Client Dashboard"}
</p>
</div>
</a>

<nav className="mt-10 space-y-2 text-sm">
{navItems.map((item) => {
const isActive = pathname === item.href;

return (
<a
key={item.href}
href={item.href}
className={
isActive
? "block rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 font-semibold text-emerald-200"
: "block rounded-2xl px-4 py-3 text-gray-400 transition hover:bg-white/[0.04] hover:text-white"
}
>
{item.label}
</a>
);
})}
</nav>

<div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
<div className="flex items-center justify-between gap-3">
<p className="text-sm font-semibold text-emerald-300">
Birdy Suggestions
</p>
<span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-200">
Soon
</span>
</div>

<p className="mt-3 text-sm leading-6 text-gray-400">
No urgent suggestions yet. Later, Birdy will help surface missed
follow-ups, open time slots, no-shows, and customer messages that
need attention.
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
{title}
</h1>
<p className="mt-2 text-sm text-gray-400">{subtitle}</p>
<p className="mt-1 text-sm text-gray-500">{todayLabel}</p>
</div>

<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
<div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-gray-300">
<span className="font-semibold text-white">
{businessProfile.business_name}
</span>
<span className="ml-2 text-gray-500">
{businessProfile.plan}
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

<div className="mt-8">{children}</div>
</section>
</div>
</main>
);
}
