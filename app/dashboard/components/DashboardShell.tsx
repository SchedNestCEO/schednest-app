"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import NotificationBell from "./NotificationBell";

type DashboardShellProps = {
children: ReactNode;
title: string;
subtitle?: string;
};

type ClientUser = {
id: string;
email: string;
};

type BusinessProfile = {
id: string;
business_name: string | null;
role: string | null;
plan: string | null;
subscription_status: string | null;
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
}: DashboardShellProps) {
const supabase = useMemo(() => createClient(), []);
const router = useRouter();
const pathname = usePathname();

const [clientUser, setClientUser] = useState<ClientUser | null>(null);
const [businessProfile, setBusinessProfile] =
useState<BusinessProfile | null>(null);
const [isLoading, setIsLoading] = useState(true);

const currentPath = pathname || "/dashboard";

async function checkUser() {
const {
data: { user },
error,
} = await supabase.auth.getUser();

if (error || !user) {
router.push("/login");
return;
}

setClientUser({
id: user.id,
email: user.email ?? "Signed-in owner",
});

const { data: profile } = await supabase
.from("business_profiles")
.select("id, business_name, role, plan, subscription_status")
.eq("owner_id", user.id)
.single();

if (profile) {
setBusinessProfile(profile);
}

setIsLoading(false);
}

async function handleLogout() {
await supabase.auth.signOut();
router.push("/login");
}

function isActiveRoute(href: string) {
if (href === "/dashboard") {
return currentPath === "/dashboard";
}

return currentPath.startsWith(href);
}

useEffect(() => {
checkUser();
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

if (isLoading) {
return (
<main className="min-h-screen bg-[#050807] px-6 py-10 text-white">
<div className="mx-auto flex min-h-[80vh] max-w-7xl items-center justify-center">
<div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_0_80px_rgba(16,185,129,0.12)] backdrop-blur-xl">
<p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">
SchedNest
</p>
<h1 className="mt-4 text-3xl font-bold">Checking session...</h1>
</div>
</div>
</main>
);
}

return (
<main className="min-h-screen bg-[#050807] text-white">
<div className="mx-auto flex max-w-7xl">
<aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-white/10 bg-black/20 px-5 py-6 lg:block">
<Link href="/dashboard" className="block">
<p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">
SchedNest
</p>
<h1 className="mt-3 text-2xl font-black">
{businessProfile?.business_name || "Dashboard"}
</h1>
</Link>

<div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
<p className="text-xs text-gray-500">Signed in as</p>
<p className="mt-1 truncate text-sm font-semibold text-gray-200">
{clientUser?.email}
</p>

<div className="mt-3 flex flex-wrap gap-2">
<span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
{businessProfile?.plan || "growth"}
</span>

<span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-gray-300">
{businessProfile?.subscription_status || "active"}
</span>
</div>
</div>

<nav className="mt-6 grid gap-2">
{navItems.map((item) => {
const active = isActiveRoute(item.href);

return (
<Link
key={item.href}
href={item.href}
className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
active
? "bg-emerald-400 text-black"
: "text-gray-300 hover:bg-white/10 hover:text-white"
}`}
>
{item.label}
</Link>
);
})}
</nav>

<button
onClick={handleLogout}
className="mt-6 w-full rounded-2xl border border-white/10 px-4 py-3 text-left text-sm font-semibold text-gray-300 transition hover:bg-white/10 hover:text-white"
>
Log out
</button>
</aside>

<section className="min-h-screen flex-1 px-4 py-5 sm:px-6 lg:px-8">
<div className="mb-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 lg:hidden">
<div className="flex items-center justify-between gap-4">
<div>
<p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">
SchedNest
</p>
<p className="mt-1 max-w-[180px] truncate text-sm font-bold text-white">
{businessProfile?.business_name || "Dashboard"}
</p>
</div>

<div className="flex items-center gap-2">
<NotificationBell variant="mobile" />

<button
onClick={handleLogout}
className="rounded-2xl border border-white/10 px-3 py-2 text-xs font-semibold text-gray-300"
>
Log out
</button>
</div>
</div>

<div className="mt-4">
<label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
Dashboard Menu
</label>

<select
value={
navItems.some((item) => isActiveRoute(item.href))
? navItems.find((item) => isActiveRoute(item.href))?.href
: "/dashboard"
}
onChange={(event) => router.push(event.target.value)}
className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm font-semibold text-white outline-none focus:border-emerald-400"
>
{navItems.map((item) => (
<option key={item.href} value={item.href}>
{item.label}
</option>
))}
</select>
</div>
</div>

<div className="mb-6 hidden w-fit max-w-full rounded-[2rem] border border-white/10 bg-white/[0.04] py-3 pl-3 pr-8 lg:block">
<div className="flex items-center gap-2 overflow-visible">
{navItems.map((item) => {
const active = isActiveRoute(item.href);

return (
<Link
key={item.href}
href={item.href}
className={`whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-semibold transition ${
active
? "bg-emerald-400 text-black"
: "text-gray-300 hover:bg-white/10 hover:text-white"
}`}
>
{item.label}
</Link>
);
})}

<div className="shrink-0">
<NotificationBell variant="top" />
</div>
</div>
</div>

<header className="mb-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_80px_rgba(16,185,129,0.08)] backdrop-blur-xl sm:p-8">
<p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">
Owner Dashboard
</p>

<h1 className="mt-4 text-3xl font-black leading-tight sm:text-5xl">
{title}
</h1>

{subtitle && (
<p className="mt-4 max-w-3xl text-sm leading-6 text-gray-400 sm:text-base">
{subtitle}
</p>
)}
</header>

{children}
</section>
</div>
</main>
);
}