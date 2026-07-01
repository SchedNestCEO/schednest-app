"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardShell from "../components/DashboardShell";
import { createClient } from "../../lib/supabase/client";

type BusinessProfile = {
id: string;
owner_id: string;
business_name: string | null;
};

type Service = {
id: string;
business_id: string;
owner_id: string;
name: string;
description: string | null;
price: number | null;
duration_minutes: number | null;
is_active: boolean | null;
};

export default function ServicesPage() {
const supabase = useMemo(() => createClient(), []);

const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
const [services, setServices] = useState<Service[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [isSaving, setIsSaving] = useState(false);
const [errorMessage, setErrorMessage] = useState("");

const [name, setName] = useState("");
const [description, setDescription] = useState("");
const [price, setPrice] = useState("");
const [durationMinutes, setDurationMinutes] = useState("60");

async function loadServices() {
setIsLoading(true);
setErrorMessage("");

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
.select("id, owner_id, business_name")
.eq("owner_id", user.id)
.single();

if (profileError || !profile) {
setErrorMessage("Business profile not found.");
setIsLoading(false);
return;
}

setBusinessProfile(profile);

const { data: serviceData, error: servicesError } = await supabase
.from("services")
.select("id, business_id, owner_id, name, description, price, duration_minutes, is_active")
.eq("business_id", profile.id)
.order("created_at", { ascending: false });

if (servicesError) {
setErrorMessage("Unable to load services.");
setIsLoading(false);
return;
}

setServices(serviceData || []);
setIsLoading(false);
}

async function handleAddService(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();

if (!businessProfile) {
setErrorMessage("Business profile not loaded yet.");
return;
}

if (!name.trim()) {
setErrorMessage("Service name is required.");
return;
}

setIsSaving(true);
setErrorMessage("");

const { error } = await supabase.from("services").insert({
business_id: businessProfile.id,
owner_id: businessProfile.owner_id,
name: name.trim(),
description: description.trim() || null,
price: price ? Number(price) : null,
duration_minutes: durationMinutes ? Number(durationMinutes) : 60,
is_active: true,
});

if (error) {
setErrorMessage(error.message);
setIsSaving(false);
return;
}

setName("");
setDescription("");
setPrice("");
setDurationMinutes("60");

await loadServices();
setIsSaving(false);
}

async function toggleServiceStatus(service: Service) {
const { error } = await supabase
.from("services")
.update({ is_active: !service.is_active })
.eq("id", service.id);

if (error) {
setErrorMessage(error.message);
return;
}

await loadServices();
}

useEffect(() => {
loadServices();
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

return (
<DashboardShell
title="Services"
subtitle="Create the services customers can request from your booking page."
>
<div className="space-y-6">
<div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
<p className="text-sm font-semibold text-emerald-300">Service Menu</p>
<h2 className="mt-3 text-2xl font-bold">Add a service</h2>
<p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
Add the services your clients can book. These will later appear on your public booking page.
</p>

<form onSubmit={handleAddService} className="mt-6 grid gap-4">
<div>
<label className="text-sm font-medium text-gray-300">Service name</label>
<input
value={name}
onChange={(event) => setName(event.target.value)}
placeholder="Example: Haircut, Consultation, Mobile Detail"
className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
/>
</div>

<div>
<label className="text-sm font-medium text-gray-300">Description</label>
<textarea
value={description}
onChange={(event) => setDescription(event.target.value)}
placeholder="Briefly describe what is included."
className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
/>
</div>

<div className="grid gap-4 md:grid-cols-2">
<div>
<label className="text-sm font-medium text-gray-300">Price</label>
<input
value={price}
onChange={(event) => setPrice(event.target.value)}
type="number"
min="0"
step="0.01"
placeholder="25.00"
className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
/>
</div>

<div>
<label className="text-sm font-medium text-gray-300">Duration minutes</label>
<input
value={durationMinutes}
onChange={(event) => setDurationMinutes(event.target.value)}
type="number"
min="5"
step="5"
placeholder="60"
className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
/>
</div>
</div>

{errorMessage && (
<p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
{errorMessage}
</p>
)}

<button
type="submit"
disabled={isSaving}
className="w-full rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60 md:w-fit"
>
{isSaving ? "Saving..." : "Add service"}
</button>
</form>
</div>

<div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
<div className="flex items-center justify-between gap-4">
<div>
<p className="text-sm font-semibold text-emerald-300">Current Services</p>
<h2 className="mt-3 text-2xl font-bold">
{isLoading ? "Loading services..." : `${services.length} service${services.length === 1 ? "" : "s"}`}
</h2>
</div>
</div>

{!isLoading && services.length === 0 && (
<p className="mt-6 text-sm leading-6 text-gray-400">
No services added yet. Add your first service above.
</p>
)}

<div className="mt-6 grid gap-4">
{services.map((service) => (
<div
key={service.id}
className="rounded-3xl border border-white/10 bg-black/20 p-5"
>
<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
<div>
<div className="flex items-center gap-3">
<h3 className="text-lg font-bold text-white">{service.name}</h3>
<span
className={`rounded-full px-3 py-1 text-xs font-semibold ${
service.is_active
? "bg-emerald-400/10 text-emerald-300"
: "bg-gray-500/10 text-gray-400"
}`}
>
{service.is_active ? "Active" : "Inactive"}
</span>
</div>

{service.description && (
<p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
{service.description}
</p>
)}

<div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-300">
<span className="rounded-full bg-white/5 px-3 py-1">
${service.price ?? 0}
</span>
<span className="rounded-full bg-white/5 px-3 py-1">
{service.duration_minutes ?? 60} min
</span>
</div>
</div>

<button
onClick={() => toggleServiceStatus(service)}
className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:bg-white/10"
>
{service.is_active ? "Deactivate" : "Reactivate"}
</button>
</div>
</div>
))}
</div>
</div>
</div>
</DashboardShell>
);
}
