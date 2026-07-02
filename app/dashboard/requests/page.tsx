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
name: string;
price: number | null;
duration_minutes: number | null;
};

type BookingRequest = {
id: string;
business_id: string;
owner_id: string;
customer_id: string | null;
service_id: string | null;
start_time: string;
end_time: string;
status: string | null;
source: string | null;
customer_name: string | null;
customer_phone: string | null;
customer_email: string | null;
notes: string | null;
created_at: string;
};

export default function BookingRequestsPage() {
const supabase = useMemo(() => createClient(), []);

const [businessProfile, setBusinessProfile] =
useState<BusinessProfile | null>(null);
const [services, setServices] = useState<Service[]>([]);
const [requests, setRequests] = useState<BookingRequest[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [isUpdating, setIsUpdating] = useState<string | null>(null);
const [errorMessage, setErrorMessage] = useState("");
const [message, setMessage] = useState("");

async function loadRequests() {
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
.select("id, owner_id, business_name")
.eq("owner_id", user.id)
.single();

if (profileError || !profile) {
setErrorMessage("Business profile not found.");
setIsLoading(false);
return;
}

setBusinessProfile(profile);

const { data: serviceData, error: serviceError } = await supabase
.from("services")
.select("id, name, price, duration_minutes")
.eq("business_id", profile.id);

if (serviceError) {
setErrorMessage(serviceError.message);
setIsLoading(false);
return;
}

const { data: requestData, error: requestError } = await supabase
.from("bookings")
.select(
"id, business_id, owner_id, customer_id, service_id, start_time, end_time, status, source, customer_name, customer_phone, customer_email, notes, created_at"
)
.eq("business_id", profile.id)
.eq("status", "pending")
.order("created_at", { ascending: false });

if (requestError) {
setErrorMessage(requestError.message);
setIsLoading(false);
return;
}

setServices(serviceData || []);
setRequests(requestData || []);
setIsLoading(false);
}

async function updateRequestStatus(
bookingId: string,
newStatus: "confirmed" | "cancelled"
) {
setIsUpdating(bookingId);
setErrorMessage("");
setMessage("");

const { error } = await supabase.rpc("approve_booking_request", {
p_booking_id: bookingId,
p_new_status: newStatus,
});

if (error) {
setErrorMessage(error.message);
setIsUpdating(null);
return;
}

const {
data: { session },
} = await supabase.auth.getSession();

const notificationResponse = await fetch("/api/booking-notifications", {
method: "POST",
headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${session?.access_token}`,
},
body: JSON.stringify({
bookingId,
eventType:
newStatus === "confirmed" ? "booking.approved" : "booking.declined",
}),
});

if (!notificationResponse.ok) {
setMessage(
newStatus === "confirmed"
? "Booking approved, but the email notification was not sent."
: "Booking declined, but the email notification was not sent."
);
} else {
setMessage(
newStatus === "confirmed"
? "Booking request approved and customer notified."
: "Booking request declined and customer notified."
);
}

await loadRequests();
setIsUpdating(null);
}

function getServiceName(serviceId: string | null) {
if (!serviceId) return "Service";
return services.find((service) => service.id === serviceId)?.name || "Service";
}

function formatDateTime(value: string) {
return new Intl.DateTimeFormat("en-US", {
weekday: "short",
month: "short",
day: "numeric",
hour: "numeric",
minute: "2-digit",
}).format(new Date(value));
}

useEffect(() => {
loadRequests();
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

return (
<DashboardShell
title="Booking Requests"
subtitle="Approve or decline appointment requests from your public booking page."
>
<div className="space-y-6">
<div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
<p className="text-sm font-semibold text-emerald-300">
Pending Requests
</p>

<h2 className="mt-3 text-2xl font-bold">
{isLoading
? "Loading requests..."
: `${requests.length} pending request${
requests.length === 1 ? "" : "s"
}`}
</h2>

<p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
Public booking requests come in as pending. Approving a request
confirms the appointment and keeps the customer saved in your client
list.
</p>

{businessProfile && (
<p className="mt-3 text-xs text-gray-500">
Managing requests for {businessProfile.business_name || "your business"}.
</p>
)}

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
</div>

<div className="grid gap-4">
{!isLoading && requests.length === 0 && (
<div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
<h3 className="text-xl font-bold text-white">
No pending requests
</h3>
<p className="mt-3 text-sm leading-6 text-gray-400">
When someone requests a booking from your public page, it will
appear here.
</p>
</div>
)}

{requests.map((request) => (
<div
key={request.id}
className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"
>
<div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
<div>
<div className="flex flex-wrap items-center gap-3">
<h3 className="text-xl font-bold text-white">
{request.customer_name || "Customer"}
</h3>

<span className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-200">
Pending
</span>

{request.customer_id && (
<span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
Customer saved
</span>
)}
</div>

<p className="mt-3 text-sm font-semibold text-gray-200">
{getServiceName(request.service_id)} ·{" "}
{formatDateTime(request.start_time)}
</p>

<div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-300">
{request.customer_phone && (
<span className="rounded-full bg-white/5 px-3 py-1">
{request.customer_phone}
</span>
)}

{request.customer_email && (
<span className="rounded-full bg-white/5 px-3 py-1">
{request.customer_email}
</span>
)}

<span className="rounded-full bg-white/5 px-3 py-1">
Source: {request.source || "booking_page"}
</span>
</div>

{request.notes && (
<p className="mt-4 max-w-2xl text-sm leading-6 text-gray-400">
{request.notes}
</p>
)}
</div>

<div className="flex flex-wrap gap-2">
<button
onClick={() =>
updateRequestStatus(request.id, "confirmed")
}
disabled={isUpdating === request.id}
className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
>
{isUpdating === request.id ? "Updating..." : "Approve"}
</button>

<button
onClick={() =>
updateRequestStatus(request.id, "cancelled")
}
disabled={isUpdating === request.id}
className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-60"
>
Decline
</button>
</div>
</div>
</div>
))}
</div>
</div>
</DashboardShell>
);
}