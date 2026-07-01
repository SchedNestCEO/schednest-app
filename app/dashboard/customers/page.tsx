"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardShell from "../components/DashboardShell";
import { createClient } from "../../lib/supabase/client";

type BusinessProfile = {
id: string;
owner_id: string;
business_name: string | null;
};

type Customer = {
id: string;
business_id: string;
owner_id: string;
full_name: string;
phone: string | null;
email: string | null;
preferred_language: string | null;
source: string | null;
notes: string | null;
};

export default function CustomersPage() {
const supabase = useMemo(() => createClient(), []);

const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
const [customers, setCustomers] = useState<Customer[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [isSaving, setIsSaving] = useState(false);
const [errorMessage, setErrorMessage] = useState("");

const [fullName, setFullName] = useState("");
const [phone, setPhone] = useState("");
const [email, setEmail] = useState("");
const [preferredLanguage, setPreferredLanguage] = useState("en");
const [source, setSource] = useState("manual");
const [notes, setNotes] = useState("");

async function loadCustomers() {
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

const { data: customerData, error: customersError } = await supabase
.from("customers")
.select("id, business_id, owner_id, full_name, phone, email, preferred_language, source, notes")
.eq("business_id", profile.id)
.order("created_at", { ascending: false });

if (customersError) {
setErrorMessage("Unable to load customers.");
setIsLoading(false);
return;
}

setCustomers(customerData || []);
setIsLoading(false);
}

async function handleAddCustomer(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();

if (!businessProfile) {
setErrorMessage("Business profile not loaded yet.");
return;
}

if (!fullName.trim()) {
setErrorMessage("Customer name is required.");
return;
}

setIsSaving(true);
setErrorMessage("");

const { error } = await supabase.from("customers").insert({
business_id: businessProfile.id,
owner_id: businessProfile.owner_id,
name: fullName.trim(),
full_name: fullName.trim(),
phone: phone.trim() || null,
email: email.trim() || null,
preferred_language: preferredLanguage,
source,
notes: notes.trim() || null,
});

if (error) {
setErrorMessage(error.message);
setIsSaving(false);
return;
}

setFullName("");
setPhone("");
setEmail("");
setPreferredLanguage("en");
setSource("manual");
setNotes("");

await loadCustomers();
setIsSaving(false);
}

useEffect(() => {
loadCustomers();
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

return (
<DashboardShell
title="Customers"
subtitle="Keep track of clients, contact info, notes, and preferred language."
>
<div className="space-y-6">
<div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
<p className="text-sm font-semibold text-emerald-300">Client List</p>
<h2 className="mt-3 text-2xl font-bold">Add a customer</h2>
<p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
Add clients manually for now. Later, customers will also be created from booking requests.
</p>

<form onSubmit={handleAddCustomer} className="mt-6 grid gap-4">
<div>
<label className="text-sm font-medium text-gray-300">Full name</label>
<input
value={fullName}
onChange={(event) => setFullName(event.target.value)}
placeholder="Example: Maria Lopez"
className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
/>
</div>

<div className="grid gap-4 md:grid-cols-2">
<div>
<label className="text-sm font-medium text-gray-300">Phone</label>
<input
value={phone}
onChange={(event) => setPhone(event.target.value)}
placeholder="(555) 123-4567"
className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
/>
</div>

<div>
<label className="text-sm font-medium text-gray-300">Email</label>
<input
value={email}
onChange={(event) => setEmail(event.target.value)}
type="email"
placeholder="customer@email.com"
className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
/>
</div>
</div>

<div className="grid gap-4 md:grid-cols-2">
<div>
<label className="text-sm font-medium text-gray-300">Preferred language</label>
<select
value={preferredLanguage}
onChange={(event) => setPreferredLanguage(event.target.value)}
className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
>
<option value="en">English</option>
<option value="es">Spanish</option>
<option value="fr">French</option>
<option value="pt">Portuguese</option>
<option value="tl">Tagalog</option>
</select>
</div>

<div>
<label className="text-sm font-medium text-gray-300">Source</label>
<select
value={source}
onChange={(event) => setSource(event.target.value)}
className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
>
<option value="manual">Manual</option>
<option value="text">Text</option>
<option value="dm">Instagram/DM</option>
<option value="whatsapp">WhatsApp</option>
<option value="booking_page">Booking page</option>
<option value="walk_in">Walk-in</option>
</select>
</div>
</div>

<div>
<label className="text-sm font-medium text-gray-300">Notes</label>
<textarea
value={notes}
onChange={(event) => setNotes(event.target.value)}
placeholder="Example: Prefers Saturday mornings. Usually books every 3 weeks."
className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
/>
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
{isSaving ? "Saving..." : "Add customer"}
</button>
</form>
</div>

<div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
<p className="text-sm font-semibold text-emerald-300">Current Customers</p>
<h2 className="mt-3 text-2xl font-bold">
{isLoading ? "Loading customers..." : `${customers.length} customer${customers.length === 1 ? "" : "s"}`}
</h2>

{!isLoading && customers.length === 0 && (
<p className="mt-6 text-sm leading-6 text-gray-400">
No customers added yet. Add your first customer above.
</p>
)}

<div className="mt-6 grid gap-4">
{customers.map((customer) => (
<div
key={customer.id}
className="rounded-3xl border border-white/10 bg-black/20 p-5"
>
<h3 className="text-lg font-bold text-white">{customer.full_name}</h3>

<div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-300">
{customer.phone && (
<span className="rounded-full bg-white/5 px-3 py-1">{customer.phone}</span>
)}
{customer.email && (
<span className="rounded-full bg-white/5 px-3 py-1">{customer.email}</span>
)}
<span className="rounded-full bg-white/5 px-3 py-1">
Language: {customer.preferred_language || "en"}
</span>
<span className="rounded-full bg-white/5 px-3 py-1">
Source: {customer.source || "manual"}
</span>
</div>

{customer.notes && (
<p className="mt-4 text-sm leading-6 text-gray-400">{customer.notes}</p>
)}
</div>
))}
</div>
</div>
</div>
</DashboardShell>
);
}