"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardShell from "../components/DashboardShell";
import { createClient } from "../../lib/supabase/client";

type BusinessProfile = {
id: string;
owner_id: string;
business_name: string | null;
slug: string | null;
timezone: string | null;
};

type BusinessHour = {
id?: string;
business_id?: string;
owner_id?: string;
day_of_week: number;
is_open: boolean;
open_time: string | null;
close_time: string | null;
};

const days = [
"Sunday",
"Monday",
"Tuesday",
"Wednesday",
"Thursday",
"Friday",
"Saturday",
];

function defaultHours(businessId: string, ownerId: string): BusinessHour[] {
return days.map((_, index) => ({
business_id: businessId,
owner_id: ownerId,
day_of_week: index,
is_open: index >= 1 && index <= 5,
open_time: index >= 1 && index <= 5 ? "09:00" : null,
close_time: index >= 1 && index <= 5 ? "17:00" : null,
}));
}

function toTimeValue(value: string | null) {
if (!value) return "";
return value.slice(0, 5);
}

export default function BookingPageSettings() {
const supabase = useMemo(() => createClient(), []);

const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
const [hours, setHours] = useState<BusinessHour[]>([]);
const [slug, setSlug] = useState("");
const [isLoading, setIsLoading] = useState(true);
const [isSaving, setIsSaving] = useState(false);
const [message, setMessage] = useState("");
const [errorMessage, setErrorMessage] = useState("");

const publicUrl =
typeof window !== "undefined" && slug
? `${window.location.origin}/book/${slug}`
: slug
? `/book/${slug}`
: "";

async function loadSettings() {
setIsLoading(true);
setErrorMessage("");
setMessage("");

const {
data: { user },
error: userError,
} = await supabase.auth.getUser();

if (userError || !user) {
setErrorMessage("Unable to load user session.");
setIsLoading(false);
return;
}

const { data: profile, error: profileError } = await supabase
.from("business_profiles")
.select("id, owner_id, business_name, slug, timezone")
.eq("owner_id", user.id)
.single();

if (profileError || !profile) {
setErrorMessage("Business profile not found.");
setIsLoading(false);
return;
}

setBusinessProfile(profile);
setSlug(profile.slug || "");

const { data: hourData, error: hoursError } = await supabase
.from("business_hours")
.select("id, business_id, owner_id, day_of_week, is_open, open_time, close_time")
.eq("business_id", profile.id)
.order("day_of_week", { ascending: true });

if (hoursError) {
setErrorMessage(hoursError.message);
setIsLoading(false);
return;
}

if (!hourData || hourData.length === 0) {
setHours(defaultHours(profile.id, profile.owner_id));
} else {
const normalized = days.map((_, index) => {
const existing = hourData.find((hour) => hour.day_of_week === index);

return (
existing || {
business_id: profile.id,
owner_id: profile.owner_id,
day_of_week: index,
is_open: false,
open_time: null,
close_time: null,
}
);
});

setHours(normalized);
}

setIsLoading(false);
}

function updateHour(index: number, changes: Partial<BusinessHour>) {
setHours((current) =>
current.map((hour) =>
hour.day_of_week === index ? { ...hour, ...changes } : hour
)
);
}

async function saveSettings() {
if (!businessProfile) {
setErrorMessage("Business profile not loaded.");
return;
}

if (!slug.trim()) {
setErrorMessage("Booking page slug is required.");
return;
}

setIsSaving(true);
setErrorMessage("");
setMessage("");

const cleanSlug = slug
.trim()
.toLowerCase()
.replace(/[^a-z0-9-]/g, "-")
.replace(/-+/g, "-")
.replace(/^-|-$/g, "");

const { error: profileError } = await supabase
.from("business_profiles")
.update({ slug: cleanSlug })
.eq("id", businessProfile.id);

if (profileError) {
setErrorMessage(profileError.message);
setIsSaving(false);
return;
}

const rows = hours.map((hour) => ({
business_id: businessProfile.id,
owner_id: businessProfile.owner_id,
day_of_week: hour.day_of_week,
is_open: hour.is_open,
open_time: hour.is_open ? toTimeValue(hour.open_time) || "09:00" : null,
close_time: hour.is_open ? toTimeValue(hour.close_time) || "17:00" : null,
}));

const { error: hoursError } = await supabase
.from("business_hours")
.upsert(rows, { onConflict: "business_id,day_of_week" });

if (hoursError) {
setErrorMessage(hoursError.message);
setIsSaving(false);
return;
}

setSlug(cleanSlug);
setMessage("Booking page settings saved.");
await loadSettings();
setIsSaving(false);
}

useEffect(() => {
loadSettings();
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

return (
<DashboardShell
title="Booking Page"
subtitle="Set your public booking link and business hours."
>
<div className="space-y-6">
<div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
<p className="text-sm font-semibold text-emerald-300">Public Booking Link</p>
<h2 className="mt-3 text-2xl font-bold">Share your booking page</h2>
<p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
This is the link customers will use to request appointments.
</p>

<div className="mt-6">
<label className="text-sm font-medium text-gray-300">Booking slug</label>
<input
value={slug}
onChange={(event) => setSlug(event.target.value)}
placeholder="schednest"
className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
/>
</div>

{publicUrl && (
<div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
<p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
Public URL
</p>
<a
href={publicUrl}
target="_blank"
className="mt-2 block break-all text-sm font-semibold text-emerald-300 hover:text-emerald-200"
>
{publicUrl}
</a>
</div>
)}
</div>

<div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
<p className="text-sm font-semibold text-emerald-300">Business Hours</p>
<h2 className="mt-3 text-2xl font-bold">
{isLoading ? "Loading hours..." : "Set your weekly availability"}
</h2>
<p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
These hours will appear on your public booking page. Later, SchedNest will use them to generate available time slots automatically.
</p>

<div className="mt-6 grid gap-4">
{hours.map((hour) => (
<div
key={hour.day_of_week}
className="grid gap-4 rounded-3xl border border-white/10 bg-black/20 p-5 md:grid-cols-[1fr_120px_1fr_1fr]"
>
<div>
<p className="font-semibold text-white">{days[hour.day_of_week]}</p>
<p className="mt-1 text-sm text-gray-500">
{hour.is_open ? "Open" : "Closed"}
</p>
</div>

<label className="flex items-center gap-2 text-sm text-gray-300">
<input
type="checkbox"
checked={hour.is_open}
onChange={(event) =>
updateHour(hour.day_of_week, {
is_open: event.target.checked,
open_time: event.target.checked
? hour.open_time || "09:00"
: null,
close_time: event.target.checked
? hour.close_time || "17:00"
: null,
})
}
/>
Open
</label>

<div>
<label className="text-xs font-medium text-gray-400">Open time</label>
<input
type="time"
value={toTimeValue(hour.open_time)}
disabled={!hour.is_open}
onChange={(event) =>
updateHour(hour.day_of_week, {
open_time: event.target.value,
})
}
className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none disabled:opacity-40"
/>
</div>

<div>
<label className="text-xs font-medium text-gray-400">Close time</label>
<input
type="time"
value={toTimeValue(hour.close_time)}
disabled={!hour.is_open}
onChange={(event) =>
updateHour(hour.day_of_week, {
close_time: event.target.value,
})
}
className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none disabled:opacity-40"
/>
</div>
</div>
))}
</div>

{errorMessage && (
<p className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
{errorMessage}
</p>
)}

{message && (
<p className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
{message}
</p>
)}

<button
onClick={saveSettings}
disabled={isSaving}
className="mt-6 rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
>
{isSaving ? "Saving..." : "Save booking page"}
</button>
</div>
</div>
</DashboardShell>
);
}